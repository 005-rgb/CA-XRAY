const {
  DECISION_STATUS,
  REASON_CODES,
  SELECTOR_MATRIX,
  getPolicy,
  resolveSelector,
} = require("./phase0");

const MAX_UINT256 = (1n << 256n) - 1n;
const MAX_CALLDATA_BYTES = 64 * 1024;
const HEX = /^0x[0-9a-f]+$/i;
const ADDRESS = /^0x[0-9a-f]{40}$/i;
const INTEGER = /^(?:0|[1-9][0-9]*)$/;
const HEX_INTEGER = /^0x[0-9a-f]+$/i;
const ACTIONS = Object.freeze([
  "DEPOSIT",
  "TRANSFER",
  "APPROVE",
  "TRANSFER_FROM",
  "PERMIT",
  "SET_APPROVAL_FOR_ALL",
]);

function fail(code, message) {
  const error = new TypeError(message || code);
  error.code = code;
  throw error;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeAddress(value, field) {
  if (typeof value !== "string" || !ADDRESS.test(value)) fail("INVALID_ADDRESS", `${field} must be a 20-byte EVM address.`);
  return value.toLowerCase();
}

function normalizeChainId(value, field = "chainId") {
  const numeric = typeof value === "number" ? value : Number(String(value || ""));
  if (!Number.isSafeInteger(numeric) || numeric <= 0) fail("INVALID_CHAIN_ID", `${field} must be a positive integer.`);
  return numeric;
}

function normalizeInteger(value, field, { nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  if (typeof value === "bigint") return value.toString();
  const text = String(value ?? "");
  if (!INTEGER.test(text) && !HEX_INTEGER.test(text)) fail("INVALID_INTEGER", `${field} must be a non-negative integer string.`);
  try {
    return BigInt(text).toString();
  } catch {
    fail("INVALID_INTEGER", `${field} must be a non-negative integer string.`);
  }
}

function normalizeId(value, field, max = 128) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._:-]{1,128}$/.test(value) || value.length > max) {
    fail("INVALID_IDENTIFIER", `${field} must be a bounded identifier.`);
  }
  return value;
}

function normalizeHexData(value) {
  if (typeof value !== "string" || (value !== "0x" && !HEX.test(value)) || (value.length - 2) % 2 !== 0) {
    fail("INVALID_CALLDATA", "data must be an even-length 0x-prefixed hex string.");
  }
  if ((value.length - 2) / 2 > MAX_CALLDATA_BYTES) fail("CALLDATA_TOO_LARGE", "data exceeds the calldata size limit.");
  return value.toLowerCase();
}

