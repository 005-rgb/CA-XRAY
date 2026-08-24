const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDemoScan,
  NETWORKS,
  validateAddress,
  validateScanTarget,
  calculateCategoryScores,
  calculateReliability,
  CATEGORY_WEIGHTS,
} = require("../src/engine");
const { normalizeBlockscout, normalizeRpcContract } = require("../src/providers/default-adapters");
const { isValidSolanaPublicKey, solanaDataLength, validateNativeAddress, verifyNativeNetwork } = require("../src/providers/native-network-adapters");

const valid = "0x1234567890123456789012345678901234567890";

test("validates empty and malformed addresses before provider calls", () => {
  assert.equal(validateAddress("").code, "EMPTY_ADDRESS");
  assert.equal(validateAddress("0x123").code, "INVALID_ADDRESS");
  assert.equal(validateAddress(valid).valid, true);
  assert.equal(validateScanTarget("So11111111111111111111111111111111111111112", "solana").valid, true);
  assert.equal(validateScanTarget("0x123", "solana").code, "INVALID_ADDRESS");
});

test("block explorer rejects an address with no deployed code on the selected network", () => {
  const result = normalizeBlockscout({
    response: { is_verified: false, abi: [] },
    tokenResponse: null,
    holdersResponse: null,
    rpcResponse: { contractCode: { result: "0x" } },
    retrievedAt: "2026-08-23T00:00:00.000Z",
    network: { name: "Ethereum" },
    providerId: "blockscout-abi",
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.errorCode, "CONTRACT_NOT_DEPLOYED_ON_NETWORK");
  assert.match(result.message, /Ethereum/);
});

test("native network validation rejects EVM-shaped addresses on non-EVM networks", () => {
  const result = validateNativeAddress(
    valid,
    { id: "solana", name: "Solana" },
  );
  assert.equal(result.valid, false);
  assert.equal(result.code, "INVALID_ADDRESS");
});

test("Solana public-key validation checks decoded 32-byte length", () => {
  assert.equal(isValidSolanaPublicKey("So11111111111111111111111111111111111111112"), true);
  assert.equal(isValidSolanaPublicKey("11111111111111111111111111111111"), true);
  assert.equal(isValidSolanaPublicKey("111111111111111111111111111111111111111111111111111111111111"), false);
  assert.equal(validateNativeAddress("So11111111111111111111111111111111111111112", { id: "solana", name: "Solana" }).valid, true);
});

test("Solana account data length decodes raw base64 instead of counting encoded characters", () => {
  assert.equal(solanaDataLength(["AAECAwQ=", "base64"]), 5);
  assert.equal(solanaDataLength(["not-a-parsed-account"], "jsonParsed"), null);
});

test("Solana catalog uses native RPC support and a chain-specific explorer", () => {
  const network = NETWORKS.find((item) => item.id === "solana");
  assert.equal(network.evm, false);
  assert.equal(network.providerSupport["native-rpc"], true);
  assert.equal(network.providerSupport["rpc-contract"], false);
  assert.equal(network.explorer, "https://solscan.io/account/");
});

test("native network verification rejects networks without a native adapter", async () => {
  await assert.rejects(
    () => verifyNativeNetwork({
      network: { id: "ton", name: "TON" },
      address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
    }),
    (error) => error.code === "NATIVE_NETWORK_VERIFICATION_UNAVAILABLE"
      && /TON/.test(error.message),
  );
});

test("Solana native verification classifies malformed RPC results explicitly", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1 }), { status: 200 });
  try {
    await assert.rejects(
      () => verifyNativeNetwork({
        network: { id: "solana", name: "Solana", explorer: "https://solscan.io/account/" },
        address: "So11111111111111111111111111111111111111112",
      }),
      (error) => error.code === "NATIVE_PROVIDER_MALFORMED_RESPONSE",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("network catalog keeps 53 entries and exposes RPC evidence for every EVM entry", () => {
  assert.equal(NETWORKS.length, 53);
  const evmNetworks = NETWORKS.filter((network) => network.evm);
  assert.ok(evmNetworks.length >= 20);
  for (const network of evmNetworks) {
    assert.match(network.rpcUrl, /^https:\/\//);
    assert.equal(network.providerSupport["rpc-contract"], true);
    assert.equal(validateAddress(`0x${"1".repeat(40)}`, network).valid, true);
  }
});

test("RPC contract evidence never treats empty bytecode as deployed", () => {
  const result = normalizeRpcContract({
    network: { name: "Base" },
    providerId: "rpc-contract",
    retrievedAt: "2026-08-24T00:00:00.000Z",
    response: { contractCode: { result: "0x" } },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.errorCode, "CONTRACT_NOT_DEPLOYED_ON_NETWORK");
});

test("all three demos are deterministic and clearly marked", () => {
  for (const scenario of ["high", "moderate", "low"]) {
    const first = createDemoScan(scenario);
    const second = createDemoScan(scenario);
    assert.deepEqual(first, second);
    assert.equal(first.mode, "DEMO");
    assert.ok(first.limitations.includes("DEMO DATA — NOT LIVE BLOCKCHAIN DATA"));
    assert.ok(first.risk.finalScore !== null);
  }
});

test("demo scenarios produce ordered risk outcomes", () => {
  const high = createDemoScan("high").risk.finalScore;
  const moderate = createDemoScan("moderate").risk.finalScore;
  const low = createDemoScan("low").risk.finalScore;
  assert.ok(high > moderate);
  assert.ok(moderate > low);
});

test("category weights are not redistributed when a category is unknown", () => {
  const scan = createDemoScan("high");
  for (const key of Object.keys(scan.holders)) scan.holders[key].status = "UNKNOWN";
  const risk = calculateCategoryScores(scan);
  assert.equal(risk.categories.holder.score, null);
  assert.ok(risk.availableWeight < 1);
  assert.equal(risk.categories.contract.appliedWeight, CATEGORY_WEIGHTS.contract);
  assert.equal(risk.unscoredWeightPct, 15);
  assert.deepEqual(risk.scoreRange, { min: risk.finalScore, max: risk.finalScore + 15 });
  assert.equal(Number.isFinite(risk.finalScore), true);
});

test("unknown data never becomes a zero risk category", () => {
  const scan = createDemoScan("moderate");
  for (const key of Object.keys(scan.holders)) scan.holders[key].status = "UNKNOWN";
  const risk = calculateCategoryScores(scan);
  assert.equal(risk.categories.holder.status, "UNKNOWN");
  assert.equal(risk.categories.holder.score, null);
});

test("insufficient contract or trading evidence blocks final score", () => {
  const scan = createDemoScan("low");
  for (const key of Object.keys(scan.security)) scan.security[key].status = "UNKNOWN";
  const risk = calculateCategoryScores(scan);
  assert.equal(risk.finalScore, null);
});

test("reliability is separate and capped when core categories are missing", () => {
  const scan = createDemoScan("low");
  for (const key of Object.keys(scan.holders)) scan.holders[key].status = "UNKNOWN";
  for (const key of Object.keys(scan.liquidity)) {
    if (scan.liquidity[key] && typeof scan.liquidity[key] === "object") scan.liquidity[key].status = "UNKNOWN";
  }
  const risk = calculateCategoryScores(scan);
  const reliability = calculateReliability(scan, risk);
  assert.ok(reliability.score <= 59);
  assert.equal(Number.isFinite(reliability.score), true);
});

test("no engine output contains NaN or Infinity", () => {
  const scan = createDemoScan("high");
  scan.liquidity.liquidityUsd.value = null;
  scan.liquidity.volume24h.value = null;
  const risk = calculateCategoryScores(scan);
  const reliability = calculateReliability(scan, risk);
  const output = JSON.stringify({ risk, reliability });
  assert.equal(output.includes("NaN"), false);
  assert.equal(output.includes("Infinity"), false);
});

test("intelligence layer derives evidence-backed investigation features", () => {
  const scan = createDemoScan("high");
  assert.equal(scan.intelligence.capabilities.find((item) => item.key === "canMint").status, "DETECTED");
  assert.equal(scan.intelligence.powerMap.control, "ACTIVE");
  assert.equal(scan.intelligence.exitability.level, "HIGH");
  assert.ok(scan.intelligence.compoundRisks.some((item) => item.id === "mint-concentration-liquidity"));
  assert.equal(scan.intelligence.dataCoverage.overall, 100);
  assert.ok(scan.intelligence.scoreExplanation.items.length > 0);
});

test("boolean findings respect detected and positive states", () => {
  const high = createDemoScan("high");
  const highIds = high.findings.map((finding) => finding.id);
  assert.ok(highIds.includes("contract-mint"));
  assert.ok(!highIds.includes("positive-no-mint"));
  assert.ok(!highIds.includes("positive-source"));

  const low = createDemoScan("low");
  const lowIds = low.findings.map((finding) => finding.id);
  assert.ok(!lowIds.includes("contract-mint"));
  assert.ok(lowIds.includes("positive-no-mint"));
  assert.ok(lowIds.includes("positive-source"));
});

test("findings preserve their originating risk category", () => {
  const scan = createDemoScan("high");
  const categories = new Map(scan.findings.map((finding) => [finding.id, finding.category]));
  assert.equal(categories.get("contract-mint"), "contract");
  assert.equal(categories.get("trading-malicious"), "trading");
  assert.equal(categories.get("holder-top10"), "holder");
  assert.equal(categories.get("liquidity-depth"), "liquidity");
  assert.equal(categories.get("deployer-suspicious"), "deployer");
  assert.equal(categories.get("market-volatility"), "marketProject");
});