const STATUS = Object.freeze({
  VERIFIED: "VERIFIED",
  DETECTED: "DETECTED",
  NOT_DETECTED: "NOT_DETECTED",
  UNKNOWN: "UNKNOWN",
  UNAVAILABLE: "UNAVAILABLE",
  DEMO: "DEMO",
  ERROR: "ERROR",
});

const CATEGORY_WEIGHTS = Object.freeze({
  contract: 0.3,
  trading: 0.2,
  holder: 0.15,
  liquidity: 0.15,
  deployer: 0.1,
  marketProject: 0.1,
});

const TAX_THRESHOLDS = Object.freeze({
  veryHighSellTax: 20,
  veryHighBuyTax: 15,
});

const LIQUIDITY_THRESHOLDS = Object.freeze({
  extremelyLowVolumeToLiquidity: 0.01,
  veryLowVolume24h: 1000,
});

const NETWORKS = Object.freeze([
  { id: "ethereum", name: "Ethereum", goplusChainId: "1", dexChainId: "ethereum", explorer: "https://etherscan.io/address/" },
  { id: "bsc", name: "BNB Chain", goplusChainId: "56", dexChainId: "bsc", explorer: "https://bscscan.com/address/" },
  { id: "base", name: "Base", goplusChainId: "8453", dexChainId: "base", explorer: "https://basescan.org/address/" },
  { id: "arbitrum", name: "Arbitrum", goplusChainId: "42161", dexChainId: "arbitrum", explorer: "https://arbiscan.io/address/" },
  { id: "polygon", name: "Polygon", goplusChainId: "137", dexChainId: "polygon", explorer: "https://polygonscan.com/address/" },
]);

const FIXED_DEMO_TIMESTAMP = "2026-01-15T12:00:00.000Z";

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function point(value, status, source, confidence = "UNKNOWN", evidenceId = null, retrievedAt = null, derived = false) {
  return { value, status, source, confidence, evidenceId, retrievedAt, derived };
}

function unknown(source = "No provider evidence") {
  return point(null, STATUS.UNKNOWN, source);
}

function errorPoint(source, message) {
  return point(null, STATUS.ERROR, source, "UNKNOWN", null, null, false, message);
}

function hasEvidence(dataPoint, mode) {
  if (!dataPoint) return false;
  return mode === "DEMO"
    ? dataPoint.status === STATUS.DEMO
    : dataPoint.status === STATUS.VERIFIED || dataPoint.status === STATUS.DETECTED;
}

function statusForValue(value, source, retrievedAt, mode = "LIVE", confidence = "HIGH", derived = false) {
  if (mode === "DEMO") return point(value, STATUS.DEMO, "CA X-RAY DEMO FIXTURE", confidence, null, FIXED_DEMO_TIMESTAMP, derived);
  if (value === null || value === undefined || value === "") return unknown(source);
  if (typeof value === "boolean") {
    return point(value, value ? STATUS.DETECTED : STATUS.NOT_DETECTED, source, confidence, null, retrievedAt, derived);
  }
  return point(value, STATUS.VERIFIED, source, confidence, null, retrievedAt, derived);
}

function validateAddress(value) {
  const address = typeof value === "string" ? value.trim() : "";
  if (!address) return { valid: false, code: "EMPTY_ADDRESS", message: "Paste a contract address to begin." };
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, code: "INVALID_ADDRESS", message: "Enter a valid 42-character EVM contract address." };
  }
  return { valid: true, normalized: address };
}

