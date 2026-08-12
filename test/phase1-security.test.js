const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTIONS,
  DATA_CLASSIFICATION,
  ROLES,
  assertNoSecretPersistence,
  assertRecordScope,
  authorize,
  can,
  createVisitorContext,
} = require("../src/security/policy");
const {
  AppendOnlyAuditLog,
  CircuitBreaker,
  IdempotencyStore,
  KeyedRateLimiter,
  QuotaLedger,
  withProviderPolicy,
} = require("../src/security/controls");
const {
  assertControlledProviderUrl,
  createProviderRegistry,
} = require("../src/providers/registry");

test("workspace records require an exact server-side workspace scope", () => {
  const record = { workspace_id: "workspace_a", value: "private" };
  assert.equal(assertRecordScope(record, "workspace_a"), record);
  assert.throws(() => assertRecordScope(record, "workspace_b"), /WORKSPACE_SCOPE_MISMATCH/);
  assert.throws(() => assertRecordScope({ value: "missing" }, "workspace_a"), /WORKSPACE_SCOPE_REQUIRED/);
  assert.throws(() => authorize({
    actor: { id: "root", role: ROLES.SUPERADMIN },
    workspaceId: "workspace_a",
    action: ACTIONS.SCAN_READ,
  }), /FORBIDDEN/);
});

test("permission matrix separates platform and workspace authority", () => {
  assert.equal(can({ role: ROLES.WORKSPACE_OWNER }, ACTIONS.MEMBERSHIP_MANAGE), true);
  assert.equal(can({ role: ROLES.WORKSPACE_MEMBER }, ACTIONS.MEMBERSHIP_MANAGE), false);
  assert.equal(can({ role: ROLES.SUPERADMIN }, ACTIONS.PLATFORM_MANAGE), true);
  assert.equal(can({ role: ROLES.SUPERADMIN }, ACTIONS.SCAN_READ), false);
  assert.equal(createVisitorContext().workspaceId.startsWith("visitor_"), true);
});

test("rate, quota, idempotency, and audit controls are bounded", () => {
  let now = 0;
  const limiter = new KeyedRateLimiter({ clock: () => now });
  assert.equal(limiter.check("ip:1", 1, 1000).allowed, true);
  assert.equal(limiter.check("ip:1", 1, 1000).allowed, false);
  now = 1001;
  assert.equal(limiter.check("ip:1", 1, 1000).allowed, true);

  const quota = new QuotaLedger({ clock: () => new Date("2026-08-12T00:00:00.000Z") });
  assert.equal(quota.consume({ workspaceId: "w", planId: "free", limit: 1 }).allowed, true);
  assert.equal(quota.consume({ workspaceId: "w", planId: "free", limit: 1 }).allowed, false);

  const idempotency = new IdempotencyStore({ clock: () => now, ttlMs: 1000 });
  idempotency.set("w", "request-1", { job: { id: "scan_1" } });
  assert.deepEqual(idempotency.get("w", "request-1"), { job: { id: "scan_1" } });
  assert.equal(idempotency.get("other", "request-1"), null);

  const audit = new AppendOnlyAuditLog({ clock: () => new Date("2026-08-12T00:00:00.000Z") });
  audit.append({ action: "SCAN_CREATED", workspaceId: "w" });
  assert.equal(audit.list().length, 1);
  assert.throws(() => audit.list().push({ action: "FORGED" }), /read only|object is not extensible/i);
});

test("provider URLs and response schemas are controlled", () => {
  assert.equal(assertControlledProviderUrl("https://api.gopluslabs.io/api/v1").origin, "https://api.gopluslabs.io");
  assert.throws(() => assertControlledProviderUrl("http://127.0.0.1:8080"), /PROVIDER_URL_NOT_ALLOWED/);
  assert.throws(() => assertControlledProviderUrl("https://example.com"), /PROVIDER_URL_NOT_ALLOWED/);
  const registry = createProviderRegistry([{
    id: "strict-test",
    source: "Strict test",
    version: "1.0.0",
    capabilities: ["test"],
    validateResponse: (response) => response && response.ok === true,
    fetch: async () => ({ json: { ok: true } }),
    normalizeResponse: () => ({
      status: "valid",
      providerId: "strict-test",
      adapterVersion: "1.0.0",
      evidence: {},
    }),
  }]);
  assert.equal(registry.validateResponse("strict-test", { ok: true }), true);
  assert.throws(() => registry.validateResponse("strict-test", { ok: false }), /PROVIDER_RESPONSE_INVALID/);
});

test("provider policy retries transient failures and opens circuit", async () => {
  let calls = 0;
  const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000, clock: () => 0 });
  await assert.rejects(() => withProviderPolicy(async () => {
    calls += 1;
    throw Object.assign(new Error("upstream"), { code: "PROVIDER_TIMEOUT" });
  }, { provider: "test", breaker, retries: 1, sleep: async () => {} }), (error) => error.code === "PROVIDER_TIMEOUT");
  assert.equal(calls, 2);
  breaker.failure();
  assert.equal(breaker.allow(), false);
});

test("secret-shaped fields cannot be persisted through normal records", () => {
  assert.throws(() => assertNoSecretPersistence({ apiKey: "never persist" }), /SECRET_PERSISTENCE_FORBIDDEN/);
  assert.doesNotThrow(() => assertNoSecretPersistence({ workspace_id: "w", classification: DATA_CLASSIFICATION.PRIVATE }));
});