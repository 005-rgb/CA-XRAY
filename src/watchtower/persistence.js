const crypto = require("node:crypto");
const { Pool } = require("pg");

const TERMINAL = new Set(["SUCCEEDED", "CANCELLED", "DEAD_LETTERED"]);

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function runFromRow(row) {
  if (!row) return null;
  return {
    runId: row.run_id, targetId: row.target_id, workspaceId: row.workspace_id,
    windowKey: row.window_key, status: row.status, attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 3),
    leaseOwner: row.lease_owner || null,
    leaseUntil: row.lease_until ? new Date(row.lease_until).toISOString() : null,
    nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : null,
    error: row.error_json || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

class MemoryWatchtowerRunStore {
  constructor({ clock = () => new Date(), leaseMs = 60_000, maxAttempts = 3, retryBaseMs = 1_000, retryMaxMs = 300_000 } = {}) {
    this.clock = clock; this.leaseMs = leaseMs; this.maxAttempts = maxAttempts; this.retryBaseMs = retryBaseMs; this.retryMaxMs = retryMaxMs;
    this.runs = new Map(); this.deadLetters = new Map();
  }
  async enqueue({ targetId, workspaceId, windowKey, payload = null }) {
    const key = `${targetId}:${windowKey}`; const current = this.runs.get(key);
    if (current) return { duplicate: true, run: clone(current) };
    const now = this.clock().toISOString();
    const run = { runId: `run_${crypto.randomUUID()}`, targetId, workspaceId, windowKey, payload: clone(payload), status: "QUEUED", attempts: 0, maxAttempts: this.maxAttempts, leaseOwner: null, leaseUntil: null, nextAttemptAt: now, error: null, createdAt: now, completedAt: null };
    this.runs.set(key, run); return { duplicate: false, run: clone(run) };
  }
  async claim({ workerId, now = this.clock() }) {
    const nowMs = new Date(now).getTime();
    for (const run of this.runs.values()) {
      const expired = run.leaseUntil && Date.parse(run.leaseUntil) <= nowMs;
      if (!["QUEUED", "CLAIMED", "RUNNING"].includes(run.status) || (run.nextAttemptAt && Date.parse(run.nextAttemptAt) > nowMs) || (run.leaseOwner && !expired)) continue;
      run.status = "CLAIMED"; run.attempts += 1; run.leaseOwner = workerId; run.leaseUntil = new Date(nowMs + this.leaseMs).toISOString();
      return clone(run);
    }
    return null;
  }
  async complete({ runId, workerId, success, error = null, now = this.clock() }) {
    const run = [...this.runs.values()].find((item) => item.runId === runId);
    if (!run || run.leaseOwner !== workerId) return null;
    const nowDate = new Date(now); run.leaseOwner = null; run.leaseUntil = null;
    if (success) { run.status = "SUCCEEDED"; run.completedAt = nowDate.toISOString(); run.error = null; }
    else if (run.attempts >= run.maxAttempts) {
      run.status = "DEAD_LETTERED"; run.completedAt = nowDate.toISOString();
      run.error = { code: error?.code || "RUN_FAILED", message: error?.message || "Monitoring run failed." };
      this.deadLetters.set(run.runId, { ...clone(run), deadLetteredAt: nowDate.toISOString(), payload: clone(run.payload) });
    } else {
      run.status = "QUEUED"; run.error = { code: error?.code || "RUN_FAILED", message: error?.message || "Monitoring run failed." };
      run.nextAttemptAt = new Date(nowDate.getTime() + Math.min(this.retryMaxMs, this.retryBaseMs * (2 ** (run.attempts - 1)))).toISOString();
    }
    return clone(run);
  }
  async replay({ runId, now = this.clock() }) {
    const run = [...this.runs.values()].find((item) => item.runId === runId);
    if (!run || run.status !== "DEAD_LETTERED") return null;
    run.status = "QUEUED"; run.nextAttemptAt = new Date(now).toISOString(); run.error = null; run.completedAt = null; run.leaseOwner = null; run.leaseUntil = null;
    this.deadLetters.delete(runId); return clone(run);
  }
  async listDeadLetters(workspaceId = null) {
    return [...this.deadLetters.values()].filter((run) => !workspaceId || run.workspaceId === workspaceId).map(clone);
  }
}

class PostgresWatchtowerRunStore {
  constructor({ pool, connectionString = process.env.DATABASE_URL, clock = () => new Date(), leaseMs = 60_000, maxAttempts = 3 } = {}) {
    if (!pool && !connectionString) throw new Error("DATABASE_URL is required for Watchtower persistence.");
    this.pool = pool || new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
    this.clock = clock; this.leaseMs = leaseMs; this.maxAttempts = maxAttempts;
  }
  async enqueue({ targetId, workspaceId, windowKey, payload = null }) {
    const runId = `run_${crypto.randomUUID()}`;
    const result = await this.pool.query(
      `INSERT INTO watchtower_runs
        (run_id, target_id, workspace_id, window_key, status, max_attempts, next_attempt_at, payload)
       VALUES ($1, $2, $3, $4, 'QUEUED', $5, NOW(), $6::jsonb)
       ON CONFLICT (target_id, window_key) DO NOTHING
       RETURNING *`,
      [runId, targetId, workspaceId, windowKey, this.maxAttempts, JSON.stringify(payload)],
    );
    if (result.rowCount) return { duplicate: false, run: runFromRow(result.rows[0]) };
    const existing = await this.pool.query("SELECT * FROM watchtower_runs WHERE target_id = $1 AND window_key = $2", [targetId, windowKey]);
    return { duplicate: true, run: runFromRow(existing.rows[0]) };
  }
  async claim({ workerId, now = this.clock() }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query(
        `SELECT * FROM watchtower_runs
          WHERE status IN ('QUEUED','CLAIMED','RUNNING')
            AND next_attempt_at <= $1
            AND (lease_owner IS NULL OR lease_until <= $1)
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED LIMIT 1`,
        [new Date(now).toISOString()],
      );
      if (!selected.rowCount) { await client.query("COMMIT"); return null; }
      const row = selected.rows[0];
      const updated = await client.query(
        `UPDATE watchtower_runs
            SET status = 'CLAIMED', attempts = attempts + 1, lease_owner = $2,
                lease_until = $3, max_attempts = GREATEST(max_attempts, $4)
          WHERE run_id = $1
          RETURNING *`,
        [row.run_id, workerId, new Date(new Date(now).getTime() + this.leaseMs).toISOString(), this.maxAttempts],
      );
      await client.query("COMMIT");
      return runFromRow(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {}); throw error;
    } finally { client.release(); }
  }
  async complete({ runId, workerId, success, error = null, now = this.clock() }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT * FROM watchtower_runs WHERE run_id = $1 AND lease_owner = $2 FOR UPDATE", [runId, workerId]);
      if (!current.rowCount) { await client.query("ROLLBACK"); return null; }
      const row = current.rows[0]; const terminal = success || Number(row.attempts) >= Number(row.max_attempts);
      const status = success ? "SUCCEEDED" : terminal ? "DEAD_LETTERED" : "QUEUED";
      const errorJson = success ? null : { code: error?.code || "RUN_FAILED", message: error?.message || "Monitoring run failed." };
      const next = status === "QUEUED" ? new Date(new Date(now).getTime() + Math.min(300_000, 1_000 * (2 ** (Number(row.attempts) - 1)))).toISOString() : null;
      const updated = await client.query(
        `UPDATE watchtower_runs
            SET status = $2, lease_owner = NULL, lease_until = NULL, error_json = $3::jsonb,
                next_attempt_at = COALESCE($4, next_attempt_at),
                completed_at = CASE WHEN $2 IN ('SUCCEEDED','DEAD_LETTERED') THEN $5 ELSE NULL END
          WHERE run_id = $1 RETURNING *`,
        [runId, status, errorJson ? JSON.stringify(errorJson) : null, next, new Date(now).toISOString()],
      );
      if (status === "DEAD_LETTERED") {
        await client.query(
          `INSERT INTO watchtower_dead_letters (run_id, workspace_id, reason, payload)
           VALUES ($1, $2, $3, $4::jsonb)`,
          [runId, row.workspace_id, errorJson?.code || "RUN_FAILED", JSON.stringify(row.payload || null)],
        );
      }
      await client.query("COMMIT"); return runFromRow(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {}); throw error;
    } finally { client.release(); }
  }
  async replay({ runId }) {
    const result = await this.pool.query(
      `UPDATE watchtower_runs
          SET status = 'QUEUED', next_attempt_at = NOW(), error_json = NULL,
              completed_at = NULL, lease_owner = NULL, lease_until = NULL
        WHERE run_id = $1 AND status = 'DEAD_LETTERED'
        RETURNING *`,
      [runId],
    );
    if (!result.rowCount) return null;
    await this.pool.query("DELETE FROM watchtower_dead_letters WHERE run_id = $1", [runId]);
    return runFromRow(result.rows[0]);
  }
  async listDeadLetters(workspaceId = null) {
    const result = await this.pool.query(
      `SELECT d.*, r.target_id, r.window_key, r.status, r.attempts
         FROM watchtower_dead_letters d JOIN watchtower_runs r ON r.run_id = d.run_id
        WHERE ($1::text IS NULL OR d.workspace_id = $1) ORDER BY d.created_at DESC`,
      [workspaceId],
    );
    return result.rows.map((row) => ({ ...runFromRow(row), deadLetteredAt: row.created_at ? new Date(row.created_at).toISOString() : null, reason: row.reason }));
  }
  async close() { await this.pool.end(); }
}

module.exports = { MemoryWatchtowerRunStore, PostgresWatchtowerRunStore, runFromRow, TERMINAL };