function truncateAddress(address) {
  if (!address || address.length < 12) return address || "UNKNOWN";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function networkById(networkId) {
  return NETWORKS.find((network) => network.id === networkId) || null;
}

function categoryStatus(coverage, available) {
  if (!available) return coverage === 0 ? "UNKNOWN" : "PARTIAL";
  return coverage >= 100 ? "AVAILABLE" : "PARTIAL";
}

function fieldCoverage(fields, mode) {
  if (!fields.length) return 0;
  const score = fields.reduce((total, field) => {
    if (hasEvidence(field, mode)) return total + 100;
    if (field && field.status === STATUS.UNKNOWN) return total;
    return total;
  }, 0);
  return Math.round(score / fields.length);
}

function createBaseScan({ mode, address, network, timestamp }) {
  return {
    scanId: `${mode.toLowerCase()}-${address.slice(2, 10).toLowerCase()}-${timestamp.replace(/\D/g, "").slice(-10)}`,
    mode,
    timestamp,
    network: {
      id: network.id,
      name: network.name,
      validated: true,
      source: mode === "DEMO" ? "CA X-RAY DEMO FIXTURE" : "CA X-RAY network registry",
    },
    token: {
      name: unknown(),
      symbol: unknown(),
      decimals: unknown(),
      totalSupply: unknown(),
    },
    contract: {
      address,
      validated: true,
      capabilities: {},
    },
    security: {},
    trading: {},
    holders: {},
    liquidity: {},
    market: {},
    deployer: {},
    project: {},
    verification: {},
    risk: null,
    reliability: null,
    findings: [],
    evidence: [],
    errors: [],
    limitations: [],
    stages: ["VALIDATING", "FETCHING DATA", "NORMALIZING DATA", "ANALYZING CONTRACT", "CALCULATING RISK", "CALCULATING RELIABILITY", "BUILDING REPORT"],
  };
}

function demoPoint(value, evidenceId = null, confidence = "HIGH") {
  return point(value, STATUS.DEMO, "CA X-RAY DEMO FIXTURE", confidence, evidenceId, FIXED_DEMO_TIMESTAMP, false);
}

function setDemoData(scan, scenario) {
  const common = {
    network: scan.network,
    token: {},
    contract: {},
    trading: {},
    holders: {},
    liquidity: {},
    market: {},
    deployer: {},
    project: {},
  };

  const configs = {
    high: {
      address: "0x1111111111111111111111111111111111111111",
      token: ["Obsidian Control", "OBS", 18, "1000000000000000000000000"],
      capabilities: [true, true, true, true, true, true, true, false],
      trading: [24, 18, 12, true, true, true, true, true, true, true, true],
      holders: [1284, 3, 41, 78, 44, 1.2, 0.4, 2],
      liquidity: [7200, 120, "0xaaaabbbbccccddddeeeeffff0000111122223333", "Uniswap V2", 0.0021, -31],
      deployer: ["0x2222222222222222222222222222222222222222", "2026-01-08", true, 3, true, 44, false],
      project: [null, null, "UNKNOWN", "UNVERIFIED"],
    },
    moderate: {
      address: "0x2222222222222222222222222222222222222222",
      token: ["Measured Finance", "MFIN", 18, "5000000000000000000000000000000000"],
      capabilities: [false, true, false, false, true, true, false, true],
      trading: [8, 6, 0, false, false, true, true, false, false, false, false],
      holders: [8421, 1.4, 21, 46, 22, 2, 0.8, 4],
      liquidity: [36000, 2400, "0xbbbbccccddddeeeeffff00001111222233334444", "Aerodrome", 0.084, 8],
      deployer: ["0x3333333333333333333333333333333333333333", "2025-11-22", false, 1, false, 22, false],
      project: ["https://measured.example", "https://docs.measured.example", "MATCH", "UNVERIFIED"],
    },
    low: {
      address: "0x3333333333333333333333333333333333333333",
      token: ["Clearwater Protocol", "CWP", 18, "800000000000000000000000000000000000"],
      capabilities: [false, false, false, false, false, false, false, true],
      trading: [0, 0, 0, false, false, false, false, false, false, false, false],
      holders: [28640, 0.4, 4, 18, 7, 3.5, 1.1, 8],
      liquidity: [220000, 45000, "0xccccddddeeeeffff000011112222333344445555", "Uniswap V3", 0.42, 4.2],
      deployer: ["0x4444444444444444444444444444444444444444", "2025-04-10", false, 1, false, 7, false],
      project: ["https://clearwater.example", "https://docs.clearwater.example", "MATCH", "VERIFIED"],
    },
  };
  const config = configs[scenario] || configs.high;

  const sources = "CA X-RAY DEMO FIXTURE";
  const p = (value, evidenceId = null) => point(value, STATUS.DEMO, sources, "HIGH", evidenceId, FIXED_DEMO_TIMESTAMP);
  scan.contract.address = config.address;
  scan.scanId = `demo-${scenario}-${config.address.slice(2, 8)}`;
  scan.token = {
    name: p(config.token[0]),
    symbol: p(config.token[1]),
    decimals: p(config.token[2]),
    totalSupply: p(config.token[3]),
  };
  const capabilityNames = ["canMint", "canBlacklist", "canWhitelist", "canPause", "canChangeTax", "isUpgradeable", "canWithdraw", "sourceVerified"];
  const evidenceIds = ["E-001", "E-002", "E-003", "E-004", "E-005", "E-006", "E-007", "E-008"];
  scan.security = Object.fromEntries(capabilityNames.map((name, index) => [name, p(config.capabilities[index], evidenceIds[index])]));
  scan.contract.capabilities = scan.security;
  const tradingNames = ["buyTax", "sellTax", "transferTax", "sellRestriction", "buyRestriction", "maliciousTradingSignal", "taxChangeable", "maxTransactionRestriction", "maxWalletRestriction", "tradingPause", "hasPair"];
  scan.trading = Object.fromEntries(tradingNames.map((name, index) => [name, p(config.trading[index], `E-${String(index + 9).padStart(3, "0")}`)]));
  const holderNames = ["totalHolders", "top1Percent", "top5Percent", "top10Percent", "deployerPercent", "ownerPercent", "burnPercent", "liquidityRelatedAddresses"];
  scan.holders = Object.fromEntries(holderNames.map((name, index) => [name, p(config.holders[index], `E-${String(index + 20).padStart(3, "0")}`)]));
  const liquidityNames = ["liquidityUsd", "volume24h", "pair", "dex", "price", "change24h"];
  scan.liquidity = Object.fromEntries(liquidityNames.map((name, index) => [name, p(config.liquidity[index], `E-${String(index + 28).padStart(3, "0")}`)]));
  scan.liquidity.primaryPairRule = "Highest USD liquidity, then 24h volume, then lexicographic pair address.";
  const deployerNames = ["address", "deploymentDate", "suspiciousBehavior", "relatedContracts", "veryRecentDeployment", "tokenConcentration", "maliciousAssociation"];
  scan.deployer = Object.fromEntries(deployerNames.map((name, index) => [name, p(config.deployer[index], `E-${String(index + 34).padStart(3, "0")}`)]));
  scan.market = {
    price: scan.liquidity.price,
    volume24h: scan.liquidity.volume24h,
    liquidityUsd: scan.liquidity.liquidityUsd,
    fdv: p(scenario === "high" ? 2100000 : scenario === "moderate" ? 8400000 : 33600000),
    change24h: scan.liquidity.change24h,
    change7d: p(scenario === "high" ? -44 : scenario === "moderate" ? 12 : 18),
  };
  scan.project = {
    website: p(config.project[0], "E-041"),
    documentation: p(config.project[1], "E-042"),
    addressConsistency: p(config.project[2], "E-043"),
    auditClaim: p(config.project[3], "E-044"),
  };
  scan.verification = { sourceCode: scan.security.sourceVerified };
  return scan;
}

function calculateCategoryScores(scan) {
  const mode = scan.mode;
  const s = scan.security;
  const t = scan.trading;
  const h = scan.holders;
  const l = scan.liquidity;
  const d = scan.deployer;
  const m = scan.market;
  const p = scan.project;
  const scored = (dataPoint) => hasEvidence(dataPoint, mode);
  const add = (dataPoint, value) => (scored(dataPoint) && dataPoint.value === true ? value : 0);
  const numeric = (dataPoint) => scored(dataPoint) && Number.isFinite(Number(dataPoint.value)) ? Number(dataPoint.value) : null;

  let contract = 0;
  contract += add(s.canMint, 30);
  contract += add(s.canChangeTax, 20);
  contract += add(s.canBlacklist, 20);
  contract += add(s.canPause, 15);
  contract += add(s.canWhitelist, 10);
  contract += add(s.isUpgradeable, 15);
  contract += add(s.canWithdraw, 15);
  if (scored(s.sourceVerified) && s.sourceVerified.value === false) contract += 10;
  contract = clamp(contract);

  let trading = 0;
  trading += add(t.maliciousTradingSignal, 50);
  trading += add(t.sellRestriction, 30);
  trading += add(t.buyRestriction, 20);
  const sellTax = numeric(t.sellTax);
  const buyTax = numeric(t.buyTax);
  if (sellTax !== null && sellTax >= TAX_THRESHOLDS.veryHighSellTax) trading += 20;
  if (buyTax !== null && buyTax >= TAX_THRESHOLDS.veryHighBuyTax) trading += 15;
  trading += add(t.taxChangeable, 15);
  trading += add(t.maxTransactionRestriction, 10);
  trading += add(t.maxWalletRestriction, 10);
  trading += add(t.tradingPause, 10);
  trading = clamp(trading);

  let holder = 0;
  const top10 = numeric(h.top10Percent);
  const deployerPercent = numeric(h.deployerPercent);
  if (top10 !== null) {
    if (top10 < 20) holder += 0;
    else if (top10 < 40) holder += 20;
    else if (top10 < 60) holder += 40;
    else if (top10 <= 80) holder += 70;
    else holder += 90;
  }
  if (deployerPercent !== null) {
    if (deployerPercent >= 40) holder += 40;
    else if (deployerPercent >= 20) holder += 25;
    else if (deployerPercent >= 10) holder += 10;
  }
  holder = clamp(holder);

  let liquidity = 0;
  const liquidityUsd = numeric(l.liquidityUsd);
  const volume24h = numeric(l.volume24h);
  if (liquidityUsd !== null) {
    if (liquidityUsd < 10000) liquidity += 60;
    else if (liquidityUsd < 25000) liquidity += 40;
    else if (liquidityUsd < 100000) liquidity += 20;
  }
  if (liquidityUsd !== null && volume24h !== null) {
    if (volume24h / Math.max(liquidityUsd, 1) < LIQUIDITY_THRESHOLDS.extremelyLowVolumeToLiquidity) liquidity += 15;
  }
  liquidity = clamp(liquidity);

  let deployer = 0;
  deployer += add(d.suspiciousBehavior, 30);
  const related = numeric(d.relatedContracts);
  if (related !== null && related >= 2) deployer += 20;
  deployer += add(d.veryRecentDeployment, 15);
  const concentration = numeric(d.tokenConcentration);
  if (concentration !== null && concentration >= 20) deployer += 25;
  deployer += add(d.maliciousAssociation, 50);
  deployer = clamp(deployer);

  let marketProject = 0;
  if (liquidityUsd !== null && liquidityUsd < 10000) marketProject += 20;
  if (volume24h !== null && volume24h < LIQUIDITY_THRESHOLDS.veryLowVolume24h) marketProject += 15;
  const change24h = numeric(m.change24h);
  if (change24h !== null && Math.abs(change24h) >= 25) marketProject += 20;
  if (scored(p.website) && !p.website.value) marketProject += 10;
  if (scored(p.addressConsistency) && p.addressConsistency.value === "MISMATCH") marketProject += 30;
  if (scored(p.auditClaim) && p.auditClaim.value === "UNVERIFIED") marketProject += 5;
  marketProject = clamp(marketProject);

  const categoryInputs = {
    contract: [Object.values(s), 1, contract],
    trading: [Object.values(t), 1, trading],
    holder: [Object.values(h).filter((value) => value && typeof value === "object"), 1, holder],
    liquidity: [Object.values(l).filter((value) => value && typeof value === "object"), 2, liquidity],
    deployer: [Object.values(d).filter((value) => value && typeof value === "object"), 1, deployer],
    marketProject: [[...Object.values(m), ...Object.values(p)].filter((value) => value && typeof value === "object"), 1, marketProject],
  };
  const categories = {};
  for (const [name, [fields, minimumEvidence, score]] of Object.entries(categoryInputs)) {
    const coverage = fieldCoverage(fields, mode);
    const evidenceCount = fields.filter((field) => hasEvidence(field, mode)).length;
    const available = evidenceCount >= minimumEvidence;
    categories[name] = {
      score: available && coverage >= 50 ? score : null,
      status: categoryStatus(coverage, available),
      coverage,
      evidenceIds: fields.map((field) => field && field.evidenceId).filter(Boolean),
      originalWeight: CATEGORY_WEIGHTS[name],
      appliedWeight: 0,
    };
  }

  const eligible = Object.entries(categories).filter(([, value]) => value.score !== null);
  const availableWeight = eligible.reduce((sum, [, value]) => sum + value.originalWeight, 0);
  let finalScore = null;
  if (
    scan.contract.validated &&
    scan.network.validated &&
    categories.contract.score !== null &&
    categories.trading.score !== null &&
    availableWeight >= 0.6
  ) {
    const weighted = eligible.reduce((sum, [, value]) => sum + value.score * value.originalWeight, 0);
    finalScore = clamp(weighted / availableWeight);
    for (const [, value] of eligible) value.appliedWeight = value.originalWeight / availableWeight;
  }
  const partialData = Object.values(categories).some((category) => category.score === null || category.status === "PARTIAL");
  const confidence = finalScore === null ? "UNKNOWN" : reliabilityConfidence(scan, categories);
  return {
    categories,
    finalScore,
    level: finalScore === null ? null : riskLevel(finalScore),
    confidence,
    partialData,
    calculation: eligible.map(([name, value]) => ({
      name,
      score: value.score,
      originalWeight: value.originalWeight,
      appliedWeight: value.appliedWeight,
      contribution: value.score * value.originalWeight,
    })),
    availableWeight,
  };
}

function riskLevel(score) {
  if (score <= 20) return "LOW";
  if (score <= 40) return "MODERATE";
  if (score <= 60) return "ELEVATED";
  if (score <= 80) return "HIGH";
  return "VERY HIGH";
}

function reliabilityConfidence(scan, categories) {
  const unknownCore = ["holder", "liquidity", "deployer", "marketProject"].filter(
    (name) => categories[name].score === null,
  ).length;
  if (unknownCore >= 2) return "LOW";
  if (scan.errors.length || Object.values(categories).some((category) => category.status === "PARTIAL")) return "MEDIUM";
  return "HIGH";
}

function calculateReliability(scan, risk) {
  const coverageWeighted = Object.entries(risk.categories).reduce(
    (sum, [name, category]) => sum + category.coverage * CATEGORY_WEIGHTS[name],
    0,
  );
  const E = scan.mode === "DEMO" ? 100 : clamp(coverageWeighted / Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0));
  const sources = new Set();
  const collectSources = (value) => {
    if (value && typeof value === "object" && value.source) sources.add(value.source);
  };
  for (const section of [scan.security, scan.trading, scan.holders, scan.liquidity, scan.market, scan.deployer, scan.project]) {
    Object.values(section).forEach(collectSources);
  }
  const directSources = [...sources].filter((source) => source !== "No provider evidence" && !source.includes("network registry"));
  const S = scan.mode === "DEMO" ? 65 : directSources.length >= 2 ? 100 : directSources.length === 1 ? 85 : 0;
  const F = scan.mode === "DEMO" ? 100 : freshnessScore(scan);
  const C = scan.errors.some((error) => error.code === "PROVIDER_CONFLICT") ? 40 : 100;
  const R = 100;
  const I = scan.network.validated && scan.contract.validated ? 100 : 0;
  const raw = E * 0.35 + S * 0.2 + F * 0.15 + C * 0.15 + R * 0.1 + I * 0.05;
  const caps = [];
  const unknownCategories = Object.values(risk.categories).filter((category) => category.status === "UNKNOWN" || category.status === "UNAVAILABLE").length;
  if (I === 0) caps.push(0);
  if (E < 40) caps.push(39);
  if (unknownCategories >= 2) caps.push(59);
  if (C === 40) caps.push(74);
  if (scan.mode === "LIVE" && F === 10) caps.push(69);
  const score = clamp(Math.min(raw, ...(caps.length ? caps : [100])));
  return {
    score,
    label: score >= 85 ? "HIGH" : score >= 65 ? "MEDIUM" : score >= 40 ? "LOW" : "UNKNOWN",
    components: { E, S, F, C, R, I },
    raw,
    caps,
  };
}

