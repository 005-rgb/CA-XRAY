const {
  assertControlledProviderUrl,
  CONTROLLED_PROVIDER_ORIGINS,
  createProviderRegistry,
} = require("./registry");
const { CircuitBreaker, withProviderPolicy } = require("../security/controls");
const {
  normalizedPoint,
  unverifiedSignalPoint,
  normalizedResult,
  PROVIDER_RESULT_STATUS,
} = require("./contracts");

const ADAPTER_VERSION = "1.0.0";
const BLOCKSCOUT_ADAPTER_VERSION = "1.0.0";

function isProviderObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function providerValue(data, key) {
  if (!Object.prototype.hasOwnProperty.call(data || {}, key)) return null;
  const raw = data[key];
  if (raw === "" || raw === null || raw === undefined) return null;
  return raw;
}

function providerBoolean(data, key) {
  const raw = providerValue(data, key);
  if (raw === null) return null;
  const normalized = String(raw).toLowerCase();
  if (raw === true || raw === 1 || normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (raw === false || raw === 0 || normalized === "0" || normalized === "false" || normalized === "no") return false;
  return null;
}

function parseTax(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return parsed <= 1 ? parsed * 100 : parsed;
}

function makePoint(value, context, evidenceReference = null, transform = null) {
  const transformed = transform ? transform(value) : value;
  return normalizedPoint({
    value: transformed,
    providerId: context.providerId,
    adapterVersion: ADAPTER_VERSION,
    retrievedAt: context.retrievedAt,
    evidenceReference,
  });
}

function makeCapabilityPoint(value, context, evidenceReference, verified = false) {
  if (value === true && !verified) {
    return unverifiedSignalPoint({
      value,
      providerId: context.providerId,
      adapterVersion: ADAPTER_VERSION,
      retrievedAt: context.retrievedAt,
      evidenceReference,
    });
  }
  return makePoint(value, context, evidenceReference);
}

async function fetchJson(url, provider, timeout = 12_000, retries = 1) {
  assertControlledProviderUrl(url, CONTROLLED_PROVIDER_ORIGINS);
  if (!fetchJson.breakers) fetchJson.breakers = new Map();
  if (!fetchJson.breakers.has(provider)) fetchJson.breakers.set(provider, new CircuitBreaker());
  return withProviderPolicy(async ({ signal }) => {
    const retrievedAt = new Date().toISOString();
    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json", "User-Agent": "CA-XRAY/2.0" },
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw Object.assign(new Error("MALFORMED_RESPONSE"), {
        code: "MALFORMED_RESPONSE",
        provider,
        status: response.status,
      });
    }
    if (!response.ok) {
      throw Object.assign(new Error(`HTTP_${response.status}`), {
        code: response.status === 429 ? "RATE_LIMIT" : `HTTP_${response.status}`,
        provider,
        status: response.status,
      });
    }
    return { json, retrievedAt };
  }, {
    provider,
    breaker: fetchJson.breakers.get(provider),
    timeoutMs: timeout,
    retries,
  });
}

async function fetchRpc(url, provider, address, timeout = 12_000, retries = 1) {
  assertControlledProviderUrl(url, CONTROLLED_PROVIDER_ORIGINS);
  if (!fetchRpc.breakers) fetchRpc.breakers = new Map();
  if (!fetchRpc.breakers.has(provider)) fetchRpc.breakers.set(provider, new CircuitBreaker());
  return withProviderPolicy(async ({ signal }) => {
    const retrievedAt = new Date().toISOString();
    const response = await fetch(url, {
      method: "POST", signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "CA-XRAY/2.0" },
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: address, data: "0x8da5cb5b" }, "latest"] },
        { jsonrpc: "2.0", id: 2, method: "eth_getStorageAt", params: [address, "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103", "latest"] },
      ]),
    });
    const json = await response.json();
    if (!response.ok || !Array.isArray(json) || json.some((item) => !isProviderObject(item) || item.jsonrpc !== "2.0")) {
      throw Object.assign(new Error("MALFORMED_RESPONSE"), { code: "MALFORMED_RESPONSE", provider });
    }
    return { json: { owner: json.find((item) => item.id === 1), admin: json.find((item) => item.id === 2) }, retrievedAt };
  }, { provider, breaker: fetchRpc.breakers.get(provider), timeoutMs: timeout, retries });
}

async function fetchOptionalJson(url, provider, timeout = 12_000, retries = 1) {
  try {
    return await fetchJson(url, provider, timeout, retries);
  } catch (error) {
    return { json: null, retrievedAt: null, error };
  }
}

