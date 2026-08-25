const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");

const JOB_STATUS = Object.freeze({
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

function snapshot(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    scan: job.scan,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    cancelRequested: Boolean(job.cancelRequested),
  };
}

class InMemoryScanJobQueue {
  constructor({
    processor,
    concurrency = 8,
    maxQueueDepth = 10_000,
    maxAttempts = 2,
    timeoutMs = 30_000,
    clock = () => new Date(),
    onStatusChange = null,
  }) {
    if (typeof processor !== "function") throw new TypeError("A scan job processor is required.");
    this.processor = processor;
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.maxQueueDepth = Math.max(1, Number(maxQueueDepth) || 1);
    this.maxAttempts = Math.max(1, Number(maxAttempts) || 1);
    this.timeoutMs = Math.max(1_000, Number(timeoutMs) || 30_000);
    this.clock = clock;
    this.onStatusChange = typeof onStatusChange === "function" ? onStatusChange : null;
    this.jobs = new Map();
    this.pending = [];
    this.running = 0;
  }

  enqueue(payload) {
    if (this.pending.length + this.running >= this.maxQueueDepth) {
      const error = new Error("SCAN_QUEUE_FULL");
      error.code = "SCAN_QUEUE_FULL";
      throw error;
    }
    const now = this.clock().toISOString();
    const job = {
      id: payload && payload.jobId ? payload.jobId : `scan_${randomUUID()}`,
      type: "contract-scan",
      payload,
      workspaceId: payload && payload.workspaceId ? payload.workspaceId : null,
      status: JOB_STATUS.QUEUED,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      error: null,
      scan: null,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      cancelRequested: false,
      controller: null,
    };
    this.jobs.set(job.id, job);
    this.pending.push(job.id);
    this.#drain();
    return snapshot(job);
  }

  get(jobId) {
    const job = this.jobs.get(jobId);
    return job ? snapshot(job) : null;
  }

  getForWorkspace(jobId, workspaceId) {
    const job = this.jobs.get(jobId);
    if (!job || job.workspaceId !== workspaceId) return null;
    return snapshot(job);
  }

  activeForWorkspace(workspaceId) {
    return [...this.jobs.values()].filter(
      (job) => job.workspaceId === workspaceId && ["QUEUED", "RUNNING"].includes(job.status),
    ).length;
  }

  metrics() {
    const counts = Object.fromEntries(Object.values(JOB_STATUS).map((status) => [status, 0]));
    for (const job of this.jobs.values()) counts[job.status] = (counts[job.status] || 0) + 1;
    return {
      ...counts,
      pending: this.pending.length,
      running: this.running,
      depth: this.pending.length + this.running,
      concurrency: this.concurrency,
      maxQueueDepth: this.maxQueueDepth,
    };
  }

  cancel(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if ([JOB_STATUS.SUCCEEDED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED].includes(job.status)) {
      return snapshot(job);
    }
    job.cancelRequested = true;
    if (job.status === JOB_STATUS.QUEUED) {
      job.status = JOB_STATUS.CANCELLED;
      job.completedAt = this.clock().toISOString();
      job.error = { code: "SCAN_CANCELLED", message: "The scan was cancelled before processing started." };
      this.pending = this.pending.filter((pendingId) => pendingId !== job.id);
      this.#notify(job);
    } else if (job.controller) {
      job.controller.abort();
    }
    return snapshot(job);
  }

  #drain() {
    while (this.running < this.concurrency && this.pending.length) {
      const jobId = this.pending.shift();
      const job = this.jobs.get(jobId);
      if (!job) continue;
      this.running += 1;
      job.status = JOB_STATUS.RUNNING;
      job.startedAt = this.clock().toISOString();
      job.attempts += 1;
      job.controller = new AbortController();
      this.#notify(job);
      const timeout = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          job.controller?.abort();
          reject(Object.assign(new Error("SCAN_TIMEOUT"), { code: "SCAN_TIMEOUT" }));
        }, this.timeoutMs);
        timer.unref?.();
      });
      Promise.race([
        Promise.resolve().then(() => this.processor(job.payload, {
          signal: job.controller.signal,
          attempt: job.attempts,
          jobId: job.id,
        })),
        timeout,
      ])
        .then((scan) => {
          if (job.cancelRequested || job.status === JOB_STATUS.CANCELLED) return;
          job.status = JOB_STATUS.SUCCEEDED;
          job.scan = scan;
          job.error = null;
        })
        .catch((error) => {
          if (job.cancelRequested || job.status === JOB_STATUS.CANCELLED) return;
          if (job.attempts < job.maxAttempts && error.code !== "SCAN_CANCELLED") {
            job.status = JOB_STATUS.QUEUED;
            job.error = {
              code: error.code || "SCAN_RETRY",
              message: error.message || "The scan attempt failed and will be retried.",
            };
            this.pending.push(job.id);
            return;
          }
          job.status = JOB_STATUS.FAILED;
          job.error = {
            code: error.code || "SCAN_FAILED",
            message: error.message || "The scan could not be completed.",
          };
        })
        .finally(() => {
          if (job.status !== JOB_STATUS.QUEUED) {
            if (job.cancelRequested && job.status === JOB_STATUS.RUNNING) {
              job.status = JOB_STATUS.CANCELLED;
              job.error = { code: "SCAN_CANCELLED", message: "The scan was cancelled." };
            }
            job.completedAt = job.completedAt || this.clock().toISOString();
            this.#notify(job);
          } else {
            this.#notify(job);
          }
          job.controller = null;
          this.running -= 1;
          this.#drain();
        });
    }
  }

  #notify(job) {
    if (!this.onStatusChange) return;
    Promise.resolve(this.onStatusChange(snapshot(job))).catch((error) => {
      console.error(`Scan persistence update failed for ${job.id}: ${error.message}`);
    });
  }
}