function freshnessScore(scan) {
  const timestamps = [];
  for (const section of [scan.security, scan.trading, scan.holders, scan.liquidity, scan.market, scan.deployer, scan.project]) {
    for (const value of Object.values(section)) {
      if (value && typeof value === "object" && value.retrievedAt) timestamps.push(value.retrievedAt);
    }
  }
  if (!timestamps.length) return 10;
  const current = Date.parse(scan.timestamp);
  const oldest = Math.min(...timestamps.map((timestamp) => Date.parse(timestamp)).filter(Number.isFinite));
  if (!Number.isFinite(current) || !Number.isFinite(oldest)) return 10;
  const minutes = Math.max(0, (current - oldest) / 60000);
  if (minutes <= 15) return 100;
  if (minutes <= 60) return 85;
  if (minutes <= 1440) return 60;
  return 30;
}

function findingConfidence(scan, dataPoint) {
  if (!dataPoint || dataPoint.status === STATUS.UNKNOWN || dataPoint.status === STATUS.UNAVAILABLE || dataPoint.status === STATUS.ERROR) return "UNKNOWN";
  if (scan.mode === "DEMO") return "HIGH";
  if (dataPoint.confidence === "HIGH" && dataPoint.retrievedAt) return "HIGH";
  return "MEDIUM";
}

