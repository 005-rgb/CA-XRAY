function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("Provider adapter must be an object.");
  }
  for (const key of ["id", "source", "fetch", "apply"]) {
    if (!adapter[key]) throw new TypeError(`Provider adapter is missing ${key}.`);
  }
  if (typeof adapter.fetch !== "function" || typeof adapter.apply !== "function") {
    throw new TypeError("Provider adapter fetch and apply members must be functions.");
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
  });
}

module.exports = { createProviderRegistry, validateAdapter };