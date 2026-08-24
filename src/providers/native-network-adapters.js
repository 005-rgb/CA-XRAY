const NATIVE_ADAPTER_VERSION = "1.1.0";
const { normalizedPoint, normalizedResult, PROVIDER_RESULT_STATUS } = require("./contracts");

const SOLANA_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SOLANA_TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SOLANA_BURN_ADDRESSES = new Set([
  "1nc1nerator11111111111111111111111111111111",
  "11111111111111111111111111111111",
]);

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
  ton: { type: "ton-http", endpoint: "https://toncenter.com/api/v2" },
  tron: { type: "tron-rest", endpoint: "https://api.trongrid.io" },
  xrpl: { type: "xrpl-json-rpc", endpoint: "https://xrplcluster.com" },
  starknet: { type: "starknet-json-rpc", endpoint: "https://rpc.starknet.lava.build" },
  sei: { type: "cosmos-lcd", endpoint: "https://rest.sei-apis.com", prefix: "sei" },
  injective: { type: "cosmos-lcd", endpoint: "https://sentry.lcd.injective.network", prefix: "inj" },
  celestia: { type: "cosmos-lcd", endpoint: "https://api-celestia-01.stakeflow.io", prefix: "celestia" },
  dymension: { type: "cosmos-lcd", endpoint: "https://dymension.api.onfinality.io/rest/public", prefix: "dym" },
  kava: { type: "cosmos-lcd", endpoint: "https://kava-rest.publicnode.com", prefix: "kava" },
  cardano: { type: "cardano-koios", endpoint: "https://api.koios.rest/api/v1" },
});

function nativeAddressPattern(networkId) {
  switch (networkId) {
    case "solana": return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    case "ton": return /^(?:(?:-?1|0):[0-9a-f]{64}|[A-Za-z0-9_-]{48})$/;
    case "xrpl": return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
    case "cardano": return /^addr1[0-9a-z]+$/;
    case "sui":
    case "aptos": return /^0x[0-9a-f]{1,64}$/i;
    case "starknet": return /^0x[0-9a-f]{1,64}$/i;
    case "sei": return /^sei1[0-9a-z]{38,}$/;
    case "injective": return /^inj1[0-9a-z]{38,}$/;
    case "celestia": return /^celestia1[0-9a-z]{38,}$/;
    case "dymension": return /^dym1[0-9a-z]{38,}$/;
    case "kava": return /^kava1[0-9a-z]{38,}$/;
    case "near": return /^(?:[a-z0-9][a-z0-9._-]{0,63}|0x[0-9a-f]{64})$/i;
    case "tron": return /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
    default: return null;
  }
}

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function bech32Polymod(values) {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let index = 0; index < 5; index += 1) {
      if ((top >>> index) & 1) checksum ^= generators[index];
    }
  }
  return checksum >>> 0;
}

function validBech32Address(address, expectedPrefix) {
  const separator = address.lastIndexOf("1");
  if (separator < 1 || separator + 7 > address.length || address !== address.toLowerCase()) return false;
  if (address.slice(0, separator) !== expectedPrefix) return false;
  const data = address.slice(separator + 1);
  const values = [...data].map((character) => BECH32_CHARSET.indexOf(character));
  return values.every((value) => value >= 0) && bech32Polymod([
    ...[...expectedPrefix].map((character) => character.charCodeAt(0) >> 5),
    0,
    ...[...expectedPrefix].map((character) => character.charCodeAt(0) & 31),
    ...values,
  ]) === 1;
}

function nativeEvidence({ context, network, address, fields, accountType = null }) {
  const point = (value, evidenceReference) => normalizedPoint({
    value,
    providerId: context.providerId,
    adapterVersion: context.adapterVersion,
    retrievedAt: context.retrievedAt,
    evidenceReference,
  });
  return {
    verification: {
      nativeAccount: point(true, "NATIVE-001"),
      accountType: point(accountType || "ACCOUNT", "NATIVE-002"),
      explorer: point(`${network.explorer}${encodeURIComponent(address)}`, "NATIVE-003"),
      ...fields(point),
    },
  };
}

function isValidSolanaPublicKey(address) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false;
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  for (const character of address) {
    const value = alphabet.indexOf(character);
    if (value < 0) return false;
    let carry = value;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leadingZeroes = 0;
  for (const character of address) {
    if (character !== "1") break;
    leadingZeroes += 1;
  }
  const decodedLength = bytes.length + leadingZeroes
    - (bytes.length === 1 && bytes[0] === 0 ? 1 : 0);
  return decodedLength === 32;
}