function generateFindings(scan, risk) {
  const findings = [];
  const addFinding = ({ id, severity, title, what, why, dataPoint, impact = 0, positive = false }) => {
    if (!dataPoint || !hasEvidence(dataPoint, scan.mode)) return;
    const evidenceId = dataPoint.evidenceId || `E-${String(findings.length + 1).padStart(3, "0")}`;
    dataPoint.evidenceId = evidenceId;
    const source = dataPoint.source;
    const evidence = dataPoint.value === null ? "Provider did not return a value." : `${title}: ${formatValue(dataPoint.value)}`;
    findings.push({
      id, severity, title, what, why, evidence, source,
      confidence: findingConfidence(scan, dataPoint),
      evidenceId, status: dataPoint.status, impact, positive,
      retrievedAt: dataPoint.retrievedAt,
    });
  };
  const s = scan.security;
  const t = scan.trading;
  const h = scan.holders;
  const l = scan.liquidity;
  const d = scan.deployer;
  const p = scan.project;
  addFinding({ id: "contract-mint", severity: "HIGH", title: "Owner can mint additional tokens", what: "The normalized contract data indicates mint capability is enabled.", why: "Supply can potentially be expanded by privileged control, which can dilute holders.", dataPoint: s.canMint, impact: 30 });
  addFinding({ id: "contract-tax", severity: "HIGH", title: "Transaction tax can be changed", what: "A privileged tax-setting capability was detected.", why: "A tax change can alter transfer economics after deployment.", dataPoint: s.canChangeTax, impact: 20 });
  addFinding({ id: "contract-blacklist", severity: "HIGH", title: "Blacklist capability detected", what: "The provider reports that addresses can be blacklisted.", why: "Blacklisting can restrict specific addresses from transacting.", dataPoint: s.canBlacklist, impact: 20 });
  addFinding({ id: "contract-pause", severity: "MEDIUM", title: "Transfers can be paused", what: "The contract exposes a transfer-pause capability.", why: "A privileged pause can interrupt transfers.", dataPoint: s.canPause, impact: 15 });
  addFinding({ id: "contract-upgrade", severity: "HIGH", title: "Privileged upgradeability detected", what: "The contract is reported as upgradeable.", why: "Implementation changes can alter behavior after the current scan.", dataPoint: s.isUpgradeable, impact: 15 });
  addFinding({ id: "contract-unverified", severity: "MEDIUM", title: "Source code is not verified", what: "The provider explicitly reports source code as unverified.", why: "Independent review of the deployed logic is more difficult.", dataPoint: s.sourceVerified, impact: 10 });
  addFinding({ id: "trading-malicious", severity: "CRITICAL", title: "Strong malicious-trading signal", what: "A security provider explicitly returned a malicious-trading signal.", why: "This is a direct provider signal that trading behavior deserves immediate scrutiny.", dataPoint: t.maliciousTradingSignal, impact: 50 });
  addFinding({ id: "trading-sell", severity: "CRITICAL", title: "Sell restriction detected", what: "The provider reports a sell restriction.", why: "A sell restriction can prevent or limit exits.", dataPoint: t.sellRestriction, impact: 30 });
  addFinding({ id: "trading-buy", severity: "HIGH", title: "Buy restriction detected", what: "The provider reports a buy restriction.", why: "A buy restriction can limit access to the market.", dataPoint: t.buyRestriction, impact: 20 });
  const sellTax = Number(t.sellTax && t.sellTax.value);
  if (Number.isFinite(sellTax) && sellTax >= TAX_THRESHOLDS.veryHighSellTax) addFinding({ id: "trading-sell-tax", severity: "HIGH", title: "Very high sell tax observed", what: `The observed sell tax is ${formatValue(sellTax)}%.`, why: `The value meets the named ${TAX_THRESHOLDS.veryHighSellTax}% high-tax threshold.`, dataPoint: t.sellTax, impact: 20 });
  const buyTax = Number(t.buyTax && t.buyTax.value);
  if (Number.isFinite(buyTax) && buyTax >= TAX_THRESHOLDS.veryHighBuyTax) addFinding({ id: "trading-buy-tax", severity: "HIGH", title: "Very high buy tax observed", what: `The observed buy tax is ${formatValue(buyTax)}%.`, why: `The value meets the named ${TAX_THRESHOLDS.veryHighBuyTax}% high-tax threshold.`, dataPoint: t.buyTax, impact: 15 });
  addFinding({ id: "holder-top10", severity: "HIGH", title: "Top-10 holder concentration is elevated", what: `Top-10 holders account for ${formatValue(h.top10Percent && h.top10Percent.value)}%.`, why: "Concentrated holdings can increase the impact of a small number of wallets on supply and liquidity.", dataPoint: h.top10Percent, impact: risk.categories.holder.score || 0 });
  addFinding({ id: "holder-deployer", severity: "MEDIUM", title: "Deployer concentration is material", what: `The deployer concentration is ${formatValue(h.deployerPercent && h.deployerPercent.value)}%.`, why: "A concentrated deployer position can affect distribution risk.", dataPoint: h.deployerPercent, impact: 25 });
  const liquidityUsd = Number(l.liquidityUsd && l.liquidityUsd.value);
  if (Number.isFinite(liquidityUsd) && liquidityUsd < 100000) addFinding({ id: "liquidity-depth", severity: liquidityUsd < 10000 ? "HIGH" : "MEDIUM", title: "Liquidity depth is limited", what: `Primary-pair liquidity is ${formatCurrency(liquidityUsd)}.`, why: "Lower liquidity can increase execution impact and make market conditions more fragile.", dataPoint: l.liquidityUsd, impact: liquidityUsd < 10000 ? 60 : 20 });
  const volume = Number(l.volume24h && l.volume24h.value);
  if (Number.isFinite(liquidityUsd) && Number.isFinite(volume) && volume / Math.max(liquidityUsd, 1) < LIQUIDITY_THRESHOLDS.extremelyLowVolumeToLiquidity) addFinding({ id: "liquidity-volume", severity: "MEDIUM", title: "Volume is extremely low relative to liquidity", what: `24-hour volume is ${formatCurrency(volume)} against ${formatCurrency(liquidityUsd)} liquidity.`, why: `The volume/liquidity ratio is below the named ${LIQUIDITY_THRESHOLDS.extremelyLowVolumeToLiquidity} threshold.`, dataPoint: l.volume24h, impact: 15 });
  addFinding({ id: "deployer-suspicious", severity: "HIGH", title: "Suspicious deployer behavior reported", what: "Reliable deployer evidence flags suspicious behavior.", why: "This is a source-backed activity signal, not an inference from age or ownership alone.", dataPoint: d.suspiciousBehavior, impact: 30 });
  addFinding({ id: "deployer-related", severity: "MEDIUM", title: "Related contracts detected", what: `${formatValue(d.relatedContracts && d.relatedContracts.value)} related contract(s) were detected.`, why: "Related deployments can provide context for deployer activity and should be reviewed together.", dataPoint: d.relatedContracts, impact: 20 });
  addFinding({ id: "market-volatility", severity: "MEDIUM", title: "Large 24-hour price movement", what: `The observed 24-hour change is ${formatValue(scan.market.change24h && scan.market.change24h.value)}%.`, why: "Large short-term movement is a market-risk signal, not a prediction of future performance.", dataPoint: scan.market.change24h, impact: 20 });
  addFinding({ id: "project-website", severity: "LOW", title: "Project website information is unavailable", what: "No project website was available in the normalized data.", why: "The project context cannot be independently reviewed from this scan.", dataPoint: p.website, impact: 10 });
  addFinding({ id: "project-audit", severity: "LOW", title: "Audit claim is not independently verified", what: "The normalized project signal is UNVERIFIED.", why: "An unverified audit claim is a limitation; it does not establish that the contract is unsafe.", dataPoint: p.auditClaim, impact: 5 });

  addFinding({ id: "positive-source", severity: "POSITIVE", title: "Contract source is verified", what: "The provider explicitly reports verified source code.", why: "Verified source improves inspectability, although it does not guarantee safety.", dataPoint: s.sourceVerified, positive: true });
  addFinding({ id: "positive-no-mint", severity: "POSITIVE", title: "No mint capability detected", what: "The provider explicitly checked and did not detect mint capability.", why: "This removes one observed privileged supply-control signal from the current scan.", dataPoint: s.canMint, positive: true });
  addFinding({ id: "positive-distribution", severity: "POSITIVE", title: "Top-10 holder concentration is below 20%", what: `Top-10 holders account for ${formatValue(h.top10Percent && h.top10Percent.value)}%.`, why: "The observed distribution is below the highest concentration bands in this rubric.", dataPoint: h.top10Percent, positive: true });
  addFinding({ id: "positive-liquidity", severity: "POSITIVE", title: "Primary-pair liquidity is substantial", what: `Primary-pair liquidity is ${formatCurrency(liquidityUsd)}.`, why: "The observed liquidity is at or above the rubric's $100,000 lower-risk threshold.", dataPoint: l.liquidityUsd, positive: true });
  addFinding({ id: "positive-trading", severity: "POSITIVE", title: "No malicious-trading signal detected", what: "The provider explicitly checked and did not detect the strong malicious-trading signal.", why: "This is a positive provider result, not a guarantee of safe trading.", dataPoint: t.maliciousTradingSignal, positive: true });

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, POSITIVE: 4 };
  findings.sort((a, b) => (severityOrder[a.severity] - severityOrder[b.severity]) || (b.impact - a.impact) || (a.confidence.localeCompare(b.confidence)) || a.id.localeCompare(b.id));
  const material = findings.filter((finding) => !finding.positive || finding.severity !== "POSITIVE");
  scan.evidence = material.map((finding) => ({
    id: finding.evidenceId,
    finding: finding.title,
    source: finding.source,
    retrievedAt: finding.retrievedAt,
    confidence: finding.confidence,
    status: finding.status,
    what: finding.what,
    why: finding.why,
    evidence: finding.evidence,
    limitations: scan.mode === "DEMO" ? "Deterministic demo fixture; not live blockchain evidence." : null,
  }));
  return findings;
}