class PostgresScanJobQueue {
  constructor({
    processor,
    connectionString = process.env.DATABASE_URL,
    pool,
    concurrency = 64,
    maxQueueDepth = 10_000,
    maxAttempts = 2,
    timeoutMs = 30_000,
    leaseMs = 60_000,
    pollMs = 500,
    clock = () => new Date(),
    onStatusChange = null,
  } = {}) {
    if (typeof processor !== "function") throw new TypeError("A scan job processor is required.");
    if (!pool && !connectionString) throw new Error("DATABASE_URL is required for the PostgreSQL queue.");
    this.pool = pool || new Pool({ connectionString, max: Number(process.env.PG_QUEUE_POOL_MAX || 10), idleTimeoutMillis: 30_000 });
    this.processor = processor;
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.maxQueueDepth = Math.max(1, Number(maxQueueDepth) || 1);
    this.maxAttempts = Math.max(1, Number(maxAttempts) || 1);
    this.timeoutMs = Math.max(1_000, Number(timeoutMs) || 30_000);
    this.leaseMs = Math.max(this.timeoutMs + 5_000, Number(leaseMs) || 60_000);
    this.pollMs = Math.max(100, Number(pollMs) || 500);
    this.clock = clock;
    this.onStatusChange = typeof onStatusChange === "function" ? onStatusChange : null;
    this.owner = `worker_${randomUUID()}`;
    this.active = new Map();
    this.counts = Object.fromEntries(Object.values(JOB_STATUS).map((status) => [status, 0]));
    this.closed = false;
    this.pollTimer = setInterval(() => this.#drain().catch((error) => console.error(`Queue poll failed: ${error.message}`)), this.pollMs);
    this.pollTimer.unref?.();
  }

  async init() {
    await this.pool.query("SELECT 1");
    await this.#drain();
  }

  async enqueue(payload) {
    const jobId = payload?.jobId || `scan_${randomUUID()}`;
    const result = await this.pool.query(
      `UPDATE scan_jobs
          SET queue_payload = $2::jsonb, status = CASE WHEN status = 'FAILED' THEN 'QUEUED' ELSE status END,
              error_code = NULL, error_message = NULL, last_error = NULL
        WHERE id = $1 AND status IN ('QUEUED', 'FAILED')
        RETURNING id, type, status, created_at, attempts, max_attempts`,
      [jobId, JSON.stringify(payload || {})],
    );
    if (!result.rowCount) {
      throw Object.assign(new Error("SCAN_JOB_NOT_FOUND_OR_NOT_QUEUABLE"), { code: "SCAN_JOB_NOT_FOUND_OR_NOT_QUEUABLE" });
    }
    await this.#drain();
    return this.#rowSnapshot(result.rows[0]);
  }

  async get(jobId) {
    const result = await this.pool.query(
      `SELECT id, type, status, created_at, started_at, completed_at, error_code, error_message,
              attempts, max_attempts, queue_payload, lease_owner, lease_until
         FROM scan_jobs WHERE id = $1`,
      [jobId],
    );
    return result.rows[0] ? this.#rowSnapshot(result.rows[0]) : null;
  }

  async getForWorkspace(jobId, workspaceId) {
    const result = await this.pool.query(
      `SELECT id, type, status, created_at, started_at, completed_at, error_code, error_message,
              attempts, max_attempts, queue_payload, lease_owner, lease_until
         FROM scan_jobs WHERE id = $1 AND workspace_id = $2`,
      [jobId, workspaceId],
    );
    return result.rows[0] ? this.#rowSnapshot(result.rows[0]) : null;
  }

  activeForWorkspace(workspaceId) {
    return [...this.active.values()].filter((job) => job.workspaceId === workspaceId).length;
  }

  metrics() {
    return {
      ...this.counts,
      pending: this.counts.QUEUED,
      running: this.active.size,
      depth: this.counts.QUEUED + this.active.size,
      concurrency: this.concurrency,
      maxQueueDepth: this.maxQueueDepth,
      workerId: this.owner,
    };
  }

  async cancel(jobId) {
    const local = this.active.get(jobId);
    if (local) local.cancelRequested = true;
    const result = await this.pool.query(
      `UPDATE scan_jobs
          SET status = 'CANCELLED', completed_at = COALESCE(completed_at, NOW()),
              error_code = 'SCAN_CANCELLED', error_message = 'The scan was cancelled.',
              cancellation_reason = 'The scan was cancelled.', lease_owner = NULL, lease_until = NULL
        WHERE id = $1 AND status IN ('QUEUED', 'RUNNING')
        RETURNING id, type, status, created_at, started_at, completed_at, error_code, error_message, attempts, max_attempts, queue_payload`,
      [jobId],
    );
    const row = result.rows[0];
    if (row && local?.controller) local.controller.abort();
    return row ? this.#rowSnapshot(row) : await this.get(jobId);
  }

  async close() {
    this.closed = true;
    clearInterval(this.pollTimer);
    for (const job of this.active.values()) job.controller?.abort();
    await this.pool.end();
  }

  #rowSnapshot(row) {
    return {
      id: row.id, type: row.type, status: row.status,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      error: row.error_code ? { code: row.error_code, message: row.error_message } : null,
      attempts: row.attempts || 0, maxAttempts: row.max_attempts || this.maxAttempts,
      payload: row.queue_payload || null, workspaceId: row.workspace_id || row.queue_payload?.workspaceId || null,
    };
  }

