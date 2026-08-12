const test = require("node:test");
const assert = require("node:assert/strict");
const {
  scanLive,
  toPublicScan,
} = require("../src/engine");
const {
  normalizedPoint,
  normalizedResult,
  PROVIDER_RESULT_STATUS,
} = require("../src/providers/contracts");
const {
  createDefaultProviderRegistry,
  normalizeGoPlus,
  normalizeDexScreener,
} = require("../src/providers/default-adapters");
const { createProviderRegistry } = require("../src/providers/registry");
const { withProviderPolicy, CircuitBreaker } = require("../src/security/controls");

const address = "0x1234567890123456789012345678901234567890";
const networkId = "ethereum";
const retrievedAt = "2026-08-12T00:00:00.000Z";

function adapter(id, value, { delay = 0, status = "valid", capabilities = ["test"] } = {}) {
  return {
    id,
    source: `${id} internal source`,
    version: "test-1.0.0",
    capabilities,
    validateResponse: () => true,
    fetch: async () => {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return { json: { value }, retrievedAt };
    },
    normalizeResponse: ({ providerId }) => normalizedResult({
      providerId,
      adapterVersion: "test-1.0.0",
      status,
      retrievedAt,
      errorCode: status === "provider_error" ? "TEST_PROVIDER_ERROR" : null,
      message: status === "provider_error" ? "Test provider failed." : null,
      evidence: status === "valid"
        ? {
          token: {
            name: normalizedPoint({
              value,
              providerId,
              adapterVersion: "test-1.0.0",
              retrievedAt,
              evidenceReference: `E-${id === "private-provider" ? "001" : "002"}`,
            }),
          },
        }
        : {},
    }),
  };
}

test("chain-aware validation rejects before any provider query", async () => {
  let calls = 0;
  const registry = createProviderRegistry([{
    ...adapter("chain-test", "Token"),
    fetch: async () => {
      calls += 1;
      return { json: {}, retrievedAt };
    },
  }]);
  await assert.rejects(
    () => scanLive({ address, networkId: "unsupported", providerRegistry: registry }),
    /UNSUPPORTED_NETWORK/,
  );
  assert.equal(calls, 0);
});

test("provider result taxonomy remains exact for unavailable and malformed data", () => {
  const unavailable = normalizeDexScreener({
    response: { pairs: null },
    retrievedAt,
    network: { dexChainId: "ethereum" },
    address,
    providerId: "dexscreener",
  });
  assert.equal(unavailable.status, PROVIDER_RESULT_STATUS.UNAVAILABLE);

  const malformed = normalizeDexScreener({
    response: { pairs: { invalid: true } },
    retrievedAt,
    network: { dexChainId: "ethereum" },
    address,
    providerId: "dexscreener",
  });
  assert.equal(malformed.status, PROVIDER_RESULT_STATUS.PROVIDER_ERROR);
});

test("missing market numerics stay unknown and never become NaN", () => {
  const result = normalizeDexScreener({
    response: {
      pairs: [{
        chainId: "ethereum",
        baseToken: { address, name: "Token", symbol: "TKN" },
        pairAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }],
    },
    retrievedAt,
    network: { dexChainId: "ethereum" },
    address,
    providerId: "dexscreener",
  });
  assert.equal(result.status, "valid");
  assert.equal(result.evidence.liquidity.liquidityUsd.status, "UNKNOWN");
  assert.equal(result.evidence.liquidity.liquidityUsd.value, null);
  assert.equal(JSON.stringify(result).includes("NaN"), false);
});

test("GoPlus preserves numeric zero while normalizing boolean flags", () => {
  const result = normalizeGoPlus({
    response: {
      code: 1,
      result: {
        [address]: {
          decimals: "0",
          total_supply: "0",
          is_mintable: "0",
          buy_tax: "0",
        },
      },
    },
    retrievedAt,
    network: { goplusChainId: "1" },
    providerId: "goplus-security",
  });
  assert.equal(result.status, PROVIDER_RESULT_STATUS.VALID);
  assert.equal(result.evidence.token.decimals.value, "0");
  assert.equal(result.evidence.token.decimals.status, "VERIFIED");
  assert.equal(result.evidence.security.canMint.value, false);
  assert.equal(result.evidence.security.canMint.status, "NOT_DETECTED");
  assert.equal(result.evidence.trading.buyTax.value, 0);
  assert.equal(result.evidence.trading.buyTax.status, "VERIFIED");
});

