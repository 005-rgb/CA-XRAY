const CONTROLLED_PROVIDER_ORIGINS = Object.freeze([
  "https://api.gopluslabs.io",
  "https://api.dexscreener.com",
  "https://eth.blockscout.com",
  "https://bsc.blockscout.com",
  "https://base.blockscout.com",
  "https://arbitrum.blockscout.com",
  "https://polygon.blockscout.com",
  "https://ethereum-rpc.publicnode.com",
  "https://bsc-rpc.publicnode.com",
  "https://base-rpc.publicnode.com",
  "https://arbitrum-one-rpc.publicnode.com",
  "https://polygon-bor-rpc.publicnode.com",
  "https://opbnb-mainnet-rpc.bnbchain.org",
  "https://rpc.hyperliquid.xyz",
  "https://json-rpc.evm.shimmer.network",
  "https://mainnet.mode.network",
  "https://mainnet.era.zksync.io",
  "https://pacific-rpc.manta.network",
  "https://rpc-gel.inkonchain.com",
  "https://rpc.monad.xyz",
  "https://rpc.coredao.org",
  "https://public-node.rsk.co",
  "https://evm.astar.network",
  "https://explorer.velas.com",
  "https://rpc.fuse.io",
  "https://neon-proxy-mainnet.solana.p2p.org",
  "https://eth-rpc-karura.aca-api.network",
  "https://sapphire.oasis.io",
  "https://evm.kava.io",
  "https://astar.blockscout.com",
  "https://rpc.zora.energy",
  "https://rpc.api.moonbeam.network",
  "https://rpc.api.moonriver.moonbeam.network",
  "https://rpc.telos.net",
]);

function assertControlledProviderUrl(value, allowedOrigins = CONTROLLED_PROVIDER_ORIGINS) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("PROVIDER_URL_INVALID"), { code: "PROVIDER_URL_INVALID" });
  }
  const isPublicNodeRpc = url.protocol === "https:"
    && url.hostname.endsWith(".publicnode.com")
    && /^[a-z0-9.-]+\.publicnode\.com$/i.test(url.hostname);
  if (url.protocol !== "https:" || (!allowedOrigins.includes(url.origin) && !isPublicNodeRpc)) {
    throw Object.assign(new Error("PROVIDER_URL_NOT_ALLOWED"), { code: "PROVIDER_URL_NOT_ALLOWED" });
  }
  return url;
}

class ProviderRuntime {
  constructor({ concurrencyLimit = 2, quotaLimit = 120, quotaWindowMs = 60_000 } = {}) {
    this.concurrencyLimit = Math.max(1, Number(concurrencyLimit) || 1);
    this.quotaLimit = Math.max(1, Number(quotaLimit) || 1);
    this.quotaWindowMs = Math.max(1, Number(quotaWindowMs) || 1);
    this.active = 0;
    this.calls = [];
    this.successes = 0;
    this.failures = 0;
    this.lastError = null;
    this.lastSuccessfulAt = null;
    this.lastCallAt = null;
    this.totalLatencyMs = 0;
    this.lastLatencyMs = null;
  }

  checkQuota(now = Date.now()) {
    this.calls = this.calls.filter((timestamp) => now - timestamp < this.quotaWindowMs);
    if (this.calls.length >= this.quotaLimit) {
      throw Object.assign(new Error("PROVIDER_QUOTA_EXCEEDED"), {
        code: "PROVIDER_QUOTA_EXCEEDED",
      });
    }
    this.calls.push(now);
  }

  async run(operation) {
    if (this.active >= this.concurrencyLimit) {
      throw Object.assign(new Error("PROVIDER_CONCURRENCY_LIMIT"), {
        code: "PROVIDER_CONCURRENCY_LIMIT",
      });
    }
    this.checkQuota();
    this.active += 1;
    const startedAt = Date.now();
    this.lastCallAt = new Date(startedAt).toISOString();
    try {
      const result = await operation();
      this.successes += 1;
      this.lastLatencyMs = Date.now() - startedAt;
      this.totalLatencyMs += this.lastLatencyMs;
      this.lastSuccessfulAt = new Date().toISOString();
      return result;
    } catch (error) {
      this.failures += 1;
      this.lastError = error.code || "PROVIDER_ERROR";
      this.lastLatencyMs = Date.now() - startedAt;
      this.totalLatencyMs += this.lastLatencyMs;
      throw error;
    } finally {
      this.active -= 1;
    }
  }

