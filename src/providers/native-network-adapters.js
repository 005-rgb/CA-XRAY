const NATIVE_ADAPTER_VERSION = "1.0.0";
const { normalizedPoint, normalizedResult, PROVIDER_RESULT_STATUS } = require("./contracts");

const ADAPTERS = Object.freeze({
  solana: {
    type: "solana-rpc",
    endpoint: "https://api.mainnet-beta.solana.com",
  },
  sui: {
    type: "sui-rpc",
    endpoint: "https://fullnode.mainnet.sui.io:443",
  },
  aptos: {
    type: "aptos-rest",
    endpoint: "https://fullnode.mainnet.aptoslabs.com/v1",
  },
  near: {
    type: "near-rpc",
    endpoint: "https://rpc.mainnet.near.org",
  },
});

function nativeAddressPattern(networkId) {
  switch (networkId) {
    case "solana": return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    case "sui":
    case "aptos":
    case "starknet": return /^0x[0-9a-f]{1,64}$/i;
    case "near": return /^(?:[a-z0-9][a-z0-9._-]{0,63}|0x[0-9a-f]{64})$/i;
    case "tron": return /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
    default: return null;
  }
}

function nativeAddressMessage(networkName) {
  return `Enter a valid native ${networkName} address.`;
}

function validateNativeAddress(address, network) {
  const pattern = nativeAddressPattern(network.id);
  if (!pattern) return { valid: true, normalized: address };
  if (!pattern.test(address)) {
    return {
      valid: false,
      code: "INVALID_ADDRESS",
      message: nativeAddressMessage(network.name),
    };
  }
  return { valid: true, normalized: address };
}

async function requestJson(endpoint, body, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "CA-XRAY/2.0" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== "object") {
      throw Object.assign(new Error("NATIVE_PROVIDER_ERROR"), { code: "NATIVE_PROVIDER_ERROR" });
    }
    return json;
  } catch (error) {
    if (error.name === "AbortError") {
      throw Object.assign(new Error("NATIVE_PROVIDER_TIMEOUT"), { code: "NATIVE_PROVIDER_TIMEOUT" });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyNativeNetwork({ network, address, timeoutMs }) {
  const adapter = ADAPTERS[network.id];
  if (!adapter) {
    throw Object.assign(
      new Error(`Native contract verification is not available for ${network.name}. Check the selected network or use a supported network.`),
      { code: "NATIVE_NETWORK_VERIFICATION_UNAVAILABLE" },
    );
  }

  let exists = false;
  if (adapter.type === "solana-rpc") {
    const body = await requestJson(adapter.endpoint, {
      jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [address, { encoding: "jsonParsed", commitment: "finalized" }],
    }, timeoutMs);
    if (body.error) throw Object.assign(new Error("Solana RPC returned an error."), { code: "NATIVE_PROVIDER_ERROR" });
    const value = body.result?.value;
    exists = Boolean(value && typeof value === "object" && value.owner);
    if (exists && value.data?.parsed?.type === "mint") {
      const info = value.data.parsed.info || {};
      const context = {
        providerId: "solana-native-rpc",
        adapterVersion: NATIVE_ADAPTER_VERSION,
        retrievedAt: new Date().toISOString(),
      };
      const point = (item, evidenceReference) => normalizedPoint({
        value: item,
        ...context,
        evidenceReference,
      });
      var nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: {
          token: {
            decimals: point(Number(info.decimals), "SOL-001"),
            totalSupply: point(info.supply, "SOL-002"),
          },
          verification: {
            nativeAccount: point(true, "SOL-003"),
            tokenProgram: point(value.owner, "SOL-004"),
            initialized: point(info.isInitialized === true, "SOL-005"),
          },
        },
      });
    }
  } else if (adapter.type === "sui-rpc") {
    const body = await requestJson(adapter.endpoint, {
      jsonrpc: "2.0", id: 1, method: "sui_getObject", params: [address, { showType: true, showOwner: true }],
    }, timeoutMs);
    if (body.error) throw Object.assign(new Error("Sui RPC returned an error."), { code: "NATIVE_PROVIDER_ERROR" });
    exists = Boolean(body.result?.data?.objectId && !body.result?.error);
  } else if (adapter.type === "aptos-rest") {
    const response = await fetch(`${adapter.endpoint}/accounts/${encodeURIComponent(address)}/modules?limit=1`, {
      headers: { Accept: "application/json", "User-Agent": "CA-XRAY/2.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await response.json().catch(() => null);
    if (response.status === 404) exists = false;
    else if (!response.ok || !Array.isArray(json)) throw Object.assign(new Error("NATIVE_PROVIDER_ERROR"), { code: "NATIVE_PROVIDER_ERROR" });
    else exists = json.length > 0;
  } else if (adapter.type === "near-rpc") {
    const body = await requestJson(adapter.endpoint, {
      jsonrpc: "2.0", id: "ca-xray", method: "query",
      params: { request_type: "view_account", finality: "final", account_id: address },
    }, timeoutMs);
    if (body.error) throw Object.assign(new Error("NEAR RPC returned an error."), { code: "NATIVE_PROVIDER_ERROR" });
    exists = Boolean(body.result?.amount !== undefined && !body.error);
  }

  if (!exists) {
    throw Object.assign(
      new Error(`No native contract or program account was found at this address on ${network.name}. Check the selected network and address.`),
      { code: "CONTRACT_NOT_DEPLOYED_ON_NETWORK" },
    );
  }
  return {
    adapterVersion: NATIVE_ADAPTER_VERSION,
    networkId: network.id,
    status: "verified",
    result: nativeResult || normalizedResult({
      providerId: `${network.id}-native-rpc`,
      adapterVersion: NATIVE_ADAPTER_VERSION,
      status: PROVIDER_RESULT_STATUS.VALID,
      retrievedAt: new Date().toISOString(),
      evidence: {
        verification: {
          nativeAccount: normalizedPoint({
            value: true,
            providerId: `${network.id}-native-rpc`,
            adapterVersion: NATIVE_ADAPTER_VERSION,
            retrievedAt: new Date().toISOString(),
            evidenceReference: "NATIVE-001",
          }),
        },
      },
    }),
  };
}

module.exports = {
  ADAPTERS,
  NATIVE_ADAPTER_VERSION,
  nativeAddressPattern,
  validateNativeAddress,
  verifyNativeNetwork,
};