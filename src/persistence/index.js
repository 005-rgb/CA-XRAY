const crypto = require("node:crypto");
const { Pool } = require("pg");
const { resolveEffectiveEntitlements } = require("./../platform/entitlements");

const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function monthStart(date) {
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function quotaError({ workspaceId, planId, limit, month, used }) {
  return Object.assign(new Error("MONTHLY_SCAN_QUOTA_EXCEEDED"), {
    code: "MONTHLY_SCAN_QUOTA_EXCEEDED",
    workspaceId,
    planId,
    limit,
    month,
    used,
  });
}

function scanJobFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    error: row.error_code
      ? { code: row.error_code, message: row.error_message || "The scan could not be completed." }
      : null,
    scan: row.report_json || null,
    address: row.address || null,
    networkId: row.network_id || null,
    engineVersion: row.engine_version || null,
    evidenceSchemaVersion: row.evidence_schema_version || null,
    reportVersion: row.report_version || null,
    reportHash: row.report_hash || null,
    attempts: row.attempts ?? 0,
    maxAttempts: row.max_attempts ?? null,
    cancellationReason: row.cancellation_reason || null,
    queuePayload: row.queue_payload || null,
  };
}

function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    return parsed && typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizePageOptions({ limit = 50, cursor = null, status = null, networkId = null, address = null } = {}) {
  const normalizedLimit = Number.isInteger(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 50;
  const allowedStatuses = new Set(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]);
  return {
    limit: normalizedLimit,
    cursor: decodeCursor(cursor),
    status: allowedStatuses.has(String(status || "").toUpperCase()) ? String(status).toUpperCase() : null,
    networkId: typeof networkId === "string" && networkId.length <= 32 ? networkId : null,
    address: typeof address === "string" && address.length <= 42 ? address.toLowerCase() : null,
  };
}

function cursorAfter(job, cursor) {
  if (!cursor) return true;
  const created = String(job.createdAt).localeCompare(String(cursor.createdAt));
  return created < 0 || (created === 0 && String(job.id).localeCompare(String(cursor.id)) < 0);
}

function pageResult(items, limit) {
  const hasMore = items.length > limit;
  const visible = hasMore ? items.slice(0, limit) : items;
  const last = visible[visible.length - 1];
  return {
    items: visible,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    hasMore,
  };
}

class MemoryPersistence {
  constructor({
    clock = () => new Date(),
    idempotencyTtlMs = DEFAULT_IDEMPOTENCY_TTL_MS,
  } = {}) {
    this.clock = clock;
    this.idempotencyTtlMs = idempotencyTtlMs;
    this.idempotency = new Map();
    this.jobs = new Map();
    this.usage = new Map();
    this.audit = [];
    this.outbox = new Map();
    this.webhooks = new Map();
    this.entitlements = new Map();
  }

  async init() {}