function solanaDataLength(data) {
  if (!Array.isArray(data) || typeof data[0] !== "string") return null;
  if (data[1] === "base64") {
    try {
      return Buffer.from(data[0], "base64").length;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeSolanaHolderAccounts(accounts, totalSupply, context) {
  if (!Array.isArray(accounts)) return null;
  let supply;
  try {
    supply = BigInt(String(totalSupply));
  } catch {
    return null;
  }
  if (supply < 0n) return null;

  const owners = new Map();
  let observedSupply = 0n;
  for (const account of accounts) {
    const info = account?.account?.data?.parsed?.info;
    const owner = typeof info?.owner === "string" ? info.owner : null;
    const rawAmount = info?.tokenAmount?.amount;
    if (!owner || rawAmount === null || rawAmount === undefined) continue;
    let amount;
    try {
      amount = BigInt(String(rawAmount));
    } catch {
      continue;
    }
    if (amount < 0n) continue;
    observedSupply += amount;
    if (amount === 0n || SOLANA_BURN_ADDRESSES.has(owner)) continue;
    owners.set(owner, (owners.get(owner) || 0n) + amount);
  }

  const ranked = [...owners.entries()]
    .map(([address, value]) => ({ address, value }))
    .sort((left, right) => (left.value === right.value
      ? left.address.localeCompare(right.address)
      : left.value > right.value ? -1 : 1));
  const percentage = (value) => supply > 0n ? Number((value * 10000n) / supply) / 100 : null;
  const sumTop = (count) => ranked.slice(0, count).reduce((sum, holder) => sum + holder.value, 0n);
  const discrepancy = observedSupply > supply ? observedSupply - supply : supply - observedSupply;
  const complete = supply === 0n ? observedSupply === 0n : discrepancy * 1000n <= supply;
  const point = (value, evidenceReference) => normalizedPoint({
    value,
    providerId: context.providerId,
    adapterVersion: context.adapterVersion,
    retrievedAt: context.retrievedAt,
    evidenceReference,
  });

  return {
    holders: {
      totalHolders: point(ranked.length, "SOL-H001"),
      top1Percent: point(percentage(sumTop(1)), "SOL-H002"),
      top5Percent: point(percentage(sumTop(5)), "SOL-H003"),
      top10Percent: point(percentage(sumTop(10)), "SOL-H004"),
      holderDataScope: point(
        "Non-zero token accounts aggregated by owner; known burn addresses excluded. Program-owned and liquidity classifications are not inferred.",
        "SOL-H005",
      ),
      distributionCompleteness: point(complete ? "CONSISTENT" : "INCONSISTENT", "SOL-H006"),
      observedAccountSupply: point(String(observedSupply), "SOL-H007"),
    },
    limitations: complete
      ? []
      : ["Solana token-account balances did not reconcile to mint supply within the 0.1% consistency threshold."],
  };
}

async function fetchSolanaHolderEvidence({ endpoint, address, tokenProgram, totalSupply, timeoutMs, context }) {
  const body = await requestJson(endpoint, {
    jsonrpc: "2.0",
    id: 2,
    method: "getProgramAccounts",
    params: [tokenProgram, {
      encoding: "jsonParsed",
      filters: [{ memcmp: { offset: 0, bytes: address } }],
    }],
  }, timeoutMs);
  if (body.error) throw Object.assign(new Error("Solana holder RPC returned an error."), { code: "NATIVE_PROVIDER_ERROR" });
  if (!Object.prototype.hasOwnProperty.call(body, "result")) {
    throw Object.assign(new Error("Solana holder RPC response did not include an account result."), { code: "NATIVE_PROVIDER_MALFORMED_RESPONSE" });
  }
  return normalizeSolanaHolderAccounts(body.result, totalSupply, context);
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
  if (network.id === "solana" && !isValidSolanaPublicKey(address)) {
    return {
      valid: false,
      code: "INVALID_ADDRESS",
      message: nativeAddressMessage(network.name),
    };
  }
  if (["sei", "injective", "celestia", "dymension", "kava"].includes(network.id)
    && !validBech32Address(address, network.addressPrefix)) {
    return { valid: false, code: "INVALID_ADDRESS", message: nativeAddressMessage(network.name) };
  }
  if (network.id === "cardano" && !validBech32Address(address, "addr")) {
    return { valid: false, code: "INVALID_ADDRESS", message: nativeAddressMessage(network.name) };
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

async function requestJsonGet(endpoint, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "CA-XRAY/2.0" },
    });
    const json = await response.json().catch(() => null);
    if (response.status === 404) return { notFound: true };
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
  let nativeResult;
  if (adapter.type === "solana-rpc") {
    const body = await requestJson(adapter.endpoint, {
      jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [address, { encoding: "jsonParsed", commitment: "finalized" }],
    }, timeoutMs);
    if (body.error) throw Object.assign(new Error("Solana RPC returned an error."), { code: "NATIVE_PROVIDER_ERROR" });
    if (!Object.prototype.hasOwnProperty.call(body, "result") || !body.result || typeof body.result !== "object") {
      throw Object.assign(new Error("Solana RPC response did not include an account result."), { code: "NATIVE_PROVIDER_MALFORMED_RESPONSE" });
    }
    const value = body.result?.value;
    exists = Boolean(value && typeof value === "object" && typeof value.owner === "string");
    if (exists) {
      const info = value.data?.parsed?.info || {};
      const isMint = value.data?.parsed?.type === "mint"
        && [SOLANA_TOKEN_PROGRAM, SOLANA_TOKEN_2022_PROGRAM].includes(value.owner);
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
      const limitations = [];
      const evidence = {
        verification: {
          nativeAccount: point(true, "SOL-003"),
          accountOwner: point(value.owner, "SOL-004"),
          executable: point(value.executable === true, "SOL-005"),
          lamports: point(value.lamports, "SOL-006"),
          dataLength: point(solanaDataLength(value.data), "SOL-007"),
          explorer: point(`${network.explorer}${encodeURIComponent(address)}`, "SOL-014"),
        },
      };
      if (isMint) {
        evidence.token = {
          decimals: point(Number(info.decimals), "SOL-001"),
          totalSupply: point(info.supply, "SOL-002"),
          mintAuthority: point(info.mintAuthority || null, "SOL-008"),
          freezeAuthority: point(info.freezeAuthority || null, "SOL-009"),
        };
        evidence.security = {
          canMint: point(Boolean(info.mintAuthority), "SOL-010"),
          canFreeze: point(Boolean(info.freezeAuthority), "SOL-011"),
        };
        evidence.verification.tokenProgram = point(value.owner, "SOL-012");
        evidence.verification.initialized = point(info.isInitialized === true, "SOL-013");
        try {
          const holderEvidence = await fetchSolanaHolderEvidence({
            endpoint: adapter.endpoint,
            address,
            tokenProgram: value.owner,
            totalSupply: info.supply,
            timeoutMs,
            context,
          });
          if (holderEvidence) {
            evidence.holders = holderEvidence.holders;
            limitations.push(...holderEvidence.limitations);
          }
        } catch (error) {
          limitations.push(
            "Solana holder distribution was unavailable; account and mint evidence remain valid.",
            error.code === "NATIVE_PROVIDER_TIMEOUT"
              ? "The Solana holder RPC request timed out."
              : "The Solana holder RPC response was not usable.",
          );
        }
      }
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence,
        limitations,
      });
    }
  } else if (adapter.type === "ton-http") {
    const body = await requestJsonGet(
      `${adapter.endpoint}/getAddressInformation?address=${encodeURIComponent(address)}`,
      timeoutMs,
    );
    const account = body.result;
    exists = body.ok === true && account && typeof account === "object";
    if (exists) {
      const context = { providerId: "ton-native-http", adapterVersion: NATIVE_ADAPTER_VERSION, retrievedAt: new Date().toISOString() };
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: nativeEvidence({
          context, network, address, accountType: "TON_ACCOUNT",
          fields: (point) => ({
            state: point(account.state, "TON-001"),
            balanceNanoTon: point(account.balance, "TON-002"),
            codeHash: point(account.code, "TON-003"),
          }),
        }),
        limitations: ["TON account data is read-only and does not by itself prove token balances or contract source."],
      });
    }
  } else if (adapter.type === "tron-rest") {
    const body = await requestJsonGet(`${adapter.endpoint}/v1/accounts/${encodeURIComponent(address)}`, timeoutMs);
    const account = Array.isArray(body.data) ? body.data[0] : null;
    exists = body.success === true && account && typeof account === "object";
    if (exists) {
      const context = { providerId: "tron-native-rest", adapterVersion: NATIVE_ADAPTER_VERSION, retrievedAt: new Date().toISOString() };
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: nativeEvidence({
          context, network, address, accountType: "TRON_ACCOUNT",
          fields: (point) => ({
            balanceSun: point(account.balance, "TRX-001"),
            accountResource: point(account.account_resource || null, "TRX-002"),
            hasPermissions: point(Array.isArray(account.active_permission) && account.active_permission.length > 0, "TRX-003"),
          }),
        }),
        limitations: ["TRON account evidence does not include contract source verification or complete token-holder distribution."],
      });
    }
  } else if (adapter.type === "xrpl-json-rpc") {
    const body = await requestJson(adapter.endpoint, {
      method: "account_info",
      params: [{ account: address, ledger_index: "validated", strict: true }],
    }, timeoutMs);
    const account = body.result?.account_data;
    if (body.result?.status === "error" || body.error?.error === "actNotFound") {
      exists = false;
    } else {
      exists = Boolean(account && typeof account === "object");
    }
    if (exists) {
      const context = { providerId: "xrpl-native-rpc", adapterVersion: NATIVE_ADAPTER_VERSION, retrievedAt: new Date().toISOString() };
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: nativeEvidence({
          context, network, address, accountType: "XRPL_ACCOUNT_ROOT",
          fields: (point) => ({
            balanceDrops: point(account.Balance, "XRPL-001"),
            sequence: point(account.Sequence, "XRPL-002"),
            ownerCount: point(account.OwnerCount, "XRPL-003"),
            flags: point(account.Flags, "XRPL-004"),
          }),
        }),
        limitations: ["XRPL account root evidence does not include trust-line totals or issuer risk without separate ledger queries."],
      });
    }
  } else if (adapter.type === "starknet-json-rpc") {
    const body = await requestJson(adapter.endpoint, {
      jsonrpc: "2.0", id: 1, method: "starknet_getClassAt",
      params: ["latest", address],
    }, timeoutMs);
    const result = body.result;
    const isNotFound = body.error && [20, "20"].includes(body.error.code);
    exists = !isNotFound && Boolean(result && typeof result === "object");
    if (body.error && !isNotFound) {
      throw Object.assign(new Error("Starknet RPC returned an error."), { code: "NATIVE_PROVIDER_ERROR" });
    }
    if (exists) {
      const context = { providerId: "starknet-native-rpc", adapterVersion: NATIVE_ADAPTER_VERSION, retrievedAt: new Date().toISOString() };
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: nativeEvidence({
          context, network, address, accountType: "STARKNET_CONTRACT",
          fields: (point) => ({
            classHash: point(result.class_hash || result.sierra_class_hash || null, "STRK-001"),
            casmHash: point(result.casm_class_hash || null, "STRK-002"),
          }),
        }),
        limitations: ["Starknet class evidence proves deployed contract state; source verification and token metadata require a separate indexer."],
      });
    }
  } else if (adapter.type === "cosmos-lcd") {
    const body = await requestJsonGet(
      `${adapter.endpoint}/cosmos/auth/v1beta1/accounts/${encodeURIComponent(address)}`,
      timeoutMs,
    );
    const account = body.account;
    exists = !body.notFound && account && typeof account === "object";
    if (exists) {
      const context = { providerId: `${network.id}-native-lcd`, adapterVersion: NATIVE_ADAPTER_VERSION, retrievedAt: new Date().toISOString() };
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: nativeEvidence({
          context, network, address, accountType: "COSMOS_ACCOUNT",
          fields: (point) => ({
            accountType: point(account["@type"] || account.type || null, "COSMOS-001"),
            accountNumber: point(account.account_number, "COSMOS-002"),
            sequence: point(account.sequence, "COSMOS-003"),
            pubkey: point(account.pub_key || null, "COSMOS-004"),
          }),
        }),
        limitations: ["Cosmos account evidence does not include module-specific token balances or contract code."],
      });
    }
  } else if (adapter.type === "cardano-koios") {
    const body = await requestJson(`${adapter.endpoint}/address_info`, [{ address }], timeoutMs);
    const account = Array.isArray(body) ? body[0] : null;
    exists = Boolean(account && typeof account === "object");
    if (exists) {
      const context = { providerId: "cardano-native-koios", adapterVersion: NATIVE_ADAPTER_VERSION, retrievedAt: new Date().toISOString() };
      nativeResult = normalizedResult({
        providerId: context.providerId,
        adapterVersion: context.adapterVersion,
        status: PROVIDER_RESULT_STATUS.VALID,
        retrievedAt: context.retrievedAt,
        evidence: nativeEvidence({
          context, network, address, accountType: "CARDANO_ADDRESS",
          fields: (point) => ({
            stakeAddress: point(account.stake_address || null, "ADA-001"),
            balanceLovelace: point(account.balance, "ADA-002"),
            utxoCount: point(account.utxo_count, "ADA-003"),
          }),
        }),
        limitations: ["Cardano address evidence is read-only; native asset policy and token distribution require separate asset queries."],
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
  isValidSolanaPublicKey,
  solanaDataLength,
  normalizeSolanaHolderAccounts,
  validateNativeAddress,
  verifyNativeNetwork,
};