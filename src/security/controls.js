const crypto = require("node:crypto");

const TRANSIENT_PROVIDER_CODES = new Set([
  "PROVIDER_TIMEOUT",
  "RATE_LIMIT",
  "PROVIDER_ERROR",
  "HTTP_408",
  "HTTP_425",
  "HTTP_429",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

class RateLimitError extends Error {
  constructor(dimension, retryAfterMs) {
    super(`RATE_LIMITED:${dimension}`);
    this.name = "RateLimitError";
    this.code = "RATE_LIMITED";
    this.dimension = dimension;
    this.retryAfterMs = retryAfterMs;
  }
}

class KeyedRateLimiter {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock;
    this.buckets = new Map();
  }

  check(key, limit, windowMs) {
    const now = this.clock();
    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
    }
    if (bucket.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, bucket.resetAt - now) };
    }
    bucket.count += 1;
    return { allowed: true, remaining: Math.max(0, limit - bucket.count), retryAfterMs: 0 };
  }

  enforce(dimension, key, limit, windowMs) {
    const result = this.check(`${dimension}:${key}`, limit, windowMs);
    if (!result.allowed) throw new RateLimitError(dimension, result.retryAfterMs);
    return result;
  }
}

class QuotaLedger {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.usage = new Map();
  }

  consume({ workspaceId, planId, limit }) {
    if (!workspaceId) throw new Error("WORKSPACE_SCOPE_REQUIRED");
    if (limit === null || limit === undefined) return { allowed: true, used: 0, limit: null };
    const month = this.clock().toISOString().slice(0, 7);
    const key = `${workspaceId}:${month}`;
    const used = this.usage.get(key) || 0;
    if (used >= limit) {
      return { allowed: false, used, limit, planId, month };
    }
    const next = used + 1;
    this.usage.set(key, next);
    return { allowed: true, used: next, limit, planId, month };
  }
}

class IdempotencyStore {
  constructor({ ttlMs = 24 * 60 * 60 * 1000, clock = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.clock = clock;
    this.entries = new Map();
  }

  get(scope, key) {
    const entry = this.entries.get(`${scope}:${key}`);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock()) {
      this.entries.delete(`${scope}:${key}`);
      return null;
    }
    return clone(entry.value);
  }

  set(scope, key, value) {
    this.entries.set(`${scope}:${key}`, {
      expiresAt: this.clock() + this.ttlMs,
      value: clone(value),
    });
    return clone(value);
  }
}

class AppendOnlyAuditLog {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.entries = [];
  }

  append({ action, actorId = "system", workspaceId = null, metadata = {} }) {
    if (!action) throw new Error("AUDIT_ACTION_REQUIRED");
    const entry = Object.freeze({
      id: `audit_${crypto.randomUUID()}`,
      action,
      actorId,
      workspaceId,
      metadata: Object.freeze(clone(metadata) || {}),
      createdAt: this.clock().toISOString(),
    });
    this.entries.push(entry);
    return entry;
  }

  list() {
    return Object.freeze(this.entries.slice());
  }
}

class CircuitBreaker {
  constructor({ failureThreshold = 3, resetTimeoutMs = 30_000, clock = () => Date.now() } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.clock = clock;
    this.failures = 0;
    this.openedAt = null;
    this.halfOpenProbe = false;
  }

  state() {
    if (this.openedAt === null) return "CLOSED";
    if (this.clock() - this.openedAt >= this.resetTimeoutMs) return "HALF_OPEN";
    return "OPEN";
  }

  allow() {
    const state = this.state();
    if (state === "OPEN") return false;
    if (state === "HALF_OPEN") {
      if (this.halfOpenProbe) return false;
      this.halfOpenProbe = true;
    }
    return true;
  }

  success() {
    this.failures = 0;
    this.openedAt = null;
    this.halfOpenProbe = false;
  }

  failure() {
    this.halfOpenProbe = false;
    this.failures += 1;
    if (this.failures >= this.failureThreshold) this.openedAt = this.clock();
  }

  snapshot() {
    return Object.freeze({ state: this.state(), failures: this.failures });
  }
}

function assertRetryBudget(retries) {
  const value = Number(retries);
  return Number.isInteger(value) && value >= 0 ? Math.min(value, 2) : 0;
}

async function withProviderPolicy(operation, {
  provider,
  breaker = new CircuitBreaker(),
  timeoutMs = 12_000,
  retries = 1,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
} = {}) {
  if (!breaker.allow()) {
    throw Object.assign(new Error("PROVIDER_CIRCUIT_OPEN"), {
      code: "PROVIDER_CIRCUIT_OPEN",
      provider,
    });
  }
  const attempts = assertRetryBudget(retries) + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await operation({ signal: controller.signal, attempt });
      breaker.success();
      return result;
    } catch (error) {
      const normalized = error?.name === "AbortError"
        ? Object.assign(new Error("PROVIDER_TIMEOUT"), { code: "PROVIDER_TIMEOUT", provider })
        : error;
      const transient = TRANSIENT_PROVIDER_CODES.has(normalized?.code)
        || /^HTTP_5\d\d$/.test(String(normalized?.code || ""));
      if (attempt + 1 >= attempts || !transient) {
        breaker.failure();
        throw normalized;
      }
      const baseDelay = 25 * (2 ** attempt);
      const jitter = Math.max(0, Math.min(1, Number(random()) || 0));
      await sleep(Math.round(baseDelay * (0.75 + (jitter * 0.5))));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("PROVIDER_ERROR");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

module.exports = {
  AppendOnlyAuditLog,
  CircuitBreaker,
  IdempotencyStore,
  KeyedRateLimiter,
  QuotaLedger,
  RateLimitError,
  TRANSIENT_PROVIDER_CODES,
  sha256,
  withProviderPolicy,
};