function abiFunctionNames(abi) {
  return new Set((Array.isArray(abi) ? abi : [])
    .filter((item) => item && item.type === "function" && typeof item.name === "string")
    .map((item) => item.name.toLowerCase()));
}

function decodeAddress(value) {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value)) return null;
  return `0x${value.slice(-40)}`;
}

function normalizeHolderData({ tokenResponse, holdersResponse, retrievedAt, providerId }) {
  if (!isProviderObject(tokenResponse) || !isProviderObject(holdersResponse)) return {};
  const items = Array.isArray(holdersResponse.items) ? holdersResponse.items : [];
  const totalSupplyRaw = tokenResponse.total_supply ?? tokenResponse.totalSupply;
  let totalSupply;
  try {
    totalSupply = BigInt(String(totalSupplyRaw));
  } catch {
    return {};
  }
  if (totalSupply <= 0n) return {};
  const burnAddresses = new Set([
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
  ]);
  const holders = items.map((item) => {
    const address = String(item.address_hash || item.address?.hash || "").toLowerCase();
    const rawValue = item.value ?? item.token_balance ?? item.balance;
    let value;
    try { value = BigInt(String(rawValue)); } catch { value = 0n; }
    const isContract = item.address?.is_contract === true
      || item.address?.is_contract === "true"
      || item.address_type === "contract";
    return { address, value, isContract, isBurn: burnAddresses.has(address) };
  }).filter((item) => item.address && item.value >= 0n);
  const walletHolders = holders.filter((holder) => !holder.isContract && !holder.isBurn).sort((a, b) => (a.value === b.value ? a.address.localeCompare(b.address) : a.value > b.value ? -1 : 1));
  const percentage = (value) => Number((value * 10000n) / totalSupply) / 100;
  const sumTop = (count) => walletHolders.slice(0, count).reduce((sum, holder) => sum + holder.value, 0n);
  const contractHolding = holders.filter((holder) => holder.isContract).reduce((sum, holder) => sum + holder.value, 0n);
  const count = Number(holdersResponse.total_items ?? holdersResponse.total_count ?? tokenResponse.holders_count);
  const totalHolders = Number.isFinite(count) && count >= 0 ? count : null;
  const context = { providerId, retrievedAt };
  const q = (value, ref) => makePoint(value, context, ref);
  return {
    holders: {
      totalHolders: q(totalHolders, "BS-020"),
      top1Percent: q(percentage(sumTop(1)), "BS-021"),
      top5Percent: q(percentage(sumTop(5)), "BS-022"),
      top10Percent: q(percentage(sumTop(10)), "BS-023"),
      liquidityRelatedAddresses: q(percentage(contractHolding), "BS-024"),
      holderDataScope: q("Non-burn, non-contract addresses; contract-held balances are reported separately.", "BS-025"),
    },
  };
}

function normalizeBlockscout({ response, tokenResponse, holdersResponse, rpcResponse, retrievedAt, network, providerId }) {
  if (!isProviderObject(response)) {
    return normalizedResult({ providerId, adapterVersion: BLOCKSCOUT_ADAPTER_VERSION, status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR, retrievedAt, errorCode: "MALFORMED_RESPONSE", message: "Block explorer response failed schema validation." });
  }
  const verified = response.is_verified === true || response.is_verified === "true";
  const abi = Array.isArray(response.abi) ? response.abi : [];
  if (!verified || !abi.length) {
    return normalizedResult({
      providerId, adapterVersion: BLOCKSCOUT_ADAPTER_VERSION, status: PROVIDER_RESULT_STATUS.UNAVAILABLE, retrievedAt,
      errorCode: "SOURCE_NOT_VERIFIED", message: "No verified ABI was returned by the block explorer.",
      limitations: ["Capability confirmation requires a verified ABI; no verified ABI was available."],
      evidence: { verification: { sourceCode: makePoint(false, { providerId, retrievedAt }, "BS-001") } },
    });
  }
  const names = abiFunctionNames(abi);
  const has = (name) => names.has(name);
  const ownerAddress = decodeAddress(rpcResponse?.owner?.result);
  const rawAdminSlot = rpcResponse?.admin?.result;
  const adminSlot = /^0x0{64}$/i.test(rawAdminSlot || "") ? null : rawAdminSlot || null;
  const context = { providerId, retrievedAt };
  const q = (value, ref) => makePoint(value, context, ref);
  const limitations = [];
  if (!ownerAddress) limitations.push("owner() did not return a decodable address from the public RPC.");
  const holderEvidence = normalizeHolderData({ tokenResponse, holdersResponse, retrievedAt, providerId });
  if (!holderEvidence.holders?.totalHolders?.value) {
    limitations.push("Holder count was not available from the shared block explorer source.");
  }
  const creatorAddress = response.creator_address_hash || response.creator_address?.hash || response.creator?.address_hash || null;
  return normalizedResult({
    providerId, adapterVersion: BLOCKSCOUT_ADAPTER_VERSION, status: PROVIDER_RESULT_STATUS.VALID, retrievedAt,
    limitations,
    evidence: {
      security: {
        ownerAddress: q(ownerAddress, "BS-017"),
        ownerControl: q(ownerAddress ? (/^0x0{40}$/i.test(ownerAddress) ? "RENOUNCED" : "ACTIVE") : null, "BS-018"),
        proxyAdminActive: q(Boolean(adminSlot), "BS-003"),
        adminControlFullyRemoved: q(adminSlot ? false : null, "BS-003"),
      },
      deployer: {
        address: q(creatorAddress, "BS-026"),
      },
      ...holderEvidence,
      verification: {
        sourceCode: q(true, "BS-001"),
        verifiedAbi: q([...names], "BS-002"),
        adminSlot: q(adminSlot, "BS-003"),
      },
    },
  });
}