test("conflicting normalized values are explicit and do not win by provider order", async () => {
  const first = createProviderRegistry([
    adapter("alpha", "Alpha"),
    adapter("zulu", "Zulu"),
  ]);
  const second = createProviderRegistry([
    adapter("zulu", "Zulu"),
    adapter("alpha", "Alpha"),
  ]);
  const [left, right] = await Promise.all([
    scanLive({ address, networkId, providerRegistry: first }),
    scanLive({ address, networkId, providerRegistry: second }),
  ]);
  assert.equal(left.dataStatus, "provider_error");
  assert.equal(left.conflicts.length, 1);
  assert.equal(left.token.name.status, "UNKNOWN");
  assert.deepEqual(toPublicScan(left).conflicts, toPublicScan(right).conflicts);
});

test("a later provider cannot overwrite an existing normalized conflict", async () => {
  const registry = createProviderRegistry([
    adapter("alpha", "Alpha"),
    adapter("bravo", "Bravo"),
    adapter("charlie", "Charlie"),
  ]);
  const scan = await scanLive({ address, networkId, providerRegistry: registry });
  assert.equal(scan.conflicts.length, 1);
  assert.equal(scan.token.name.value, null);
  assert.equal(scan.token.name.status, "UNKNOWN");
  assert.equal(scan.dataStatus, "provider_error");
});

test("provider order and live errors never trigger demo fallback", async () => {
  const registry = createProviderRegistry([
    adapter("error-a", null, { status: "provider_error" }),
    adapter("error-b", null, { status: "provider_error", delay: 1 }),
  ]);
  const scan = await scanLive({ address, networkId, providerRegistry: registry });
  assert.equal(scan.mode, "LIVE");
  assert.equal(scan.dataStatus, "partial");
  assert.equal(scan.token.name.value, null);
  assert.equal(scan.risk.finalScore, null);
  assert.ok(!JSON.stringify(scan).includes("DEMO FIXTURE"));
});

test("public scan removes provider identities while retaining public evidence references", async () => {
  const registry = createProviderRegistry([adapter("private-provider", "Token")]);
  const scan = await scanLive({ address, networkId, providerRegistry: registry });
  const publicScan = toPublicScan(scan);
  const serialized = JSON.stringify(publicScan);
  assert.equal(serialized.includes("private-provider"), false);
  assert.equal(serialized.includes("internal source"), false);
  assert.equal(publicScan.token.name.evidenceId, "E-001");
  assert.equal(publicScan.riskScore, publicScan.risk.finalScore);
  assert.equal(publicScan.reliabilityScore, publicScan.reliability.score);
});

test("provider policy retries 5xx with bounded exponential jitter", async () => {
  let calls = 0;
  const delays = [];
  await assert.rejects(() => withProviderPolicy(async () => {
    calls += 1;
    throw Object.assign(new Error("upstream"), { code: "HTTP_503" });
  }, {
    provider: "test",
    breaker: new CircuitBreaker({ failureThreshold: 5 }),
    retries: 2,
    sleep: async (delay) => delays.push(delay),
    random: () => 0.5,
  }), (error) => error.code === "HTTP_503");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [25, 50]);
});

test("provider runtime enforces concurrency and quota limits", async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const registry = createProviderRegistry([{
    ...adapter("limited", "Token"),
    fetch: async () => {
      await pending;
      return { json: {}, retrievedAt };
    },
  }], { concurrencyLimit: 1, quotaLimit: 2, quotaWindowMs: 60_000 });
  const first = registry.fetch("limited", {});
  await assert.rejects(() => registry.fetch("limited", {}), /PROVIDER_CONCURRENCY_LIMIT/);
  release();
  await first;
  await registry.fetch("limited", {});
  await assert.rejects(() => registry.fetch("limited", {}), /PROVIDER_QUOTA_EXCEEDED/);
});