function normalizeAsset(value) {
  if (typeof value === "string") {
    if (ADDRESS.test(value)) return { address: value.toLowerCase(), symbol: null };
    if (/^[a-zA-Z0-9._-]{1,32}$/.test(value)) return { address: null, symbol: value.toUpperCase() };
    fail("INVALID_ASSET", "asset must be an address or bounded symbol.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_ASSET", "asset is required.");
  const address = value.address ? normalizeAddress(value.address, "asset.address") : null;
  const symbol = value.symbol ? String(value.symbol).trim().toUpperCase() : null;
  if (!address && (!symbol || !/^[A-Z0-9._-]{1,32}$/.test(symbol))) fail("INVALID_ASSET", "asset requires an address or bounded symbol.");
  return { address, symbol };
}

function normalizeIntent(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_INTENT", "intent must be an object.");
  const declaredAction = String(input.declaredAction || "").trim().toUpperCase();
  if (!ACTIONS.includes(declaredAction)) fail("INVALID_DECLARED_ACTION", "declaredAction is outside the supported action matrix.");
  if (typeof input.actorType !== "string" || !/^[A-Z0-9_-]{1,48}$/i.test(input.actorType)) fail("INVALID_ACTOR_TYPE", "actorType is required.");
  const actorId = normalizeId(input.actorId, "actorId", 128);
  const intent = {
    schemaVersion: "1.0.0",
    intentId: normalizeId(input.intentId, "intentId"),
    actorType: input.actorType.toUpperCase(),
    actorId,
    chainId: normalizeChainId(input.chainId),
    sender: normalizeAddress(input.sender, "sender"),
    declaredAction,
    asset: normalizeAsset(input.asset),
    amount: normalizeInteger(input.amount, "amount"),
    destination: normalizeAddress(input.destination, "destination"),
    expectedSpender: input.expectedSpender ? normalizeAddress(input.expectedSpender, "expectedSpender") : null,
    maxApproval: normalizeInteger(input.maxApproval, "maxApproval", { nullable: true }),
    policyId: normalizeId(input.policyId, "policyId", 64),
    policyVersion: normalizeId(input.policyVersion, "policyVersion", 32),
  };
  getPolicy(intent.policyId, intent.policyVersion);
  return Object.freeze(intent);
}

function normalizeTransaction(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_TRANSACTION", "unsignedTransaction must be an object.");
  const capturedAt = input.capturedAt || new Date().toISOString();
  if (!Number.isFinite(Date.parse(capturedAt))) fail("INVALID_TIMESTAMP", "capturedAt must be an ISO date.");
  const transaction = {
    schemaVersion: "1.0.0",
    transactionId: normalizeId(input.transactionId, "transactionId"),
    chainId: normalizeChainId(input.chainId),
    from: normalizeAddress(input.from, "from"),
    to: normalizeAddress(input.to, "to"),
    value: normalizeInteger(input.value, "value"),
    data: normalizeHexData(input.data),
    gasLimit: normalizeInteger(input.gasLimit, "gasLimit"),
    nonce: normalizeInteger(input.nonce, "nonce", { nullable: true }),
    capturedAt: new Date(capturedAt).toISOString(),
    targetStandard: input.targetStandard ? String(input.targetStandard).trim().toUpperCase() : null,
  };
  return Object.freeze(transaction);
}

function wordAt(data, index) {
  const start = 10 + index * 64;
  const word = data.slice(start, start + 64);
  return word.length === 64 ? word : null;
}

function decodeUint(word, field) {
  if (!word || !/^[0-9a-f]{64}$/i.test(word)) fail("INTENT_DECODE_UNAVAILABLE", `Calldata word ${field} is malformed.`);
  return BigInt(`0x${word}`).toString();
}

function decodeAddressWord(word, field) {
  if (!word || !/^[0-9a-f]{24}[0-9a-f]{40}$/i.test(word)) fail("INTENT_DECODE_UNAVAILABLE", `Calldata address ${field} is malformed.`);
  return `0x${word.slice(-40)}`.toLowerCase();
}

function decodeBool(word, field) {
  const value = decodeUint(word, field);
  if (value !== "0" && value !== "1") fail("INTENT_DECODE_UNAVAILABLE", `Calldata boolean ${field} is malformed.`);
  return value === "1";
}

function selectorFromData(data) {
  return data.slice(0, 10).toLowerCase();
}

function decodeCalldata(data, { targetStandard = null } = {}) {
  const normalized = normalizeHexData(data);
  if (normalized.length < 10) {
    return {
      selector: normalized === "0x" ? "0x" : selectorFromData(normalized),
      operation: null,
      operationCandidates: [],
      status: "UNAVAILABLE",
      reasonCodes: ["INTENT_DECODE_UNAVAILABLE"],
      limitation: "Calldata does not contain a complete four-byte selector.",
    };
  }
  const selector = selectorFromData(normalized);
  const resolved = resolveSelector(selector, { targetStandard });
  if (resolved.status !== "VERIFIED") return { ...resolved, arguments: [] };
  const entry = SELECTOR_MATRIX.find((item) => item.selector === selector);
  const expectedWords = entry.arguments.length;
  const actualWords = (normalized.length - 10) / 64;
  if (actualWords !== expectedWords) {
    return {
      ...resolved,
      status: "UNAVAILABLE",
      operation: null,
      reasonCodes: ["INTENT_DECODE_UNAVAILABLE"],
      limitation: `Expected ${expectedWords} ABI words, received ${actualWords}.`,
    };
  }
  try {
    const args = {};
    for (const [index, argument] of entry.arguments.entries()) {
      const word = wordAt(normalized, index);
      if (argument === "recipient" || argument === "spender" || argument === "owner" || argument === "operator") args[argument] = decodeAddressWord(word, argument);
      else if (argument === "approved") args[argument] = decodeBool(word, argument);
      else if (["v"].includes(argument)) args[argument] = decodeUint(word, argument);
      else if (["r", "s"].includes(argument)) {
        if (!word || !/^[0-9a-f]{64}$/i.test(word)) fail("INTENT_DECODE_UNAVAILABLE", `Calldata signature component ${argument} is malformed.`);
        args[argument] = `0x${word.toLowerCase()}`;
      } else args[argument] = decodeUint(word, argument);
    }
    return {
      selector,
      operation: resolved.operation,
      operationCandidates: resolved.operationCandidates,
      permissionType: resolved.permissionType,
      status: "VERIFIED",
      arguments: args,
      evidenceRefs: [],
      limitation: null,
    };
  } catch (error) {
    if (error.code !== "INTENT_DECODE_UNAVAILABLE") throw error;
    return {
      selector,
      operation: null,
      operationCandidates: resolved.operationCandidates || [],
      status: "UNAVAILABLE",
      reasonCodes: ["INTENT_DECODE_UNAVAILABLE"],
      limitation: error.message,
    };
  }
}

function actionMatches(declaredAction, operation) {
  const map = {
    DEPOSIT: ["ERC20_APPROVE", "ERC20_TRANSFER"],
    TRANSFER: ["ERC20_TRANSFER"],
    APPROVE: ["ERC20_APPROVE"],
    TRANSFER_FROM: ["ERC20_TRANSFER_FROM"],
    PERMIT: ["EIP2612_PERMIT"],
    SET_APPROVAL_FOR_ALL: ["ERC721_SET_APPROVAL_FOR_ALL", "ERC1155_SET_APPROVAL_FOR_ALL"],
  };
  return Boolean(map[declaredAction]?.includes(operation));
}

function amountDelta(actual, declared) {
  if (actual === null || declared === null) return null;
  return (BigInt(actual) - BigInt(declared)).toString();
}

function compareIntentAndTransaction({ intent, transaction, decoded }) {
  const reasonCodes = new Set();
  if (intent.chainId !== transaction.chainId) reasonCodes.add("TARGET_CHAIN_MISMATCH");
  if (intent.sender !== transaction.from) reasonCodes.add("INTENT_ACTION_MISMATCH");
  if (decoded.status !== "VERIFIED") reasonCodes.add("INTENT_DECODE_UNAVAILABLE");
  if (decoded.operation && !actionMatches(intent.declaredAction, decoded.operation)) reasonCodes.add("INTENT_ACTION_MISMATCH");

  const args = decoded.arguments || {};
  const declaredMaximum = intent.maxApproval ?? intent.amount;
  let exposure = {
    permissionType: decoded.permissionType || null,
    requestedAmount: null,
    declaredMaximum,
    exposure: "NOT_APPLICABLE",
    exposureDelta: null,
    spender: null,
    operator: null,
    expiry: null,
    status: decoded.status === "VERIFIED" ? "VERIFIED" : "UNAVAILABLE",
    reasonCodes: [],
  };

  if (["ERC20_APPROVE", "EIP2612_PERMIT"].includes(decoded.operation)) {
    const actualAmount = decoded.operation === "EIP2612_PERMIT" ? args.value : args.amount;
    const spender = args.spender;
    exposure = {
      permissionType: "ERC20_ALLOWANCE",
      requestedAmount: actualAmount,
      declaredMaximum,
      exposure: actualAmount === MAX_UINT256.toString() ? "UNLIMITED" : "CAPPED",
      exposureDelta: amountDelta(actualAmount, declaredMaximum),
      spender,
      operator: null,
      expiry: decoded.operation === "EIP2612_PERMIT" ? args.deadline : null,
      status: decoded.status === "VERIFIED" ? "VERIFIED" : "UNAVAILABLE",
      reasonCodes: [],
    };
    if (actualAmount === MAX_UINT256.toString()) reasonCodes.add("UNLIMITED_APPROVAL");
    if (declaredMaximum !== null && BigInt(actualAmount) > BigInt(declaredMaximum)) reasonCodes.add("APPROVAL_EXCEEDS_INTENT");
    if (!intent.expectedSpender || intent.expectedSpender !== spender) reasonCodes.add("UNKNOWN_SPENDER");
    if (decoded.operation === "EIP2612_PERMIT" && args.deadline === "0") reasonCodes.add("HUMAN_REVIEW_REQUIRED");
  }

  if (["ERC721_SET_APPROVAL_FOR_ALL", "ERC1155_SET_APPROVAL_FOR_ALL"].includes(decoded.operation)) {
    exposure = {
      permissionType: "OPERATOR_APPROVAL",
      requestedAmount: args.approved ? "1" : "0",
      declaredMaximum: null,
      exposure: args.approved ? "OPERATOR_WIDE" : "REVOKE",
      exposureDelta: null,
      spender: null,
      operator: args.operator,
      expiry: null,
      status: "VERIFIED",
      reasonCodes: [],
    };
    if (args.approved && (!intent.expectedSpender || intent.expectedSpender !== args.operator)) reasonCodes.add("UNKNOWN_SPENDER");
  }

  if (decoded.operation === "ERC20_TRANSFER") {
    if (args.recipient !== intent.destination) reasonCodes.add("INTENT_ACTION_MISMATCH");
    if (args.amount !== intent.amount) reasonCodes.add("INTENT_ACTION_MISMATCH");
  }
  if (decoded.operation === "ERC20_TRANSFER_FROM") {
    if (args.owner !== intent.sender || args.recipient !== intent.destination || args.amount !== intent.amount) reasonCodes.add("INTENT_ACTION_MISMATCH");
  }
  if (decoded.operation === "EIP2612_PERMIT" && args.owner !== intent.sender) reasonCodes.add("INTENT_ACTION_MISMATCH");
  if (decoded.operation && !["0"].includes(transaction.value)) reasonCodes.add("INTENT_ACTION_MISMATCH");

  if (intent.asset.address && intent.asset.address !== transaction.to && decoded.operation?.startsWith("ERC20_")) {
    reasonCodes.add("INTENT_ACTION_MISMATCH");
  }
  const orderedReasonCodes = [...reasonCodes].filter((code) => REASON_CODES.includes(code));
  exposure.reasonCodes = orderedReasonCodes.filter((code) => ["UNLIMITED_APPROVAL", "APPROVAL_EXCEEDS_INTENT", "UNKNOWN_SPENDER", "HUMAN_REVIEW_REQUIRED"].includes(code));
  return {
    matches: orderedReasonCodes.length === 0,
    reasonCodes: orderedReasonCodes,
    exposure,
    comparison: {
      action: { declared: intent.declaredAction, actual: decoded.operation || null, matches: decoded.operation ? actionMatches(intent.declaredAction, decoded.operation) : false },
      chain: { declared: intent.chainId, actual: transaction.chainId, matches: intent.chainId === transaction.chainId },
      sender: { declared: intent.sender, actual: transaction.from, matches: intent.sender === transaction.from },
      destination: { declared: intent.destination, actual: args.recipient || null, matches: !args.recipient || args.recipient === intent.destination },
      spender: { declared: intent.expectedSpender, actual: args.spender || args.operator || null, matches: !intent.expectedSpender || intent.expectedSpender === (args.spender || args.operator) },
      amount: { declared: intent.amount, actual: args.amount || args.value || null, matches: !args.amount && !args.value ? true : args.amount === intent.amount || BigInt(args.amount || args.value) <= BigInt(declaredMaximum) },
    },
  };
}

module.exports = {
  ACTIONS,
  MAX_UINT256,
  MAX_CALLDATA_BYTES,
  normalizeAddress,
  normalizeChainId,
  normalizeInteger,
  normalizeIntent,
  normalizeTransaction,
  decodeCalldata,
  compareIntentAndTransaction,
  clone,
};