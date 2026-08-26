const { createHash } = require("node:crypto");
const { NETWORK_PROFILES } = require("./phase0");
const { normalizeAddress, normalizeChainId } = require("./intent");

const PROVENANCE_STATUSES = Object.freeze(["VERIFIED", "PARTIAL", "UNKNOWN", "CONFLICT"]);
const NETWORK_BY_CHAIN_ID = new Map(Object.values(NETWORK_PROFILES).map((profile) => [profile.chainId, profile]));

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

async function rpcRequest(url, method, params, { timeoutMs = 8000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "JOBEN-NETWORK/1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!response.ok) throw Object.assign(new Error(`RPC_HTTP_${response.status}`), { code: "RPC_UNAVAILABLE" });
    const body = await response.json();
    if (!body || body.jsonrpc !== "2.0" || body.error) throw Object.assign(new Error(body?.error?.message || "RPC response was invalid."), { code: "RPC_UNAVAILABLE" });
    return body.result;
  } catch (error) {
    if (error.name === "AbortError") throw Object.assign(new Error("RPC_TIMEOUT"), { code: "RPC_UNAVAILABLE" });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function profileForNetwork(networkId, chainId) {
  const profile = NETWORK_PROFILES[networkId];
  if (!profile || profile.chainId !== normalizeChainId(chainId)) {
    return { profile: profile || null, reasonCodes: ["TARGET_CHAIN_MISMATCH"] };
  }
  return { profile, reasonCodes: [] };
}

async function collectDeploymentEvidence({
  networkId,
  chainId,
  address,
  now = new Date(),
  fetchImpl = fetch,
  reader = null,
} = {}) {
  const retrievedAt = new Date(now).toISOString();
  let normalizedAddress;
  try {
    normalizedAddress = normalizeAddress(address, "target");
  } catch {
    return {
      status: "UNKNOWN",
      deploymentStatus: "INVALID_TARGET",
      reasonCodes: ["TARGET_NOT_DEPLOYED"],
      target: address || null,
      chainId: Number(chainId) || null,
      retrievedAt,
      evidenceHash: hash({ status: "INVALID_TARGET", address, chainId }),
      limitations: ["Target address is not a valid EVM address."],
    };
  }
  const { profile, reasonCodes } = profileForNetwork(networkId, chainId);
  if (!profile) {
    return {
      status: "UNKNOWN",
      deploymentStatus: "CHAIN_PROFILE_UNAVAILABLE",
      reasonCodes,
      target: normalizedAddress,
      chainId: Number(chainId) || null,
      retrievedAt,
      evidenceHash: hash({ status: "CHAIN_PROFILE_UNAVAILABLE", target: normalizedAddress, chainId }),
      limitations: ["The selected network is not one of the locked Arbitrum profiles."],
    };
  }

  try {
    const read = reader || (async (method, params) => rpcRequest(profile.rpcUrl, method, params, { fetchImpl }));
    const chainHex = await read("eth_chainId", []);
    const observedChainId = Number(BigInt(chainHex));
    const blockHex = await read("eth_blockNumber", []);
    const blockNumber = Number(BigInt(blockHex));
    const code = await read("eth_getCode", [normalizedAddress, "latest"]);
    if (observedChainId !== profile.chainId) {
      return {
        status: "CONFLICT",
        deploymentStatus: "CHAIN_MISMATCH",
        reasonCodes: ["TARGET_CHAIN_MISMATCH"],
        target: normalizedAddress,
        selectedChainId: profile.chainId,
        observedChainId,
        blockNumber,
        retrievedAt,
        evidenceHash: hash({ status: "CHAIN_MISMATCH", target: normalizedAddress, selectedChainId: profile.chainId, observedChainId, blockNumber }),
        limitations: ["RPC chain ID differs from the selected network profile."],
      };
    }
    const deployed = typeof code === "string" && /^0x[0-9a-f]+$/i.test(code) && code.length > 2;
    const deploymentStatus = deployed ? "DEPLOYED" : "NOT_DEPLOYED";
    return {
      status: deployed ? "VERIFIED" : "UNKNOWN",
      deploymentStatus,
      reasonCodes: deployed ? [] : ["TARGET_NOT_DEPLOYED"],
      target: normalizedAddress,
      selectedChainId: profile.chainId,
      observedChainId,
      blockNumber,
      bytecodeLength: deployed ? (code.length - 2) / 2 : 0,
      retrievedAt,
      provider: "arbitrum-json-rpc",
      evidenceHash: hash({ status: deploymentStatus, target: normalizedAddress, selectedChainId: profile.chainId, observedChainId, blockNumber, code }),
      limitations: deployed ? [] : ["No deployed bytecode exists at the target on the selected chain."],
    };
  } catch (error) {
    return {
      status: "UNAVAILABLE",
      deploymentStatus: "RPC_UNAVAILABLE",
      reasonCodes: [],
      target: normalizedAddress,
      selectedChainId: profile.chainId,
      retrievedAt,
      provider: "arbitrum-json-rpc",
      evidenceHash: hash({ status: "RPC_UNAVAILABLE", target: normalizedAddress, selectedChainId: profile.chainId, retrievedAt }),
      limitations: ["Chain evidence request failed; no synthetic deployment result was substituted."],
      errorCode: error.code || "RPC_UNAVAILABLE",
    };
  }
}

function normalizeProvenanceEdge(edge = {}) {
  const status = String(edge.status || "UNKNOWN").toUpperCase();
  if (!PROVENANCE_STATUSES.includes(status)) throw Object.assign(new TypeError("Invalid provenance status."), { code: "INVALID_PROVENANCE" });
  const edgeClass = String(edge.classification || edge.edgeClass || "").toUpperCase();
  if (!["CONFIGURED", "DIRECTLY_OBSERVED", "EXPLICITLY_INFERRED"].includes(edgeClass)) {
    throw Object.assign(new TypeError("Provenance edge classification must be explicit."), { code: "INVALID_PROVENANCE" });
  }
  if (!edge.from || !edge.to || !edge.from.networkId || !edge.to.networkId) {
    throw Object.assign(new TypeError("Provenance edge requires from/to network identity."), { code: "INVALID_PROVENANCE" });
  }
  const normalized = {
    edgeId: String(edge.edgeId || `edge_${hash(edge).slice(0, 20)}`),
    from: {
      networkId: String(edge.from.networkId),
      address: normalizeAddress(edge.from.address, "from.address"),
    },
    to: {
      networkId: String(edge.to.networkId),
      address: normalizeAddress(edge.to.address, "to.address"),
    },
    relationship: String(edge.relationship || "BRIDGED_REPRESENTATION"),
    status,
    classification: edgeClass,
    source: String(edge.source || "configured_canonical_bridge_adapter"),
    observedAt: edge.observedAt ? new Date(edge.observedAt).toISOString() : null,
    evidenceRefs: Array.isArray(edge.evidenceRefs) ? edge.evidenceRefs.map(String).slice(0, 20) : [],
    confidence: edge.confidence || null,
    limitation: edge.limitation || (status === "VERIFIED" ? null : "Relationship is not fully verified."),
  };
  normalized.evidenceHash = hash(normalized);
  return Object.freeze(normalized);
}

function unknownProvenance({ networkId, address, limitation = "No configured canonical origin/bridge path is available." } = {}) {
  const target = normalizeAddress(address, "address");
  return {
    status: "UNKNOWN",
    reasonCodes: ["ORIGIN_UNKNOWN"],
    edges: [],
    subject: { networkId, address: target },
    evidenceHash: hash({ status: "UNKNOWN", networkId, address: target }),
    limitation,
  };
}

module.exports = {
  PROVENANCE_STATUSES,
  NETWORK_BY_CHAIN_ID,
  hash,
  rpcRequest,
  collectDeploymentEvidence,
  normalizeProvenanceEdge,
  unknownProvenance,
};