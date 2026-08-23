const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDemoScan,
  validateAddress,
  calculateCategoryScores,
  calculateReliability,
  CATEGORY_WEIGHTS,
} = require("../src/engine");

const valid = "0x1234567890123456789012345678901234567890";

test("validates empty and malformed addresses before provider calls", () => {
  assert.equal(validateAddress("").code, "EMPTY_ADDRESS");
  assert.equal(validateAddress("0x123").code, "INVALID_ADDRESS");
  assert.equal(validateAddress(valid).valid, true);
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