  async #claim() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT id, type, status, created_at, attempts, max_attempts, queue_payload, workspace_id
           FROM scan_jobs
          WHERE (status = 'QUEUED' OR (status = 'RUNNING' AND lease_until < NOW()))
            AND (lease_owner IS NULL OR lease_until < NOW())
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED LIMIT 1`,
      );
      if (!result.rowCount) {
        await client.query("COMMIT");
        return null;
      }
      const row = result.rows[0];
      const startedAt = this.clock().toISOString();
      await client.query(
        `UPDATE scan_jobs
            SET status = 'RUNNING', started_at = COALESCE(started_at, $2),
                attempts = attempts + 1, max_attempts = $3,
                lease_owner = $4, lease_until = $5::timestamptz
          WHERE id = $1`,
        [row.id, startedAt, row.max_attempts || this.maxAttempts, this.owner, new Date(this.clock().getTime() + this.leaseMs).toISOString()],
      );
      await client.query("COMMIT");
      return { ...row, status: "RUNNING", attempts: (row.attempts || 0) + 1, started_at: startedAt, workspace_id: row.workspace_id };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async #drain() {
    if (this.closed) return;
    while (this.active.size < this.concurrency) {
      const row = await this.#claim();
      if (!row) break;
      const payload = row.queue_payload || {};
      const job = {
        id: row.id, type: row.type, status: "RUNNING", workspaceId: row.workspace_id,
        payload, createdAt: row.created_at, startedAt: row.started_at, completedAt: null,
        attempts: row.attempts, maxAttempts: row.max_attempts || this.maxAttempts,
        error: null, cancelRequested: false, controller: new AbortController(),
      };
      this.active.set(job.id, job);
      this.counts.RUNNING += 1;
      await this.onStatusChange?.(job);
      this.#run(job).catch((error) => console.error(`Queue job ${job.id} failed: ${error.message}`));
    }
  }

  async #run(job) {
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          job.controller.abort();
          reject(Object.assign(new Error("SCAN_TIMEOUT"), { code: "SCAN_TIMEOUT" }));
        }, this.timeoutMs);
        timer.unref?.();
      });
      const scan = await Promise.race([
        Promise.resolve().then(() => this.processor(job.payload, { signal: job.controller.signal, attempt: job.attempts, jobId: job.id })),
        timeout,
      ]);
      if (!job.cancelRequested) {
        job.status = "SUCCEEDED";
        job.scan = scan;
        job.completedAt = this.clock().toISOString();
        await this.pool.query(
          `UPDATE scan_jobs SET status = 'SUCCEEDED', completed_at = $2, lease_owner = NULL,
              lease_until = NULL, report_json = $3::jsonb, last_error = NULL
            WHERE id = $1 AND lease_owner = $4`,
          [job.id, job.completedAt, JSON.stringify(scan), this.owner],
        );
        await this.onStatusChange?.(job);
      }
    } catch (error) {
      if (!job.cancelRequested) {
        job.error = { code: error.code || "SCAN_FAILED", message: error.message || "The scan could not be completed." };
        job.completedAt = this.clock().toISOString();
        const retry = job.attempts < job.maxAttempts && error.code !== "SCAN_CANCELLED";
        job.status = retry ? "QUEUED" : "FAILED";
        await this.pool.query(
          `UPDATE scan_jobs SET status = $2, completed_at = CASE WHEN $2 = 'FAILED' THEN $3 ELSE NULL END,
              error_code = $4, error_message = $5, last_error = $6::jsonb, lease_owner = NULL, lease_until = NULL
            WHERE id = $1 AND lease_owner = $7`,
          [job.id, job.status, retry ? null : job.completedAt, job.error.code, job.error.message, JSON.stringify(job.error), this.owner],
        );
        if (!retry) {
          await this.pool.query(
            `INSERT INTO scan_job_dead_letters
              (job_id, worker_id, attempts, error_code, error_message, payload)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
            [job.id, this.owner, job.attempts, job.error.code, job.error.message, JSON.stringify(job.payload)],
          );
        }
        await this.onStatusChange?.(job);
      }
    } finally {
      clearTimeout(timer);
      this.active.delete(job.id);
      this.counts.RUNNING = Math.max(0, this.counts.RUNNING - 1);
      if (job.status === "SUCCEEDED") this.counts.SUCCEEDED += 1;
      if (job.status === "FAILED") this.counts.FAILED += 1;
      if (job.status === "QUEUED") this.counts.QUEUED += 1;
      await this.#drain();
    }
  }
}