function normalizeGoPlus({ response, retrievedAt, network, providerId, verifiedCapabilities = {} }) {
  const sourceContext = { providerId, retrievedAt };
  if (!isProviderObject(response) || ![1, "1"].includes(response.code) || !isProviderObject(response.result)) {
    return normalizedResult({
      providerId,
      adapterVersion: ADAPTER_VERSION,
      status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR,
      retrievedAt,
      errorCode: "MALFORMED_RESPONSE",
      message: "Provider response failed schema validation.",
    });
  }
  const key = Object.keys(response.result)[0];
  const data = key ? response.result[key] : null;
  if (!isProviderObject(data)) {
    return normalizedResult({
      providerId,
      adapterVersion: ADAPTER_VERSION,
      status: PROVIDER_RESULT_STATUS.UNAVAILABLE,
      retrievedAt,
      errorCode: "CONTRACT_NOT_FOUND",
      message: "No record was returned for this contract.",
      limitations: ["The provider returned no record for the requested contract."],
    });
  }
  const boolMap = {
    canMint: "is_mintable",
    canBlacklist: "is_blacklisted",
    canWhitelist: "is_whitelisted",
    canPause: "transfer_pausable",
    canChangeTax: "slippage_modifiable",
    isUpgradeable: "is_proxy",
    canWithdraw: "can_take_back_ownership",
  };
  const security = Object.fromEntries(Object.entries(boolMap).map(([name, keyName], index) => [
    name,
     makeCapabilityPoint(providerBoolean(data, keyName), sourceContext, `GP-${String(index + 1).padStart(3, "0")}`, verifiedCapabilities[name] === true),
  ]));
  const explicitTaxChange = providerBoolean(data, "can_set_tax");
  security.canChangeTax = explicitTaxChange === null
    ? security.canChangeTax
    : makePoint(explicitTaxChange, sourceContext, "GP-008");
  const ownerAddress = providerValue(data, "owner_address");
  security.ownerAddress = makePoint(ownerAddress, sourceContext, "GP-009");
  security.ownerControl = makePoint(
    ownerAddress ? (/^0x0{40}$/i.test(String(ownerAddress)) ? "RENOUNCED" : "ACTIVE") : null,
    sourceContext,
    "GP-010",
  );
  security.sourceVerified = makePoint(providerBoolean(data, "is_open_source"), sourceContext, "GP-011");

  const trading = {
    buyTax: makePoint(providerValue(data, "buy_tax"), sourceContext, "GP-012", parseTax),
    sellTax: makePoint(providerValue(data, "sell_tax"), sourceContext, "GP-013", parseTax),
    transferTax: makePoint(providerValue(data, "transfer_tax"), sourceContext, "GP-014", parseTax),
    sellRestriction: makePoint(providerBoolean(data, "cannot_sell_all"), sourceContext, "GP-015"),
    buyRestriction: makePoint(providerBoolean(data, "cannot_buy"), sourceContext, "GP-016"),
    maliciousTradingSignal: makePoint(providerBoolean(data, "is_honeypot"), sourceContext, "GP-017"),
    taxChangeable: security.canChangeTax,
    maxTransactionRestriction: makeCapabilityPoint(providerBoolean(data, "anti_whale_modifiable"), sourceContext, "GP-018", verifiedCapabilities.maxTransactionRestriction === true),
    maxWalletRestriction: makeCapabilityPoint(providerBoolean(data, "anti_whale_modifiable"), sourceContext, "GP-019", verifiedCapabilities.maxWalletRestriction === true),
    tradingPause: security.canPause,
    hasPair: makePoint(null, sourceContext, "GP-020"),
  };
  const token = {
    name: makePoint(providerValue(data, "token_name"), sourceContext, "GP-021"),
    symbol: makePoint(providerValue(data, "token_symbol"), sourceContext, "GP-022"),
    decimals: makePoint(providerValue(data, "decimals"), sourceContext, "GP-023"),
    totalSupply: makePoint(providerValue(data, "total_supply"), sourceContext, "GP-024"),
  };
  return normalizedResult({
    providerId,
    adapterVersion: ADAPTER_VERSION,
    status: PROVIDER_RESULT_STATUS.VALID,
    retrievedAt,
    evidence: {
      security,
      trading,
      token,
      verification: { sourceCode: security.sourceVerified },
    },
  });
}

