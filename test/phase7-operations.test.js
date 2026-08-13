const test = require("node:test");
const assert = require("node:assert/strict");
const { scanLive } = require("../src/engine");
const {
  MemoryControlPlaneStore,
  PlatformControlPlane,
} = require("../src/platform/control-plane");

function providerRegistry() {
  let fetches = 0;
  const adapter = {
    id: "test-provider",
    source: "Test provider",
    version: "1.2.3",
    capabilities: ["contract-security"],
    validateResponse: () => true,
    fetch: async () => {
      fetches += 1;
      return { json: {}, retrievedAt: "2026-08-13T12:00:00.000Z" };
    },
    normalizeResponse: ({ providerId, retrievedAt }) => ({
      providerId,
      adapterVersion: "1.2.3",
      status: "valid",
      retrievedAt,
      confidence: "HIGH",
      evidence: {},
    }),
  };
  return {
    registry: {
      list: () => [adapter],
      fetch: (...args) => adapter.fetch(...args),
      validateResponse: () => true,
      normalizeResponse: (id, context) => adapter.normalizeResponse({ ...context, providerId: id }),
    },
    get fetches() {
      return fetches;
    },
  };
}

test("provider policy disables live calls without demo fallback", async () => {
  const providers = providerRegistry();
  const scan = await scanLive({
    address: `0x${"1".repeat(40)}`,
    networkId: "ethereum",
    providerRegistry: providers.registry,
    providerPolicy: () => ({
      state: "DISABLED",
      killSwitch: true,
      timeoutMs: 100,
      retries: 0,
    }),
  });

  assert.equal(providers.fetches, 0);
  assert.equal(scan.mode, "LIVE");
  assert.equal(scan.providerResults[0].status, "unavailable");
  assert.equal(scan.providerResults[0].errorCode, "PROVIDER_DISABLED");
  assert.equal(scan.errors[0].code, "PROVIDER_DISABLED");
});

test("published provider policy is server-readable without secret-shaped fields", async () => {
  const plane = new PlatformControlPlane({
    store: new MemoryControlPlaneStore({
      clock: () => new Date("2026-08-13T12:00:00.000Z"),
    }),
  });
  await plane.requestProviderDraft({
    providerId: "test-provider",
    patch: { timeoutMs: 5_000, retries: 0, quotaPerMinute: 25 },
    actorId: "admin-a",
    reason: "LATENCY_TUNING",
  });
  await plane.publishProvider({
    providerId: "test-provider",
    actorId: "admin-a",
    reason: "LATENCY_TUNING",
  });

  const policy = await plane.getProviderPolicy("test-provider");
  assert.deepEqual(policy, {
    state: "ACTIVE",
    timeoutMs: 5_000,
    retries: 0,
    quotaPerMinute: 25,
    concurrencyLimit: 2,
    priority: 100,
    killSwitch: false,
    version: 1,
  });
  assert.equal(Object.keys(policy).some((key) => /secret|token|key/i.test(key)), false);
});