  snapshot() {
    return Object.freeze({
      active: this.active,
      concurrencyLimit: this.concurrencyLimit,
      quotaLimit: this.quotaLimit,
      successes: this.successes,
      failures: this.failures,
      errorRate: this.successes + this.failures
        ? this.failures / (this.successes + this.failures)
        : 0,
      averageLatencyMs: this.successes + this.failures
        ? Math.round(this.totalLatencyMs / (this.successes + this.failures))
        : null,
      lastLatencyMs: this.lastLatencyMs,
      lastSuccessfulAt: this.lastSuccessfulAt,
      lastCallAt: this.lastCallAt,
      lastError: this.lastError,
    });
  }
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("Provider adapter must be an object.");
  }
  for (const key of ["id", "source", "fetch"]) {
    if (!adapter[key]) throw new TypeError(`Provider adapter is missing ${key}.`);
  }
  if (typeof adapter.fetch !== "function") {
    throw new TypeError("Provider adapter fetch member must be a function.");
  }
  const validateResponse = adapter.validateResponse || adapter.validate;
  if (typeof validateResponse !== "function") {
    throw new TypeError("Provider adapter validateResponse member must be a function.");
  }
  if (typeof adapter.normalizeResponse !== "function") {
    throw new TypeError("Provider adapter normalizeResponse member must be a function.");
  }
  if (typeof adapter.id !== "string" || !/^[a-z0-9-]{2,64}$/.test(adapter.id)) {
    throw new TypeError("Provider adapter id must be a stable lowercase identifier.");
  }
  return Object.freeze({
    ...adapter,
    version: adapter.version || "1.0.0",
    capabilities: Object.freeze([...(adapter.capabilities || [])]),
    validateResponse,
  });
}

function createProviderRegistry(adapters = [], runtimeOptions = {}) {
  const registered = new Map();
  const runtime = new Map();
  for (const adapter of adapters) {
    const validated = validateAdapter(adapter);
    if (registered.has(validated.id)) {
      throw new Error(`Provider adapter already registered: ${validated.id}`);
    }
    registered.set(validated.id, validated);
    runtime.set(validated.id, new ProviderRuntime(runtimeOptions[validated.id] || runtimeOptions));
  }

  return Object.freeze({
    list() {
      return [...registered.values()];
    },
    get(id) {
      return registered.get(id) || null;
    },
    async fetch(id, context) {
      const adapter = registered.get(id);
      if (!adapter) throw new Error(`Unknown provider adapter: ${id}`);
      return runtime.get(id).run(() => adapter.fetch({ ...context, providerId: id }));
    },
    validateResponse(id, response) {
      const adapter = registered.get(id);
      if (!adapter) throw new Error(`Unknown provider adapter: ${id}`);
      const result = adapter.validateResponse(response);
      if (result === true) return true;
      const error = new Error(result?.message || "PROVIDER_RESPONSE_INVALID");
      error.code = result?.code || "PROVIDER_RESPONSE_INVALID";
      error.providerId = adapter.id;
      throw error;
    },
    normalizeResponse(id, context) {
      const adapter = registered.get(id);
      if (!adapter) throw new Error(`Unknown provider adapter: ${id}`);
      const result = adapter.normalizeResponse({ ...context, providerId: id });
      if (!result || typeof result !== "object" || !["valid", "unknown", "unavailable", "provider_error"].includes(result.status)) {
        throw Object.assign(new Error("PROVIDER_NORMALIZATION_INVALID"), {
          code: "PROVIDER_NORMALIZATION_INVALID",
          providerId: id,
        });
      }
      return result;
    },
    health(id = null) {
      if (id) return runtime.get(id)?.snapshot() || null;
      return Object.fromEntries([...runtime.entries()].map(([key, value]) => [key, value.snapshot()]));
    },
  });
}

module.exports = {
  CONTROLLED_PROVIDER_ORIGINS,
  ProviderRuntime,
  assertControlledProviderUrl,
  createProviderRegistry,
  validateAdapter,
};