function finalizeScan(scan) {
  const risk = calculateCategoryScores(scan);
  scan.risk = risk;
  scan.reliability = calculateReliability(scan, risk);
  scan.findings = generateFindings(scan, risk);
  if (risk.partialData) scan.stages.push("PARTIAL DATA");
  else scan.stages.push("COMPLETE");
  if (scan.mode === "DEMO") {
    scan.limitations.push("DEMO DATA — NOT LIVE BLOCKCHAIN DATA");
    scan.limitations.push("Engine reproducibility: HIGH. Live evidence: NOT APPLICABLE IN DEMO MODE.");
  }
  if (scan.errors.length) scan.limitations.push("One or more providers returned an error; missing fields remain UNKNOWN and were not replaced.");
  if (scan.risk.finalScore === null) scan.limitations.push("Insufficient category evidence for a reliable final risk score.");
  return scan;
}

function createDemoScan(scenario = "high") {
  const safeScenario = ["high", "moderate", "low"].includes(scenario) ? scenario : "high";
  const configAddress = { high: "0x1111111111111111111111111111111111111111", moderate: "0x2222222222222222222222222222222222222222", low: "0x3333333333333333333333333333333333333333" }[safeScenario];
  const scan = createBaseScan({
    mode: "DEMO",
    address: configAddress,
    network: networkById("ethereum"),
    timestamp: FIXED_DEMO_TIMESTAMP,
  });
  setDemoData(scan, safeScenario);
  return finalizeScan(scan);
}

