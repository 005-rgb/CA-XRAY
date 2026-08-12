const CONTROLLED_PROVIDER_ORIGINS = Object.freeze([
  "https://api.gopluslabs.io",
  "https://api.dexscreener.com",
]);

function assertControlledProviderUrl(value, allowedOrigins = CONTROLLED_PROVIDER_ORIGINS) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("PROVIDER_URL_INVALID"), { code: "PROVIDER_URL_INVALID" });
  }
  if (url.protocol !== "https:" || !allowedOrigins.includes(url.origin)) {
    throw Object.assign(new Error("PROVIDER_URL_NOT_ALLOWED"), { code: "PROVIDER_URL_NOT_ALLOWED" });
  }
  return url;
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("Provider adapter must be an object.");
  }
  for (const key of ["id", "source", "fetch", "apply", "validate"]) {
    if (!adapter[key]) throw new TypeError(`Provider adapter is missing ${key}.`);
  }
  if (typeof adapter.fetch !== "function" || typeof adapter.apply !== "function") {
    throw new TypeError("Provider adapter fetch and apply members must be functions.");
  }
  if (typeof adapter.validate !== "function") {
    throw new TypeError("Provider adapter validate member must be a function.");
  }
  if (typeof adapter.id !== "string" || !/^[a-z0-9-]{2,64}$/.test(adapter.id)) {
    throw new TypeError("Provider adapter id must be a stable lowercase identifier.");
  }
  return Object.freeze({ ...adapter });
}

function createProviderRegistry(adapters = []) {
  const registered = new Map();
  for (const adapter of adapters) {
    const validated = validateAdapter(adapter);
    if (registered.has(validated.id)) {
      throw new Error(`Provider adapter already registered: ${validated.id}`);
    }
    registered.set(validated.id, validated);
  }

  return Object.freeze({
    list() {
      return [...registered.values()];
    },
    get(id) {
      return registered.get(id) || null;
    },
    validateResponse(id, response) {
      const adapter = registered.get(id);
      if (!adapter) throw new Error(`Unknown provider adapter: ${id}`);
      const result = adapter.validate(response);
      if (result === true) return true;
      const error = new Error(result?.message || "PROVIDER_RESPONSE_INVALID");
      error.code = result?.code || "PROVIDER_RESPONSE_INVALID";
      error.provider = adapter.source;
      throw error;
    },
  });
}

module.exports = {
  CONTROLLED_PROVIDER_ORIGINS,
  assertControlledProviderUrl,
  createProviderRegistry,
  validateAdapter,
};