  #idempotencyId(workspaceId, key) {
    return `${workspaceId}:${key}`;
  }

  async getIdempotency(workspaceId, key) {
    const id = this.#idempotencyId(workspaceId, key);
    const entry = this.idempotency.get(id);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock().getTime()) {
      this.idempotency.delete(id);
      return null;
    }
    return clone(entry.response);
  }

  async createScanRequest({
    workspaceId,
    actorId,
    planId,
    limit,
    idempotencyKey,
    address,
    networkId,
      correlationId = null,
    engineVersion = null,
  }) {
    const idempotencyId = this.#idempotencyId(workspaceId, idempotencyKey);
    const existingEntry = this.idempotency.get(idempotencyId);
    if (existingEntry && existingEntry.expiresAt <= this.clock().getTime()) {
      this.idempotency.delete(idempotencyId);
    }
    const existing = this.idempotency.get(idempotencyId)?.response || null;
    if (existing) return { duplicate: true, response: existing };
    const now = this.clock();
    const month = monthStart(now);
    const usageKey = `${workspaceId}:${month}`;
    const used = this.usage.get(usageKey) || 0;
    if (limit !== null && limit !== undefined && used >= limit) {
      throw quotaError({ workspaceId, planId, limit, month, used });
    }
    const id = `scan_${crypto.randomUUID()}`;
    const job = {
      id,
      type: "contract-scan",
      status: "QUEUED",
      createdAt: now.toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      scan: null,
    };
    const response = {
      job: {
        id,
        status: job.status,
        statusUrl: `/api/scan/${id}`,
        createdAt: job.createdAt,
      },
    };
    this.jobs.set(id, {
      ...job,
      workspaceId,
      actorId,
      address,
      networkId,
      correlationId,
      engineVersion,
      reportJson: null,
      reportHash: null,
      reportVersion: null,
      evidenceSchemaVersion: null,
      attempts: 0,
      maxAttempts: 2,
      cancellationReason: null,
      expiresAt: new Date(now.getTime() + this.idempotencyTtlMs).toISOString(),
    });
    this.usage.set(usageKey, used + 1);
    this.idempotency.set(this.#idempotencyId(workspaceId, idempotencyKey), {
      response,
      expiresAt: now.getTime() + this.idempotencyTtlMs,
    });
    this.audit.push({
      id: `audit_${crypto.randomUUID()}`,
      action: "SCAN_CREATED",
      actorId,
      workspaceId,
      metadata: { networkId, address: address.toLowerCase(), jobId: id },
      createdAt: now.toISOString(),
    });
    const outboxId = `outbox_${crypto.randomUUID()}`;
    this.outbox.set(outboxId, {
      id: outboxId,
      type: "SCAN_CREATED",
      aggregateId: id,
      workspaceId,
      payload: { jobId: id, networkId },
      status: "PENDING",
      createdAt: now.toISOString(),
      processedAt: null,
    });
    return { duplicate: false, response, job: { ...job, workspaceId } };
  }

  async markJobRunning(job) {
    const current = this.jobs.get(job.id);
    if (!current) return;
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(current.status)) return;
    current.status = "RUNNING";
    current.startedAt = job.startedAt;
    current.attempts = job.attempts || current.attempts + 1;
    current.maxAttempts = job.maxAttempts || current.maxAttempts;
  }

  async markJobSucceeded(job) {
    const current = this.jobs.get(job.id);
    if (!current) return;
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(current.status)) return;
    const serialized = JSON.stringify(job.scan);
    current.status = "SUCCEEDED";
    current.completedAt = job.completedAt;
    current.scan = clone(job.scan);
    current.reportJson = clone(job.scan);
    current.reportHash = crypto.createHash("sha256").update(serialized).digest("hex");
    current.reportVersion = 1;
    current.engineVersion = job.scan?.engineVersion || current.engineVersion;
    current.evidenceSchemaVersion = job.scan?.evidenceSchemaVersion || "1.0.0";
    current.attempts = job.attempts || current.attempts;
    current.maxAttempts = job.maxAttempts || current.maxAttempts;
  }

  async markJobFailed(job) {
    const current = this.jobs.get(job.id);
    if (!current) return;
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(current.status)) return;
    current.status = "FAILED";
    current.completedAt = job.completedAt;
    current.error = clone(job.error);
    current.attempts = job.attempts || current.attempts;
    current.maxAttempts = job.maxAttempts || current.maxAttempts;
  }

  async markJobCancelled(job) {
    const current = this.jobs.get(job.id);
    if (!current || current.status === "SUCCEEDED") return;
    current.status = "CANCELLED";
    current.completedAt = job.completedAt || this.clock().toISOString();
    current.error = clone(job.error) || {
      code: "SCAN_CANCELLED",
      message: "The scan was cancelled.",
    };
    current.cancellationReason = current.error.message;
  }

  async getScanJob(jobId, workspaceId) {
    const job = this.jobs.get(jobId);
    if (!job || job.workspaceId !== workspaceId) return null;
    return clone({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      scan: job.scan,
      address: job.address,
      networkId: job.networkId,
      engineVersion: job.engineVersion,
      evidenceSchemaVersion: job.evidenceSchemaVersion,
      reportVersion: job.reportVersion,
      reportHash: job.reportHash,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      cancellationReason: job.cancellationReason,
    });
  }

  async listScanJobs(workspaceId, { limit = 50 } = {}) {
    const page = await this.listScanJobsPage(workspaceId, { limit });
    return page.items;
  }

  async listScanJobsPage(workspaceId, options = {}) {
    const pageOptions = normalizePageOptions(options);
    const jobs = [...this.jobs.values()]
      .filter((job) => job.workspaceId === workspaceId)
      .filter((job) => !pageOptions.status || job.status === pageOptions.status)
      .filter((job) => !pageOptions.networkId || job.networkId === pageOptions.networkId)
      .filter((job) => !pageOptions.address || job.address.toLowerCase() === pageOptions.address)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .filter((job) => cursorAfter(job, pageOptions.cursor))
      .map((job) => clone({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        address: job.address,
        networkId: job.networkId,
        engineVersion: job.engineVersion,
        evidenceSchemaVersion: job.evidenceSchemaVersion,
        reportVersion: job.reportVersion,
        reportHash: job.reportHash,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        cancellationReason: job.cancellationReason,
      }));
    return pageResult(jobs, pageOptions.limit);
  }

  async getPlatformScanMetrics() {
    const now = this.clock().getTime();
    const since = now - 24 * 60 * 60 * 1000;
    const counts = Object.fromEntries(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"].map((status) => [status, 0]));
    let completed24h = 0;
    let averageDurationMs = null;
    for (const job of this.jobs.values()) {
      counts[job.status] = (counts[job.status] || 0) + 1;
      if (job.completedAt && Date.parse(job.completedAt) >= since) completed24h += 1;
    }
    const durations = [...this.jobs.values()]
      .filter((job) => job.startedAt && job.completedAt)
      .map((job) => Date.parse(job.completedAt) - Date.parse(job.startedAt))
      .filter((duration) => Number.isFinite(duration) && duration >= 0);
    if (durations.length) averageDurationMs = Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
    const terminal = counts.SUCCEEDED + counts.FAILED + counts.CANCELLED;
    return {
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      ...counts,
      completed24h,
      averageDurationMs,
      successRate: terminal ? Number((counts.SUCCEEDED / terminal).toFixed(4)) : null,
      measuredAt: this.clock().toISOString(),
    };
  }

  async recordWebhookEvent({ provider, eventId, payload = {}, receivedAt = this.clock() }) {
    const key = `${provider}:${eventId}`;
    if (this.webhooks.has(key)) return { duplicate: true, event: clone(this.webhooks.get(key)) };
    const event = {
      id: `webhook_${crypto.randomUUID()}`,
      provider,
      eventId,
      payload: clone(payload),
      status: "RECEIVED",
      receivedAt: new Date(receivedAt).toISOString(),
      processedAt: null,
    };
    this.webhooks.set(key, event);
    return { duplicate: false, event: clone(event) };
  }

  async listEntitlements(workspaceId, plan) {
    const grants = [...this.entitlements.values()]
      .filter((item) => item.workspaceId === workspaceId)
      .map(({ workspaceId: ignored, ...item }) => item);
    return resolveEffectiveEntitlements({ plan, grants, now: this.clock() });
  }

  async loadIntelligenceState() {
    return null;
  }

  async saveIntelligenceState() {}

  async setEntitlement({ workspaceId, capability, status = "active", source = "manual", effectiveAt = this.clock(), expiresAt = null, reason = "" }) {
    const id = `${workspaceId}:${capability}`;
    const record = {
      workspaceId, capability, status, source,
      effectiveAt: new Date(effectiveAt).toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      reason: String(reason || "").slice(0, 500) || "Explicit entitlement change",
    };
    this.entitlements.set(id, record);
    return clone(record);
  }

  async listOutbox({ status = "PENDING", limit = 100 } = {}) {
    return [...this.outbox.values()]
      .filter((event) => event.status === status)
      .slice(0, Math.max(1, limit))
      .map(clone);
  }

  async markOutboxProcessed(eventId, processedAt = this.clock()) {
    const event = this.outbox.get(eventId);
    if (!event || event.status !== "PENDING") return false;
    event.status = "PROCESSED";
    event.processedAt = new Date(processedAt).toISOString();
    return true;
  }

  async close() {}
}