function providerValue(data, key) {
  if (!Object.prototype.hasOwnProperty.call(data || {}, key)) return null;
  const raw = data[key];
  if (raw === "" || raw === null || raw === undefined) return null;
  if (raw === "0") return false;
  if (raw === "1") return true;
  return raw;
}

function parseBooleanField(data, key, source, retrievedAt) {
  const value = providerValue(data, key);
  if (value === null) return unknown(source);
  return statusForValue(Boolean(value), source, retrievedAt, "LIVE");
}

function parseNumberField(data, key, source, retrievedAt, transform = (value) => Number(value)) {
  const value = providerValue(data, key);
  if (value === null) return unknown(source);
  const parsed = transform(value);
  return Number.isFinite(parsed) ? statusForValue(parsed, source, retrievedAt, "LIVE", "HIGH", transform !== Number) : unknown(source);
}

function parseTax(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return parsed <= 1 ? parsed * 100 : parsed;
}

function isProviderObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

async function fetchJson(url, provider, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const retrievedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "CA-XRAY/1.0" },
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw Object.assign(new Error("MALFORMED_RESPONSE"), { code: "MALFORMED_RESPONSE", provider, status: response.status });
    }
    if (!response.ok) throw Object.assign(new Error(`HTTP_${response.status}`), { code: response.status === 429 ? "RATE_LIMIT" : "PROVIDER_ERROR", provider, status: response.status });
    return { json, retrievedAt };
  } catch (error) {
    if (error.name === "AbortError") throw Object.assign(new Error("PROVIDER_TIMEOUT"), { code: "PROVIDER_TIMEOUT", provider });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function applyGoPlus(scan, response, retrievedAt, network) {
  const source = "GoPlus Security API";
  if (!isProviderObject(response) || ![1, "1"].includes(response.code) || !isProviderObject(response.result)) {
    scan.errors.push({ provider: source, code: "MALFORMED_RESPONSE", message: "GoPlus returned an invalid response shape." });
    return false;
  }
  const key = Object.keys(response.result)[0];
  const data = key ? response.result[key] : null;
  if (!isProviderObject(data)) {
    scan.errors.push({ provider: source, code: "CONTRACT_NOT_FOUND", message: "GoPlus returned no record for this contract." });
    return false;
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
  scan.security = Object.fromEntries(Object.entries(boolMap).map(([name, keyName]) => [name, parseBooleanField(data, keyName, source, retrievedAt)]));
  scan.security.canChangeTax = providerValue(data, "can_set_tax") === null ? scan.security.canChangeTax : parseBooleanField(data, "can_set_tax", source, retrievedAt);
  scan.security.ownerControl = statusForValue(Boolean(data.owner_address), source, retrievedAt, "LIVE");
  scan.security.sourceVerified = parseBooleanField(data, "is_open_source", source, retrievedAt);
  scan.contract.capabilities = scan.security;
  scan.trading = {
    buyTax: parseNumberField(data, "buy_tax", source, retrievedAt, parseTax),
    sellTax: parseNumberField(data, "sell_tax", source, retrievedAt, parseTax),
    transferTax: parseNumberField(data, "transfer_tax", source, retrievedAt, parseTax),
    sellRestriction: parseBooleanField(data, "cannot_sell_all", source, retrievedAt),
    buyRestriction: parseBooleanField(data, "cannot_buy", source, retrievedAt),
    maliciousTradingSignal: parseBooleanField(data, "is_honeypot", source, retrievedAt),
    taxChangeable: scan.security.canChangeTax,
    maxTransactionRestriction: parseBooleanField(data, "anti_whale_modifiable", source, retrievedAt),
    maxWalletRestriction: parseBooleanField(data, "anti_whale_modifiable", source, retrievedAt),
    tradingPause: scan.security.canPause,
    hasPair: unknown(source),
  };
  scan.verification = { sourceCode: scan.security.sourceVerified };
  scan.token = {
    name: statusForValue(providerValue(data, "token_name"), source, retrievedAt),
    symbol: statusForValue(providerValue(data, "token_symbol"), source, retrievedAt),
    decimals: parseNumberField(data, "decimals", source, retrievedAt),
    totalSupply: statusForValue(providerValue(data, "total_supply"), source, retrievedAt),
  };
  scan._providerIdentity = { goplus: true, network };
  return true;
}

function choosePrimaryPair(pairs) {
  return [...pairs].sort((a, b) => {
    const liquidityDiff = Number(b.liquidity && b.liquidity.usd || 0) - Number(a.liquidity && a.liquidity.usd || 0);
    if (liquidityDiff) return liquidityDiff;
    const volumeDiff = Number(b.volume && b.volume.h24 || 0) - Number(a.volume && b.volume.h24 || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.pairAddress || "").localeCompare(String(b.pairAddress || ""));
  })[0] || null;
}

function applyDexScreener(scan, response, retrievedAt, network, address) {
  const source = "DexScreener API";
  if (!isProviderObject(response) || (response.pairs !== null && !Array.isArray(response.pairs))) {
    scan.errors.push({ provider: source, code: "MALFORMED_RESPONSE", message: "DexScreener returned an invalid response shape." });
    return false;
  }
  const pairs = (response.pairs || []).filter((pair) => pair && pair.chainId === network.dexChainId && (pair.baseToken?.address?.toLowerCase() === address.toLowerCase() || pair.quoteToken?.address?.toLowerCase() === address.toLowerCase()));
  const pair = choosePrimaryPair(pairs);
  if (!pair) {
    scan.errors.push({ provider: source, code: "PAIR_NOT_FOUND", message: "No supported-network pair was returned for this contract." });
    return false;
  }
  const q = (value) => statusForValue(value, source, retrievedAt);
  scan.liquidity = {
    liquidityUsd: q(Number(pair.liquidity?.usd)),
    volume24h: q(Number(pair.volume?.h24)),
    pair: q(pair.pairAddress),
    dex: q(pair.dexId),
    price: q(Number(pair.priceUsd)),
    change24h: q(Number(pair.priceChange?.h24)),
    primaryPairRule: "Highest USD liquidity, then 24h volume, then lexicographic pair address.",
  };
  scan.market = {
    price: scan.liquidity.price,
    volume24h: scan.liquidity.volume24h,
    liquidityUsd: scan.liquidity.liquidityUsd,
    fdv: q(Number(pair.fdv)),
    change24h: scan.liquidity.change24h,
    change7d: unknown(source),
  };
  scan.trading = scan.trading || {};
  scan.trading.hasPair = q(true);
  if (scan.token.symbol.status === STATUS.UNKNOWN) scan.token.symbol = q(pair.baseToken?.symbol);
  if (scan.token.name.status === STATUS.UNKNOWN) scan.token.name = q(pair.baseToken?.name);
  scan._providerIdentity = { ...(scan._providerIdentity || {}), dexscreener: true, network };
  return true;
}

async function scanLive({ address, networkId }) {
  const validation = validateAddress(address);
  if (!validation.valid) throw new Error(validation.code);
  const network = networkById(networkId);
  if (!network) throw new Error("UNSUPPORTED_NETWORK");
  const timestamp = new Date().toISOString();
  const scan = createBaseScan({ mode: "LIVE", address: validation.normalized, network, timestamp });
  const goplusUrl = `https://api.gopluslabs.io/api/v1/token_security/${network.goplusChainId}?contract_addresses=${encodeURIComponent(validation.normalized)}`;
  const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(validation.normalized)}`;
  const results = await Promise.allSettled([
    fetchJson(goplusUrl, "GoPlus Security API"),
    fetchJson(dexUrl, "DexScreener API"),
  ]);
  let successes = 0;
  if (results[0].status === "fulfilled") {
    if (applyGoPlus(scan, results[0].value.json, results[0].value.retrievedAt, network)) successes += 1;
  } else {
    const error = results[0].reason;
    scan.errors.push({ provider: "GoPlus Security API", code: error.code || "PROVIDER_ERROR", message: error.message });
  }
  if (results[1].status === "fulfilled") {
    if (applyDexScreener(scan, results[1].value.json, results[1].value.retrievedAt, network, validation.normalized)) successes += 1;
  } else {
    const error = results[1].reason;
    scan.errors.push({ provider: "DexScreener API", code: error.code || "PROVIDER_ERROR", message: error.message });
  }
  if (!scan.security.canMint) scan.security = { canMint: unknown("GoPlus Security API"), ...scan.security };
  if (!scan.trading.buyTax) scan.trading = { buyTax: unknown("GoPlus Security API"), ...scan.trading };
  if (!scan.holders.totalHolders) scan.holders = { totalHolders: unknown("Optional holder endpoint not configured"), top10Percent: unknown("Optional holder endpoint not configured"), deployerPercent: unknown("Optional holder endpoint not configured"), ...scan.holders };
  if (!scan.deployer.address) scan.deployer = { address: unknown("Optional explorer endpoint not configured"), ...scan.deployer };
  if (!scan.project.website) scan.project = { website: unknown("No independent project metadata endpoint configured"), addressConsistency: unknown("No independent project metadata endpoint configured"), auditClaim: unknown("No independent project metadata endpoint configured"), ...scan.project };
  scan.stages.push(successes ? "COMPLETE" : "ERROR");
  if (successes < 2) scan.limitations.push("Coverage is partial because not every primary provider returned usable data.");
  delete scan._providerIdentity;
  return finalizeScan(scan);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "UNKNOWN";
  if (typeof value === "boolean") return value ? "DETECTED" : "NOT DETECTED";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return String(value);
}

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "UNKNOWN";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
}

module.exports = {
  STATUS,
  NETWORKS,
  CATEGORY_WEIGHTS,
  TAX_THRESHOLDS,
  LIQUIDITY_THRESHOLDS,
  validateAddress,
  truncateAddress,
  createDemoScan,
  calculateCategoryScores,
  calculateReliability,
  generateFindings,
  scanLive,
  formatValue,
  formatCurrency,
};