function choosePrimaryPair(pairs) {
  return [...pairs].sort((a, b) => {
    const liquidityDiff = Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0);
    if (liquidityDiff) return liquidityDiff;
    const volumeDiff = Number(b.volume?.h24 || 0) - Number(a.volume?.h24 || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.pairAddress || "").localeCompare(String(b.pairAddress || ""));
  })[0] || null;
}

function normalizeDexScreener({ response, retrievedAt, network, address, providerId }) {
  if (!isProviderObject(response) || (response.pairs !== null && !Array.isArray(response.pairs))) {
    return normalizedResult({
      providerId,
      adapterVersion: ADAPTER_VERSION,
      status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR,
      retrievedAt,
      errorCode: "MALFORMED_RESPONSE",
      message: "Provider response failed schema validation.",
    });
  }
  const pairs = (response.pairs || []).filter((pair) => pair
    && pair.chainId === network.dexChainId
    && (pair.baseToken?.address?.toLowerCase() === address.toLowerCase()
      || pair.quoteToken?.address?.toLowerCase() === address.toLowerCase()));
  const pair = choosePrimaryPair(pairs);
  if (!pair) {
    return normalizedResult({
      providerId,
      adapterVersion: ADAPTER_VERSION,
      status: PROVIDER_RESULT_STATUS.UNAVAILABLE,
      retrievedAt,
      errorCode: "PAIR_NOT_FOUND",
      message: "No supported-network pair was returned for this contract.",
      limitations: ["No supported-network market pair was returned."],
    });
  }
  const context = { providerId, retrievedAt };
  const q = (value, evidenceReference) => makePoint(value, context, evidenceReference);
  const liquidity = {
    liquidityUsd: q(pair.liquidity?.usd, "DS-001"),
    volume24h: q(pair.volume?.h24, "DS-002"),
    pair: q(pair.pairAddress, "DS-003"),
    dex: q(pair.dexId, "DS-004"),
    price: q(pair.priceUsd, "DS-005"),
    change24h: q(pair.priceChange?.h24, "DS-006"),
    primaryPairRule: "Highest USD liquidity, then 24h volume, then lexicographic pair address.",
  };
  const market = {
    price: liquidity.price,
    volume24h: liquidity.volume24h,
    liquidityUsd: liquidity.liquidityUsd,
    fdv: q(pair.fdv, "DS-007"),
    change24h: liquidity.change24h,
    change7d: q(null, "DS-008"),
  };
  const info = isProviderObject(pair.info) ? pair.info : {};
  const websites = Array.isArray(info.websites) ? info.websites : [];
  const socials = Array.isArray(info.socials) ? info.socials : [];
  const website = websites.find((item) => typeof item === "string") || websites.find((item) => item?.url)?.url || null;
  const socialLinks = socials.map((item) => typeof item === "string" ? item : item?.url || item?.handle).filter(Boolean);
  const pairTimestamp = Number(pair.pairCreatedAt);
  const pairAge = Number.isFinite(pairTimestamp) ? new Date(pairTimestamp).toISOString() : null;
  return normalizedResult({
    providerId,
    adapterVersion: ADAPTER_VERSION,
    status: PROVIDER_RESULT_STATUS.VALID,
    retrievedAt,
    evidence: {
      liquidity: {
        ...liquidity,
        pairAge: q(pairAge, "DS-012"),
      },
      market,
      project: {
        website: q(website, "DS-010"),
        socials: q(socialLinks.length ? socialLinks : null, "DS-011"),
      },
      trading: { hasPair: q(true, "DS-009") },
      token: {
        name: q(pair.baseToken?.name, "DS-013"),
        symbol: q(pair.baseToken?.symbol, "DS-014"),
      },
    },
  });
}