function createScanJobQueue({
  processor,
  runtimeConfig,
  onStatusChange = null,
  maxAttempts = runtimeConfig.queue.maxAttempts,
  timeoutMs = runtimeConfig.queue.timeoutMs,
} = {}) {
  if (runtimeConfig.environment === "production" && runtimeConfig.queue.driver === "memory") {
    throw new Error("The in-memory scan queue cannot be used in production.");
  }
  if (runtimeConfig.queue.driver === "postgresql" || runtimeConfig.queue.driver === "postgres") {
    return new PostgresScanJobQueue({
      processor, concurrency: runtimeConfig.queue.workerConcurrency, maxQueueDepth: runtimeConfig.queue.maxQueueDepth,
      maxAttempts, timeoutMs, onStatusChange,
    });
  }
  if (runtimeConfig.queue.driver !== "memory") throw new Error(`Queue driver "${runtimeConfig.queue.driver}" is not installed.`);
  return new InMemoryScanJobQueue({
    processor,
    concurrency: runtimeConfig.queue.workerConcurrency,
    maxQueueDepth: runtimeConfig.queue.maxQueueDepth,
    maxAttempts,
    timeoutMs,
    onStatusChange,
  });
}

module.exports = { JOB_STATUS, InMemoryScanJobQueue, PostgresScanJobQueue, createScanJobQueue };