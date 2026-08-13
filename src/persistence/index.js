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
      engineVersion,
      reportJson: null,
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
    current.status = "RUNNING";
    current.startedAt = job.startedAt;
  }

  async markJobSucceeded(job) {
    const current = this.jobs.get(job.id);
    if (!current) return;
    current.status = "SUCCEEDED";
    current.completedAt = job.completedAt;
    current.scan = clone(job.scan);
    current.reportJson = clone(job.scan);
  }

  async markJobFailed(job) {
    const current = this.jobs.get(job.id);
    if (!current) return;
    current.status = "FAILED";
    current.completedAt = job.completedAt;
    current.error = clone(job.error);
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
    });
  }

  async listScanJobs(workspaceId, { limit = 50 } = {}) {
    return [...this.jobs.values()]
      .filter((job) => job.workspaceId === workspaceId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, Math.max(1, limit))
      .map((job) => clone({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
      }));
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
          (id, workspace_id, actor_id, type, status, address, network_id, engine_version, created_at, retention_status)
         VALUES ($1, $2, $3, 'contract-scan', 'QUEUED', $4, $5, $6, $7, 'ACTIVE')`,
        [id, input.workspaceId, input.actorId, input.address.toLowerCase(), input.networkId, input.engineVersion, createdAt],
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
          SET status = 'RUNNING', started_at = COALESCE(started_at, $2)
        WHERE id = $1 AND status = 'QUEUED'`,
      [job.id, job.startedAt],
    );
  }

  async markJobSucceeded(job) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO scans
          (job_id, workspace_id, address, network_id, mode, data_status, report_json, report_hash,
           engine_version, created_at, completed_at, retention_status)
         SELECT id, workspace_id, address, network_id, 'LIVE', $2, $3::jsonb, $4, engine_version,
                created_at, $5, 'ACTIVE'
           FROM scan_jobs
          WHERE id = $1
         ON CONFLICT (job_id) DO NOTHING
         RETURNING id`,
        [job.id, job.scan?.dataStatus || "unknown", JSON.stringify(job.scan), crypto.createHash("sha256").update(JSON.stringify(job.scan)).digest("hex"), job.completedAt],
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
            SET status = 'SUCCEEDED', completed_at = $2, report_json = $3::jsonb
          WHERE id = $1`,
        [job.id, job.completedAt, JSON.stringify(job.scan)],
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
          SET status = 'FAILED', completed_at = $2, error_code = $3, error_message = $4
        WHERE id = $1`,
      [job.id, job.completedAt, job.error?.code || "SCAN_FAILED", job.error?.message || "The scan could not be completed."],
    );
  }

  async getScanJob(jobId, workspaceId) {
    const result = await this.pool.query(
      `SELECT id, type, status, created_at, started_at, completed_at, error_code, error_message, report_json
         FROM scan_jobs
        WHERE id = $1 AND workspace_id = $2`,
      [jobId, workspaceId],
    );
    return scanJobFromRow(result.rows[0]);
  }

  async listScanJobs(workspaceId, { limit = 50 } = {}) {
    const result = await this.pool.query(
      `SELECT id, type, status, created_at, started_at, completed_at, error_code, error_message
         FROM scan_jobs
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [workspaceId, Math.max(1, limit)],
    );
    return result.rows.map(scanJobFromRow);
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