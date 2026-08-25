const crypto = require("node:crypto");

const RUN_STATUS = Object.freeze(["QUEUED", "CLAIMED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", "DEAD_LETTERED"]);

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function backoff(attempt, baseMs, maxMs) { return Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1))); }

class DurableWatchScheduler {
  constructor({ clock = () => new Date(), leaseMs = 60_000, maxAttempts = 3, retryBaseMs = 1_000, retryMaxMs = 300_000, concurrency = 8 } = {}) {
    this.clock = clock; this.leaseMs = leaseMs; this.maxAttempts = maxAttempts;
    this.retryBaseMs = retryBaseMs; this.retryMaxMs = retryMaxMs; this.concurrency = concurrency;
    this.targets = new Map(); this.runs = new Map(); this.deadLetters = new Map(); this.active = new Map();
    this.metricsState = { claimed: 0, completed: 0, failed: 0, retries: 0, reclaimed: 0, dueLagMs: [] };
  }

  schedule({ targetId, workspaceId, intervalMs, nextDueAt = this.clock(), status = "ACTIVE", timezone = "UTC" }) {
    if (!targetId || !workspaceId || !Number.isFinite(intervalMs) || intervalMs <= 0) throw new Error("INVALID_SCHEDULE");
    const target = { targetId, workspaceId, intervalMs, timezone, status, nextDueAt: new Date(nextDueAt).toISOString(), updatedAt: this.clock().toISOString() };
    this.targets.set(targetId, target); return clone(target);
  }

  pause(targetId) { const target = this.targets.get(targetId); if (target) target.status = "PAUSED"; return clone(target || null); }
  resume(targetId) { const target = this.targets.get(targetId); if (target) { target.status = "ACTIVE"; target.nextDueAt = target.nextDueAt || this.clock().toISOString(); } return clone(target || null); }

  tick({ now = this.clock(), limit = this.concurrency } = {}) {
    const nowDate = new Date(now); const results = [];
    for (const target of [...this.targets.values()].filter((item) => item.status === "ACTIVE" && Date.parse(item.nextDueAt) <= nowDate.getTime()).slice(0, limit)) {
      const windowKey = target.nextDueAt;
      const runKey = `${target.targetId}:${windowKey}`;
      const existing = this.runs.get(runKey);
      if (existing) continue;
      const run = existing || { runId: `run_${crypto.randomUUID()}`, runKey, targetId: target.targetId, workspaceId: target.workspaceId, windowKey, status: "QUEUED", attempts: 0, maxAttempts: this.maxAttempts, createdAt: nowDate.toISOString(), nextAttemptAt: nowDate.toISOString(), leaseOwner: null, leaseUntil: null, error: null };
      this.runs.set(runKey, run);
      target.nextDueAt = new Date(new Date(target.nextDueAt).getTime() + target.intervalMs).toISOString();
      this.metricsState.dueLagMs.push(Math.max(0, nowDate.getTime() - Date.parse(windowKey)));
      results.push(clone(run));
    }
    return { checkedAt: nowDate.toISOString(), runs: results };
  }

  claim({ workerId, now = this.clock() } = {}) {
    const nowMs = new Date(now).getTime();
    for (const run of this.runs.values()) {
      const expired = run.leaseUntil && Date.parse(run.leaseUntil) <= nowMs;
      const available = ["QUEUED", "CLAIMED", "RUNNING"].includes(run.status) && (!run.nextAttemptAt || Date.parse(run.nextAttemptAt) <= nowMs);
      if (!available || (run.leaseOwner && !expired) || this.active.size >= this.concurrency) continue;
      if (expired) this.metricsState.reclaimed += 1;
      run.status = "CLAIMED"; run.leaseOwner = workerId || "worker"; run.leaseUntil = new Date(nowMs + this.leaseMs).toISOString(); run.attempts += 1;
      this.active.set(run.runId, run); this.metricsState.claimed += 1; return clone(run);
    }
    return null;
  }

  complete(runId, { workerId, success, error = null, now = this.clock() } = {}) {
    const run = [...this.runs.values()].find((item) => item.runId === runId);
    if (!run || run.leaseOwner !== workerId) return null;
    const at = new Date(now).toISOString(); run.leaseOwner = null; run.leaseUntil = null; this.active.delete(run.runId);
    if (success) { run.status = "SUCCEEDED"; run.completedAt = at; run.error = null; this.metricsState.completed += 1; }
    else {
      run.error = { code: error?.code || "RUN_FAILED", message: error?.message || "Monitoring run failed." };
      if (run.attempts >= run.maxAttempts) {
        run.status = "DEAD_LETTERED"; run.completedAt = at; this.deadLetters.set(run.runId, { ...clone(run), deadLetteredAt: at }); this.metricsState.failed += 1;
      } else { run.status = "QUEUED"; run.nextAttemptAt = new Date(new Date(now).getTime() + backoff(run.attempts, this.retryBaseMs, this.retryMaxMs)).toISOString(); this.metricsState.retries += 1; }
    }
    return clone(run);
  }

  replay(runId, { now = this.clock() } = {}) {
    const run = [...this.runs.values()].find((item) => item.runId === runId);
    if (!run || run.status !== "DEAD_LETTERED") return null;
    run.status = "QUEUED"; run.nextAttemptAt = new Date(now).toISOString(); run.leaseOwner = null; run.leaseUntil = null; run.error = null; run.replayedAt = new Date(now).toISOString(); this.deadLetters.delete(runId);
    return clone(run);
  }

  get(runId) { const run = [...this.runs.values()].find((item) => item.runId === runId); return clone(run || null); }
  listDeadLetters() { return [...this.deadLetters.values()].map(clone); }
  metrics() {
    const lag = [...this.metricsState.dueLagMs].sort((a, b) => a - b); const p95 = lag.length ? lag[Math.min(lag.length - 1, Math.ceil(lag.length * .95) - 1)] : 0;
    return { ...clone(this.metricsState), p95DueLagMs: p95, queued: [...this.runs.values()].filter((run) => run.status === "QUEUED").length, deadLettered: this.deadLetters.size, active: this.active.size };
  }
}

module.exports = { DurableWatchScheduler, RUN_STATUS, backoff };