function createDefaultProviderRegistry(options = {}) {
  return createProviderRegistry([
    {
      id: "goplus-security",
      source: "GoPlus Security API",
      version: ADAPTER_VERSION,
      capabilities: Object.freeze(["contract-security", "token-metadata"]),
      validateResponse: (response) =>
        isProviderObject(response) && [1, "1"].includes(response.code) && isProviderObject(response.result)
          ? true
          : { code: "MALFORMED_RESPONSE", message: "Provider response failed schema validation." },
      fetch: ({ address, network, providerPolicy = {} }) => {
        const url = `https://api.gopluslabs.io/api/v1/token_security/${network.goplusChainId}?contract_addresses=${encodeURIComponent(address)}`;
        return fetchJson(url, "GoPlus Security API", providerPolicy.timeoutMs, providerPolicy.retries);
      },
      normalizeResponse: ({ response, retrievedAt, network, providerId }) =>
        normalizeGoPlus({ response, retrievedAt, network, providerId }),
    },
    {
      id: "dexscreener",
      source: "DexScreener API",
      version: ADAPTER_VERSION,
      capabilities: Object.freeze(["market-pairs", "liquidity"]),
      validateResponse: (response) =>
        isProviderObject(response) && (response.pairs === null || Array.isArray(response.pairs))
          ? true
          : { code: "MALFORMED_RESPONSE", message: "Provider response failed schema validation." },
      fetch: ({ address, providerPolicy = {} }) => {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
        return fetchJson(url, "DexScreener API", providerPolicy.timeoutMs, providerPolicy.retries);
      },
      normalizeResponse: ({ response, retrievedAt, network, address, providerId }) =>
        normalizeDexScreener({ response, retrievedAt, network, address, providerId }),
    },
    {
      id: "blockscout-abi",
      source: "Blockscout verified ABI + public JSON-RPC",
      version: BLOCKSCOUT_ADAPTER_VERSION,
      capabilities: Object.freeze(["verified-abi", "ownership", "proxy-admin"]),
      validateResponse: (response) =>
        isProviderObject(response) && isProviderObject(response.explorer) && isProviderObject(response.rpc)
          ? true
          : { code: "MALFORMED_RESPONSE", message: "Block explorer response failed schema validation." },
      fetch: async ({ address, network, providerPolicy = {} }) => {
        const explorer = await fetchJson(
          `https://${network.blockscoutHost}/api/v2/smart-contracts/${encodeURIComponent(address)}`,
          "Blockscout ABI",
          providerPolicy.timeoutMs,
          providerPolicy.retries,
        );
        const [rpc, token, holders] = await Promise.all([
          fetchRpc(network.rpcUrl, "Public JSON-RPC", address, providerPolicy.timeoutMs, providerPolicy.retries),
          fetchOptionalJson(`https://${network.blockscoutHost}/api/v2/tokens/${encodeURIComponent(address)}`, "Blockscout token metadata", providerPolicy.timeoutMs, providerPolicy.retries),
          fetchOptionalJson(`https://${network.blockscoutHost}/api/v2/tokens/${encodeURIComponent(address)}/holders`, "Blockscout token holders", providerPolicy.timeoutMs, providerPolicy.retries),
        ]);
        return {
          json: { explorer: explorer.json, rpc: rpc.json, token: token.json, holders: holders.json },
          retrievedAt: explorer.retrievedAt,
        };
      },
      normalizeResponse: ({ response, retrievedAt, network, providerId }) =>
        normalizeBlockscout({
          response: response.explorer,
          tokenResponse: response.token,
          holdersResponse: response.holders,
          rpcResponse: response.rpc,
          retrievedAt,
          network,
          providerId,
        }),
    },
  ], options);
}

module.exports = {
  ADAPTER_VERSION,
  createDefaultProviderRegistry,
  normalizeDexScreener,
  normalizeGoPlus,
  normalizeBlockscout,
};