class PostgresPersistence {
  constructor({ connectionString = process.env.DATABASE_URL, pool, clock = () => new Date() } = {}) {
    if (!pool && !connectionString) {
      throw new Error("DATABASE_URL is required for PostgreSQL persistence.");
    }
    this.pool = pool || new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 20),
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
    });
    this.clock = clock;
  }

  async init() {
    await this.pool.query("SELECT 1");
  }

  async getIdempotency(workspaceId, key) {
    const result = await this.pool.query(
      `SELECT response_json
         FROM idempotency_keys
        WHERE workspace_id = $1
          AND key = $2
          AND expires_at > NOW()`,
      [workspaceId, key],
    );
    return result.rows[0] ? clone(result.rows[0].response_json) : null;
  }

  async createScanRequest(input) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM idempotency_keys WHERE workspace_id = $1 AND key = $2 AND expires_at <= NOW()",
        [input.workspaceId, input.idempotencyKey],
      );
      const inserted = await client.query(
        `INSERT INTO idempotency_keys
          (workspace_id, key, operation, status, response_json, expires_at)
         VALUES ($1, $2, 'SCAN_CREATE', 'PENDING', NULL, NOW() + INTERVAL '24 hours')
         ON CONFLICT (workspace_id, key) DO NOTHING
         RETURNING id`,
        [input.workspaceId, input.idempotencyKey],
      );
      if (!inserted.rowCount) {
        const existing = await client.query(
          `SELECT response_json, status
             FROM idempotency_keys
            WHERE workspace_id = $1 AND key = $2`,
          [input.workspaceId, input.idempotencyKey],
        );
        await client.query("COMMIT");
        if (!existing.rows[0]?.response_json) {
          throw Object.assign(new Error("IDEMPOTENCY_REQUEST_IN_PROGRESS"), {
            code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
          });
        }
        return { duplicate: true, response: clone(existing.rows[0].response_json) };
      }

      const periodStart = monthStart(this.clock());
      await client.query(
        `INSERT INTO usage_counters (workspace_id, period_start, used_count, updated_at)
         VALUES ($1, $2::date, 0, NOW())
         ON CONFLICT (workspace_id, period_start) DO NOTHING`,
        [input.workspaceId, periodStart],
      );
      const usage = await client.query(
        `UPDATE usage_counters
            SET used_count = used_count + 1, plan_id = $3, limit_count = $4, updated_at = NOW()
          WHERE workspace_id = $1
            AND period_start = $2::date
            AND ($4::integer IS NULL OR used_count < $4::integer)
        RETURNING used_count`,
        [input.workspaceId, periodStart, input.planId, input.limit],
      );
      if (!usage.rowCount) {
        await client.query("ROLLBACK");
        throw quotaError({
          workspaceId: input.workspaceId,
          planId: input.planId,
          limit: input.limit,
          month: periodStart.slice(0, 7),
          used: input.limit,
        });
      }

      const id = `scan_${crypto.randomUUID()}`;
      const createdAt = this.clock().toISOString();
      const response = {
        job: {
          id,
          status: "QUEUED",
          statusUrl: `/api/scan/${id}`,
          createdAt,
        },
      };
      await client.query(
        `INSERT INTO scan_jobs
         (id, workspace_id, actor_id, type, status, address, network_id, engine_version, correlation_id, created_at, retention_status)
          VALUES ($1, $2, $3, 'contract-scan', 'QUEUED', $4, $5, $6, $7, $8, 'ACTIVE')`,
        [id, input.workspaceId, input.actorId, input.address.toLowerCase(), input.networkId, input.engineVersion, input.correlationId || null, createdAt],
      );
      await client.query(
        `UPDATE idempotency_keys
            SET status = 'COMPLETED', response_json = $3::jsonb
          WHERE workspace_id = $1 AND key = $2`,
        [input.workspaceId, input.idempotencyKey, JSON.stringify(response)],
      );
      await client.query(
        `INSERT INTO audit_logs
          (action, actor_id, workspace_id, metadata, created_at)
         VALUES ('SCAN_CREATED', $1, $2, $3::jsonb, $4)`,
        [input.actorId, input.workspaceId, JSON.stringify({
          networkId: input.networkId,
          address: input.address.toLowerCase(),
          jobId: id,
        }), createdAt],
      );
      await client.query(
        `INSERT INTO outbox_events
          (event_type, aggregate_type, aggregate_id, workspace_id, payload, status, created_at)
         VALUES ('SCAN_CREATED', 'scan_job', $1, $2, $3::jsonb, 'PENDING', $4)`,
        [id, input.workspaceId, JSON.stringify({ jobId: id, networkId: input.networkId }), createdAt],
      );
      await client.query("COMMIT");
      return {
        duplicate: false,
        response,
        job: { ...response.job, workspaceId: input.workspaceId },
      };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async markJobRunning(job) {
    await this.pool.query(
      `UPDATE scan_jobs
          SET status = 'RUNNING',
              started_at = COALESCE(started_at, $2),
              attempts = GREATEST(attempts, $3),
              max_attempts = GREATEST(max_attempts, $4)
        WHERE id = $1 AND status = 'QUEUED'`,
      [job.id, job.startedAt, job.attempts || 1, job.maxAttempts || 1],
    );
  }

  async markJobSucceeded(job) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO scans
          (job_id, workspace_id, address, network_id, mode, data_status, report_json, report_hash,
           engine_version, report_version, evidence_schema_version, created_at, completed_at, retention_status)
         SELECT id, workspace_id, address, network_id, 'LIVE', $2, $3::jsonb, $4, engine_version,
                $6, $7,
                created_at, $5, 'ACTIVE'
           FROM scan_jobs
           WHERE id = $1 AND status IN ('QUEUED', 'RUNNING')
         ON CONFLICT (job_id) DO NOTHING
         RETURNING id`,
        [job.id, job.scan?.dataStatus || "unknown", JSON.stringify(job.scan), crypto.createHash("sha256").update(JSON.stringify(job.scan)).digest("hex"), job.completedAt, 1, job.scan?.evidenceSchemaVersion || "1.0.0"],
      );
      if (inserted.rowCount) {
        const scanId = inserted.rows[0].id;
        for (const finding of job.scan?.findings || []) {
          await client.query(
            `INSERT INTO findings
              (scan_id, workspace_id, title, category, severity, status, finding_json, created_at, retention_status)
             SELECT $1, workspace_id, $2, $3, $4, $5, $6::jsonb, $7, 'ACTIVE'
               FROM scans WHERE id = $1`,
            [scanId, finding.title || finding.finding || "Finding", finding.category || "unknown", finding.severity || "unknown", finding.status || "UNKNOWN", JSON.stringify(finding), job.completedAt],
          );
        }
        await client.query(
          `INSERT INTO evidence
            (scan_id, workspace_id, evidence_json, evidence_hash, created_at, retention_status)
           SELECT $1, workspace_id, $2::jsonb, $3, $4, 'ACTIVE'
             FROM scans WHERE id = $1`,
          [scanId, JSON.stringify(job.scan?.evidence || []), crypto.createHash("sha256").update(JSON.stringify(job.scan?.evidence || [])).digest("hex"), job.completedAt],
        );
      }
      await client.query(
        `UPDATE scan_jobs
            SET status = 'SUCCEEDED', completed_at = $2, report_json = $3::jsonb,
                report_hash = $4, report_version = 1,
                evidence_schema_version = $5, attempts = GREATEST(attempts, $6)
          WHERE id = $1 AND status IN ('QUEUED', 'RUNNING')`,
        [job.id, job.completedAt, JSON.stringify(job.scan),
          crypto.createHash("sha256").update(JSON.stringify(job.scan)).digest("hex"),
          job.scan?.evidenceSchemaVersion || "1.0.0", job.attempts || 1],
      );
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async markJobFailed(job) {
    await this.pool.query(
      `UPDATE scan_jobs
          SET status = 'FAILED', completed_at = $2, error_code = $3, error_message = $4,
              attempts = GREATEST(attempts, $5), max_attempts = GREATEST(max_attempts, $6)
        WHERE id = $1 AND status IN ('QUEUED', 'RUNNING')`,
      [job.id, job.completedAt, job.error?.code || "SCAN_FAILED", job.error?.message || "The scan could not be completed.",
        job.attempts || 1, job.maxAttempts || 1],
    );
  }

  async markJobCancelled(job) {
    await this.pool.query(
      `UPDATE scan_jobs
          SET status = 'CANCELLED', completed_at = COALESCE($2, NOW()),
              error_code = 'SCAN_CANCELLED', error_message = $3,
              cancellation_reason = $3
        WHERE id = $1 AND status IN ('QUEUED', 'RUNNING')`,
      [job.id, job.completedAt || null, job.error?.message || "The scan was cancelled."],
    );
  }

  async getScanJob(jobId, workspaceId) {
    const result = await this.pool.query(
      `SELECT id, type, status, created_at, started_at, completed_at, error_code, error_message, report_json,
              address, network_id, engine_version, evidence_schema_version, report_version,
              report_hash, attempts, max_attempts, cancellation_reason, queue_payload
         FROM scan_jobs
        WHERE id = $1 AND workspace_id = $2`,
      [jobId, workspaceId],
    );
    return scanJobFromRow(result.rows[0]);
  }

  async listScanJobs(workspaceId, { limit = 50 } = {}) {
    const page = await this.listScanJobsPage(workspaceId, { limit });
    return page.items;
  }

  async listScanJobsPage(workspaceId, options = {}) {
    const pageOptions = normalizePageOptions(options);
    const values = [workspaceId];
    const conditions = ["workspace_id = $1"];
    if (pageOptions.status) {
      values.push(pageOptions.status);
      conditions.push(`status = $${values.length}`);
    }
    if (pageOptions.networkId) {
      values.push(pageOptions.networkId);
      conditions.push(`network_id = $${values.length}`);
    }
    if (pageOptions.address) {
      values.push(pageOptions.address);
      conditions.push(`lower(address) = $${values.length}`);
    }
    if (pageOptions.cursor) {
      values.push(pageOptions.cursor.createdAt, pageOptions.cursor.createdAt, pageOptions.cursor.id);
      const createdAtParam = values.length - 2;
      const cursorIdParam = values.length;
      conditions.push(`(created_at < $${createdAtParam} OR (created_at = $${createdAtParam + 1} AND id < $${cursorIdParam}))`);
    }
    values.push(pageOptions.limit + 1);
    const result = await this.pool.query(
      `SELECT id, type, status, created_at, started_at, completed_at, error_code, error_message,
              address, network_id, engine_version, evidence_schema_version, report_version,
              report_hash, attempts, max_attempts, cancellation_reason, queue_payload
         FROM scan_jobs
        WHERE ${conditions.join(" AND ")}
        ORDER BY created_at DESC, id DESC
        LIMIT $${values.length}`,
      values,
    );
    return pageResult(result.rows.map(scanJobFromRow), pageOptions.limit);
  }

  async getPlatformScanMetrics() {
    const result = await this.pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'QUEUED')::int AS queued,
         COUNT(*) FILTER (WHERE status = 'RUNNING')::int AS running,
         COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::int AS succeeded,
         COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
         COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
         COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '24 hours')::int AS completed_24h,
         ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
           FILTER (WHERE started_at IS NOT NULL AND completed_at IS NOT NULL))::int AS average_duration_ms
       FROM scan_jobs`,
    );
    const row = result.rows[0] || {};
    const terminal = Number(row.succeeded || 0) + Number(row.failed || 0) + Number(row.cancelled || 0);
    return {
      total: Number(row.total || 0),
      queued: Number(row.queued || 0),
      running: Number(row.running || 0),
      succeeded: Number(row.succeeded || 0),
      failed: Number(row.failed || 0),
      cancelled: Number(row.cancelled || 0),
      completed24h: Number(row.completed_24h || 0),
      averageDurationMs: row.average_duration_ms === null ? null : Number(row.average_duration_ms),
      successRate: terminal ? Number((Number(row.succeeded || 0) / terminal).toFixed(4)) : null,
      measuredAt: this.clock().toISOString(),
    };
  }

  async recordWebhookEvent({ provider, eventId, payload = {}, receivedAt = this.clock() }) {
    const id = `webhook_${crypto.randomUUID()}`;
    const result = await this.pool.query(
      `INSERT INTO webhook_events
        (id, provider, event_id, payload, status, received_at)
       VALUES ($1, $2, $3, $4::jsonb, 'RECEIVED', $5)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id, provider, event_id, payload, status, received_at, processed_at`,
      [id, provider, eventId, JSON.stringify(payload), new Date(receivedAt).toISOString()],
    );
    if (!result.rowCount) {
      const existing = await this.pool.query(
        `SELECT id, provider, event_id, payload, status, received_at, processed_at
           FROM webhook_events WHERE provider = $1 AND event_id = $2`,
        [provider, eventId],
      );
      return { duplicate: true, event: existing.rows[0] || null };
    }
    return { duplicate: false, event: result.rows[0] };
  }

  async listEntitlements(workspaceId, plan) {
    const result = await this.pool.query(
      `SELECT capability, status, source, effective_at, expires_at, audit_reference
         FROM entitlements
        WHERE workspace_id = $1
        ORDER BY capability, effective_at DESC`,
      [workspaceId],
    );
    return resolveEffectiveEntitlements({
      plan,
      grants: result.rows.map((row) => ({
        capability: row.capability,
        status: row.status,
        source: row.source,
        effectiveAt: row.effective_at,
        expiresAt: row.expires_at,
        auditReference: row.audit_reference,
      })),
      now: this.clock(),
    });
  }

  async loadIntelligenceState() {
    const result = await this.pool.query(
      "SELECT state_json FROM intelligence_state WHERE id = 'global'",
    );
    return result.rows[0]?.state_json || null;
  }

  async saveIntelligenceState(state) {
    await this.pool.query(
      `INSERT INTO intelligence_state (id, state_json, updated_at)
       VALUES ('global', $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
       SET state_json = EXCLUDED.state_json, updated_at = EXCLUDED.updated_at`,
      [JSON.stringify(state)],
    );
  }

  async setEntitlement({ workspaceId, capability, status = "active", source = "manual", effectiveAt = this.clock(), expiresAt = null, reason = "" }) {
    const id = `entitlement_${crypto.randomUUID()}`;
    const result = await this.pool.query(
      `INSERT INTO entitlements
        (id, workspace_id, capability, status, source, effective_at, expires_at, audit_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, workspace_id, capability, status, source, effective_at, expires_at, audit_reference`,
      [id, workspaceId, capability, status, source, new Date(effectiveAt).toISOString(),
        expiresAt ? new Date(expiresAt).toISOString() : null, String(reason || "").slice(0, 500) || "Explicit entitlement change"],
    );
    const row = result.rows[0];
    return {
      id: row.id, workspaceId: row.workspace_id, capability: row.capability, status: row.status,
      source: row.source, effectiveAt: row.effective_at, expiresAt: row.expires_at, reason: row.audit_reference,
    };
  }

  async listOutbox({ status = "PENDING", limit = 100 } = {}) {
    const result = await this.pool.query(
      `SELECT id, event_type AS type, aggregate_id AS "aggregateId", workspace_id AS "workspaceId",
              payload, status, created_at AS "createdAt", processed_at AS "processedAt"
         FROM outbox_events WHERE status = $1 ORDER BY created_at LIMIT $2`,
      [status, Math.max(1, limit)],
    );
    return result.rows;
  }

  async markOutboxProcessed(eventId, processedAt = this.clock()) {
    const result = await this.pool.query(
      `UPDATE outbox_events SET status = 'PROCESSED', processed_at = $2
        WHERE id = $1 AND status = 'PENDING'`,
      [eventId, new Date(processedAt).toISOString()],
    );
    return result.rowCount === 1;
  }

  async close() {
    await this.pool.end();
  }
}

function createPersistence({ runtimeConfig, env = process.env } = {}) {
  const driver = runtimeConfig?.dataStore?.driver || env.DATA_STORE_DRIVER || "memory";
  if (driver === "memory") return new MemoryPersistence();
  if (driver === "postgresql" || driver === "postgres") {
    return new PostgresPersistence({ connectionString: env.DATABASE_URL || null });
  }
  throw new Error(`Persistence driver "${driver}" is not installed.`);
}

module.exports = {
  DEFAULT_IDEMPOTENCY_TTL_MS,
  MemoryPersistence,
  PostgresPersistence,
  createPersistence,
  monthStart,
};