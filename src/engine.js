const {
  ENGINE_VERSION,
  EVIDENCE_SCHEMA_VERSION,
  PROVIDER_RESULT_STATUS,
} = require("./providers/contracts");
const { createDefaultProviderRegistry } = require("./providers/default-adapters");

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

function point(
  value,
  status,
  source,
  confidence = "UNKNOWN",
  evidenceId = null,
  retrievedAt = null,
  derived = false,
  evidenceStatus = null,
  provenance = null,
) {
  return {
    value,
    status,
    source,
    confidence,
    evidenceId,
    retrievedAt,
    derived,
    evidenceStatus: evidenceStatus || (
      status === STATUS.UNKNOWN || status === STATUS.UNAVAILABLE || status === STATUS.ERROR
        ? PROVIDER_RESULT_STATUS.UNKNOWN
        : PROVIDER_RESULT_STATUS.VALID
    ),
    provenance,
  };
}

function unknown(source = "No provider evidence") {
  return point(null, STATUS.UNKNOWN, source, "UNKNOWN", null, null, false, PROVIDER_RESULT_STATUS.UNKNOWN);
}

function errorPoint(source, message) {
  return {
    ...point(null, STATUS.ERROR, source, "UNKNOWN", null, null, false, PROVIDER_RESULT_STATUS.PROVIDER_ERROR),
    error: message || "Provider evidence error.",
  };
}

function hasEvidence(dataPoint, mode) {
  if (!dataPoint) return false;
  return mode === "DEMO"
    ? dataPoint.status === STATUS.DEMO
    : dataPoint.status !== STATUS.UNKNOWN
      && dataPoint.status !== STATUS.UNAVAILABLE
      && dataPoint.status !== STATUS.ERROR
      && (dataPoint.evidenceStatus === PROVIDER_RESULT_STATUS.VALID
        || dataPoint.status === STATUS.VERIFIED
        || dataPoint.status === STATUS.DETECTED);
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
    engineVersion: ENGINE_VERSION,
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    scanId: `${mode.toLowerCase()}-${address.slice(2, 10).toLowerCase()}-${timestamp.replace(/\D/g, "").slice(-10)}`,
    mode,
    timestamp,
    dataStatus: mode === "DEMO" ? "valid" : PROVIDER_RESULT_STATUS.UNKNOWN,
    riskScore: null,
    reliabilityScore: null,
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
    conflicts: [],
    providerResults: [],
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
  scan.security.ownerAddress = p(config.deployer[0], "E-041");
  scan.security.ownerControl = p("ACTIVE", "E-042");
  scan.market = {
    price: scan.liquidity.price,
    volume24h: scan.liquidity.volume24h,
    liquidityUsd: scan.liquidity.liquidityUsd,
    fdv: p(scenario === "high" ? 2100000 : scenario === "moderate" ? 8400000 : 33600000),
    change24h: scan.liquidity.change24h,
    change7d: p(scenario === "high" ? -44 : scenario === "moderate" ? 12 : 18),
  };
  scan.project = {
    website: p(config.project[0], "E-043"),
    documentation: p(config.project[1], "E-044"),
    addressConsistency: p(config.project[2], "E-045"),
    auditClaim: p(config.project[3], "E-046"),
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
    if (value && typeof value === "object") {
      if (value.source) sources.add(value.source);
      if (value.provenance?.providerId) sources.add(value.provenance.providerId);
    }
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
  const addFinding = ({ id, severity, title, what, why, dataPoint, impact = 0, positive = false, when = () => true }) => {
    if (!dataPoint || !hasEvidence(dataPoint, scan.mode)) return;
    if (!when(dataPoint)) return;
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
  addFinding({ id: "contract-mint", severity: "HIGH", title: "Mint capability detected", what: "The normalized contract data indicates mint capability is enabled.", why: "Supply can potentially be expanded by privileged control, which can dilute holders.", dataPoint: s.canMint, impact: 30, when: (value) => value.value === true });
  addFinding({ id: "contract-tax", severity: "HIGH", title: "Transaction tax can be changed", what: "A privileged tax-setting capability was detected.", why: "A tax change can alter transfer economics after deployment.", dataPoint: s.canChangeTax, impact: 20, when: (value) => value.value === true });
  addFinding({ id: "contract-blacklist", severity: "HIGH", title: "Blacklist capability detected", what: "The normalized contract data indicates that addresses can be blacklisted.", why: "Blacklisting can restrict specific addresses from transacting.", dataPoint: s.canBlacklist, impact: 20, when: (value) => value.value === true });
  addFinding({ id: "contract-pause", severity: "MEDIUM", title: "Transfers can be paused", what: "The contract exposes a transfer-pause capability.", why: "A privileged pause can interrupt transfers.", dataPoint: s.canPause, impact: 15, when: (value) => value.value === true });
  addFinding({ id: "contract-upgrade", severity: "HIGH", title: "Privileged upgradeability detected", what: "The contract is reported as upgradeable.", why: "Implementation changes can alter behavior after the current scan.", dataPoint: s.isUpgradeable, impact: 15, when: (value) => value.value === true });
  addFinding({ id: "contract-unverified", severity: "MEDIUM", title: "Source code is not verified", what: "Available evidence indicates that source code is not verified.", why: "Independent review of the deployed logic is more difficult.", dataPoint: s.sourceVerified, impact: 10, when: (value) => value.value === false });
  addFinding({ id: "trading-malicious", severity: "CRITICAL", title: "Honeypot signal detected", what: "Available security analysis returned a honeypot signal.", why: "This direct risk signal means trading behavior deserves immediate scrutiny.", dataPoint: t.maliciousTradingSignal, impact: 50, when: (value) => value.value === true });
  addFinding({ id: "trading-sell", severity: "CRITICAL", title: "Sell restriction detected", what: "Available evidence reports a sell restriction.", why: "A sell restriction can prevent or limit exits.", dataPoint: t.sellRestriction, impact: 30, when: (value) => value.value === true });
  addFinding({ id: "trading-buy", severity: "HIGH", title: "Buy restriction detected", what: "Available evidence reports a buy restriction.", why: "A buy restriction can limit access to the market.", dataPoint: t.buyRestriction, impact: 20, when: (value) => value.value === true });
  const sellTax = Number(t.sellTax && t.sellTax.value);
  if (Number.isFinite(sellTax) && sellTax >= TAX_THRESHOLDS.veryHighSellTax) addFinding({ id: "trading-sell-tax", severity: "HIGH", title: "Very high sell tax observed", what: `The observed sell tax is ${formatValue(sellTax)}%.`, why: `The value meets the named ${TAX_THRESHOLDS.veryHighSellTax}% high-tax threshold.`, dataPoint: t.sellTax, impact: 20 });
  const buyTax = Number(t.buyTax && t.buyTax.value);
  if (Number.isFinite(buyTax) && buyTax >= TAX_THRESHOLDS.veryHighBuyTax) addFinding({ id: "trading-buy-tax", severity: "HIGH", title: "Very high buy tax observed", what: `The observed buy tax is ${formatValue(buyTax)}%.`, why: `The value meets the named ${TAX_THRESHOLDS.veryHighBuyTax}% high-tax threshold.`, dataPoint: t.buyTax, impact: 15 });
  addFinding({ id: "holder-top10", severity: "HIGH", title: "Top-10 holder concentration is elevated", what: `Top-10 holders account for ${formatValue(h.top10Percent && h.top10Percent.value)}%.`, why: "Concentrated holdings can increase the impact of a small number of wallets on supply and liquidity.", dataPoint: h.top10Percent, impact: risk.categories.holder.score || 0, when: (value) => Number(value.value) >= 40 });
  addFinding({ id: "holder-deployer", severity: "MEDIUM", title: "Deployer concentration is material", what: `The deployer concentration is ${formatValue(h.deployerPercent && h.deployerPercent.value)}%.`, why: "A concentrated deployer position can affect distribution risk.", dataPoint: h.deployerPercent, impact: 25, when: (value) => Number(value.value) >= 10 });
  const liquidityUsd = Number(l.liquidityUsd && l.liquidityUsd.value);
  if (Number.isFinite(liquidityUsd) && liquidityUsd < 100000) addFinding({ id: "liquidity-depth", severity: liquidityUsd < 10000 ? "HIGH" : "MEDIUM", title: "Liquidity depth is limited", what: `Primary-pair liquidity is ${formatCurrency(liquidityUsd)}.`, why: "Lower liquidity can increase execution impact and make market conditions more fragile.", dataPoint: l.liquidityUsd, impact: liquidityUsd < 10000 ? 60 : 20 });
  const volume = Number(l.volume24h && l.volume24h.value);
  if (Number.isFinite(liquidityUsd) && Number.isFinite(volume) && volume / Math.max(liquidityUsd, 1) < LIQUIDITY_THRESHOLDS.extremelyLowVolumeToLiquidity) addFinding({ id: "liquidity-volume", severity: "MEDIUM", title: "Volume is extremely low relative to liquidity", what: `24-hour volume is ${formatCurrency(volume)} against ${formatCurrency(liquidityUsd)} liquidity.`, why: `The volume/liquidity ratio is below the named ${LIQUIDITY_THRESHOLDS.extremelyLowVolumeToLiquidity} threshold.`, dataPoint: l.volume24h, impact: 15 });
  addFinding({ id: "deployer-suspicious", severity: "HIGH", title: "Suspicious deployer behavior reported", what: "Reliable deployer evidence flags suspicious behavior.", why: "This is a source-backed activity signal, not an inference from age or ownership alone.", dataPoint: d.suspiciousBehavior, impact: 30, when: (value) => value.value === true });
  addFinding({ id: "deployer-related", severity: "MEDIUM", title: "Related contracts detected", what: `${formatValue(d.relatedContracts && d.relatedContracts.value)} related contract(s) were detected.`, why: "Related deployments can provide context for deployer activity and should be reviewed together.", dataPoint: d.relatedContracts, impact: 20, when: (value) => Number(value.value) >= 2 });
  addFinding({ id: "market-volatility", severity: "MEDIUM", title: "Large 24-hour price movement", what: `The observed 24-hour change is ${formatValue(scan.market.change24h && scan.market.change24h.value)}%.`, why: "Large short-term movement is a market-risk signal, not a prediction of future performance.", dataPoint: scan.market.change24h, impact: 20 });
  addFinding({ id: "project-website", severity: "LOW", title: "Project website information is unavailable", what: "No project website was available in the normalized data.", why: "The project context cannot be independently reviewed from this scan.", dataPoint: p.website, impact: 10, when: (value) => value.value === false });
  addFinding({ id: "project-audit", severity: "LOW", title: "Audit claim is not independently verified", what: "The normalized project signal is UNVERIFIED.", why: "An unverified audit claim is a limitation; it does not establish that the contract is unsafe.", dataPoint: p.auditClaim, impact: 5 });

  addFinding({ id: "positive-source", severity: "POSITIVE", title: "Contract source is verified", what: "Available evidence reports verified source code.", why: "Verified source improves inspectability, although it does not guarantee safety.", dataPoint: s.sourceVerified, positive: true, when: (value) => value.value === true });
  addFinding({ id: "positive-no-mint", severity: "POSITIVE", title: "No mint capability detected", what: "Available evidence checked and did not detect mint capability.", why: "This removes one observed privileged supply-control signal from the current scan.", dataPoint: s.canMint, positive: true, when: (value) => value.value === false });
  addFinding({ id: "positive-distribution", severity: "POSITIVE", title: "Top-10 holder concentration is below 20%", what: `Top-10 holders account for ${formatValue(h.top10Percent && h.top10Percent.value)}%.`, why: "The observed distribution is below the highest concentration bands in this rubric.", dataPoint: h.top10Percent, positive: true, when: (value) => Number(value.value) < 20 });
  addFinding({ id: "positive-liquidity", severity: "POSITIVE", title: "Primary-pair liquidity is substantial", what: `Primary-pair liquidity is ${formatCurrency(liquidityUsd)}.`, why: "The observed liquidity is at or above the rubric's $100,000 lower-risk threshold.", dataPoint: l.liquidityUsd, positive: true, when: (value) => Number(value.value) >= 100000 });
  addFinding({ id: "positive-trading", severity: "POSITIVE", title: "No honeypot signal detected", what: "Available analysis checked and did not detect a honeypot signal.", why: "This is a positive result for the current snapshot, not a guarantee of safe trading.", dataPoint: t.maliciousTradingSignal, positive: true, when: (value) => value.value === false });

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

function evidencePoint(scan, dataPoint) {
  return Boolean(dataPoint && hasEvidence(dataPoint, scan.mode));
}

function trueSignal(scan, dataPoint) {
  return evidencePoint(scan, dataPoint) && dataPoint.value === true;
}

function falseSignal(scan, dataPoint) {
  return evidencePoint(scan, dataPoint) && dataPoint.value === false;
}

function numericValue(scan, dataPoint) {
  if (!evidencePoint(scan, dataPoint)) return null;
  const value = Number(dataPoint.value);
  return Number.isFinite(value) ? value : null;
}

function intelligenceConfidence(scan, dataPoints) {
  const usable = dataPoints.filter((dataPoint) => evidencePoint(scan, dataPoint));
  if (!usable.length) return "UNKNOWN";
  if (scan.mode === "DEMO" || usable.every((dataPoint) => dataPoint.confidence === "HIGH")) return "HIGH";
  return "MEDIUM";
}

function capabilityControl(scan, dataPoint) {
  const ownerControl = scan.security?.ownerControl;
  if (!evidencePoint(scan, dataPoint)) return "UNKNOWN";
  if (evidencePoint(scan, ownerControl)) return ownerControl.value || "UNKNOWN";
  return "UNKNOWN";
}

function buildIntelligence(scan, risk) {
  const s = scan.security || {};
  const t = scan.trading || {};
  const h = scan.holders || {};
  const l = scan.liquidity || {};
  const d = scan.deployer || {};
  const m = scan.market || {};
  const categories = risk.categories || {};
  const levelFor = (category) => category?.score === null || category?.score === undefined ? "UNKNOWN" : riskLevel(category.score);
  const categoryReason = {
    contract: trueSignal(scan, s.canMint) ? "Privileged supply control was detected." :
      trueSignal(scan, s.canChangeTax) ? "A privileged tax-setting capability was detected." :
        trueSignal(scan, s.isUpgradeable) ? "Upgradeable contract control was detected." :
          falseSignal(scan, s.canMint) ? "No mint capability was detected in available evidence." : "No major contract-control signal was detected.",
    trading: trueSignal(scan, t.sellRestriction) ? "A sell restriction was detected." :
      trueSignal(scan, t.maliciousTradingSignal) ? "A honeypot signal was detected." :
        numericValue(scan, t.sellTax) !== null && numericValue(scan, t.sellTax) >= TAX_THRESHOLDS.veryHighSellTax ? "Observed sell tax meets the high-tax threshold." :
          falseSignal(scan, t.sellRestriction) ? "No sell restriction was detected in available evidence." : "Trading controls are only partially covered.",
    holder: numericValue(scan, h.top10Percent) !== null ? `Top-10 holders control ${formatValue(h.top10Percent.value)}% of supply.` : "Holder concentration is not sufficiently evidenced.",
    liquidity: numericValue(scan, l.liquidityUsd) !== null ? `Primary-pair liquidity is ${formatCurrency(l.liquidityUsd.value)}.` : "Liquidity depth is not sufficiently evidenced.",
    deployer: trueSignal(scan, d.suspiciousBehavior) ? "Suspicious deployer behavior was reported." :
      numericValue(scan, d.tokenConcentration) !== null && numericValue(scan, d.tokenConcentration) >= 20 ? "Material deployer token concentration was detected." : "No major deployer signal was detected.",
    marketProject: numericValue(scan, m.change24h) !== null && Math.abs(numericValue(scan, m.change24h)) >= 25 ? "Large short-term market movement was observed." :
      "Market and project context is based on available evidence.",
  };
  const profile = Object.entries(categoryLabelsForEngine()).map(([key, label]) => ({
    key,
    label,
    score: categories[key]?.score ?? null,
    level: levelFor(categories[key]),
    reason: categories[key]?.score === null || categories[key]?.score === undefined ? "Insufficient evidence available." : categoryReason[key],
    coverage: categories[key]?.coverage ?? 0,
  }));

  const capabilityDefinitions = [
    ["canMint", "Mint new tokens", "A privileged address may be able to create additional tokens.", "Additional supply could dilute existing holders and create selling pressure.", "HIGH"],
    ["canPause", "Pause transfers", "A privileged address may be able to interrupt token transfers.", "Transfers could become temporarily unavailable for users.", "HIGH"],
    ["canBlacklist", "Blacklist addresses", "The contract may be able to restrict specific addresses.", "A targeted address may be prevented from transferring.", "HIGH"],
    ["canWhitelist", "Whitelist addresses", "The contract exposes address-list control.", "Transfer access or exemptions may be selectively changed.", "MEDIUM"],
    ["canChangeTax", "Modify taxes", "A privileged address may be able to change transaction taxes.", "Transfer economics could change after deployment.", "HIGH"],
    ["maxTransactionRestriction", "Modify anti-whale limits", "Transaction or wallet limits may be modifiable.", "A privileged change could restrict transaction size or wallet balances.", "MEDIUM"],
    ["canWithdraw", "Withdraw contract funds", "A privileged address may be able to withdraw contract-held funds.", "Assets held by the contract may be subject to privileged withdrawal.", "HIGH"],
    ["isUpgradeable", "Upgrade / proxy", "The contract is reported as upgradeable.", "Future implementation changes could alter contract behavior.", "HIGH"],
    ["ownerControl", "Ownership control", "An active privileged control address was identified.", "The privileged address may be able to exercise detected capabilities.", "HIGH"],
  ];
  const capabilities = capabilityDefinitions.map(([key, label, meaning, impact, severity]) => {
    const dataPoint = key === "ownerControl" ? s.ownerControl : key === "maxTransactionRestriction" ? t.maxTransactionRestriction : s[key];
    const detected = key === "ownerControl" ? dataPoint?.value === "ACTIVE" : trueSignal(scan, dataPoint);
    const notDetected = key !== "ownerControl" && falseSignal(scan, dataPoint);
    const status = !evidencePoint(scan, dataPoint) ? "UNKNOWN" : detected ? "DETECTED" : notDetected ? "NOT_DETECTED" : formatValue(dataPoint.value);
    return {
      key, label, status, detected, meaning, impact: detected ? impact : "No observed addition.",
      control: detected ? capabilityControl(scan, dataPoint) : "—",
      severity: detected ? severity : "—",
      evidence: detected || notDetected ? (dataPoint.evidenceId || null) : null,
      confidence: findingConfidence(scan, dataPoint),
      owner: detected ? (valueForPoint(s.ownerAddress) || null) : null,
    };
  });
  const detectedCapabilities = capabilities.filter((capability) => capability.detected);
  const owner = valueForPoint(s.ownerAddress) || (evidencePoint(scan, d.address) ? d.address.value : null);
  const activeOwner = trueSignal(scan, s.ownerControl) || (owner && owner !== "0x0000000000000000000000000000000000000000");
  const impactItems = scan.findings.filter((finding) => !finding.positive).slice(0, 8).map((finding) => ({
    id: finding.id,
    title: finding.title,
    what: finding.what,
    why: finding.why,
    impact: impactForFinding(finding),
    control: finding.id.startsWith("contract-") ? "Privileged owner/admin." : "The relevant contract or market condition.",
    evidence: "Contract Analysis",
    confidence: finding.confidence,
  }));

  const sellTax = numericValue(scan, t.sellTax);
  const buyTax = numericValue(scan, t.buyTax);
  const liquidityUsd = numericValue(scan, l.liquidityUsd);
  const exitSignals = [
    { label: "SELL SIMULATION", value: trueSignal(scan, t.sellRestriction) || trueSignal(scan, t.maliciousTradingSignal) ? "FAIL" : falseSignal(scan, t.sellRestriction) && falseSignal(scan, t.maliciousTradingSignal) ? "PASS" : "UNKNOWN" },
    { label: "SELL TAX", value: sellTax === null ? "UNKNOWN" : `${formatValue(sellTax)}%` },
    { label: "SELL RESTRICTION", value: trueSignal(scan, t.sellRestriction) ? "DETECTED" : falseSignal(scan, t.sellRestriction) ? "NOT DETECTED" : "UNKNOWN" },
    { label: "LIQUIDITY", value: liquidityUsd === null ? "UNKNOWN" : formatCurrency(liquidityUsd) },
  ];
  let exitLevel = "UNKNOWN";
  if (trueSignal(scan, t.sellRestriction) || trueSignal(scan, t.maliciousTradingSignal) || (sellTax !== null && sellTax >= TAX_THRESHOLDS.veryHighSellTax)) exitLevel = "HIGH";
  else if (liquidityUsd !== null && liquidityUsd < 10000) exitLevel = "HIGH";
  else if (liquidityUsd !== null && liquidityUsd < 100000 || trueSignal(scan, t.maxTransactionRestriction) || trueSignal(scan, t.maxWalletRestriction)) exitLevel = "MODERATE";
  else if (falseSignal(scan, t.sellRestriction) && falseSignal(scan, t.maliciousTradingSignal) && liquidityUsd !== null) exitLevel = "LOW RISK";
  const exitExplanation = exitLevel === "UNKNOWN" ? "Insufficient evidence is available to assess practical exit conditions." :
    exitLevel === "LOW RISK" ? "Available evidence indicates no major sell restriction signal, but this is not a guarantee of execution." :
      "Available evidence indicates that selling may be possible, but trading controls, liquidity, or tax conditions may affect practical exit conditions.";

  const compoundRisks = [];
  const addCompound = (id, level, title, explanation, signals) => compoundRisks.push({ id, level, title, explanation, signals });
  const highConcentration = (numericValue(scan, h.top10Percent) ?? -1) >= 60;
  const lowLiquidity = liquidityUsd !== null && liquidityUsd < 10000;
  const highTax = (sellTax !== null && sellTax >= TAX_THRESHOLDS.veryHighSellTax) || (buyTax !== null && buyTax >= TAX_THRESHOLDS.veryHighBuyTax);
  const tradingRestriction = trueSignal(scan, t.sellRestriction) || trueSignal(scan, t.buyRestriction);
  if (trueSignal(scan, s.canMint) && highConcentration && lowLiquidity) addCompound("mint-concentration-liquidity", "HIGH", "Privileged supply control + concentration + thin liquidity", "Multiple independent risk signals reinforce each other: privileged supply control, concentrated ownership and limited liquidity.", ["Mint capability", "Top-10 concentration", "Liquidity depth"]);
  if (highConcentration && lowLiquidity) addCompound("concentration-liquidity", "HIGH", "Concentrated ownership + thin liquidity", "A concentrated holder base and limited liquidity can amplify the market impact of large holder activity.", ["Top-10 concentration", "Liquidity depth"]);
  if (highTax && lowLiquidity) addCompound("tax-liquidity", "HIGH", "High tax + thin liquidity", "High transaction costs combined with limited liquidity may make practical exits more difficult.", ["Tax signal", "Liquidity depth"]);
  if (trueSignal(scan, s.canPause) && activeOwner) addCompound("pause-active-owner", "HIGH", "Pause capability + active control", "A detected pause capability is paired with an active privileged control address.", ["Pause capability", "Active owner"]);
  if (trueSignal(scan, s.isUpgradeable) && activeOwner) addCompound("proxy-active-owner", "HIGH", "Upgradeable contract + active control", "An active privileged address and upgradeability could allow future behavior changes.", ["Upgrade capability", "Active owner"]);
  if (highTax && tradingRestriction) addCompound("tax-trading-restriction", "HIGH", "High tax + trading restriction", "Tax conditions and trading restrictions reinforce one another as an exitability concern.", ["Tax signal", "Trading restriction"]);

  const scoreItems = (risk.calculation || []).map((item) => ({
    name: item.name,
    label: categoryLabelsForEngine()[item.name],
    score: item.score,
    weight: item.originalWeight,
    appliedWeight: item.appliedWeight,
    contribution: item.contribution,
  }));
  const driver = scoreItems.slice().sort((a, b) => b.contribution - a.contribution)[0] || null;
  const overallCoverage = Object.values(categories).length ? Math.round(Object.values(categories).reduce((sum, category) => sum + category.coverage, 0) / Object.values(categories).length) : 0;
  return {
    riskProfile: profile,
    capabilities,
    powerMap: {
      owner: owner ? truncateAddress(owner) : "UNKNOWN",
      ownerFull: owner,
      control: activeOwner ? "ACTIVE" : evidencePoint(scan, s.ownerControl) ? s.ownerControl.value : "UNKNOWN",
      capabilities: detectedCapabilities.map((capability) => capability.label),
      impacts: detectedCapabilities.map((capability) => capability.impact),
    },
    impacts: impactItems,
    exitability: { level: exitLevel, signals: exitSignals, explanation: exitExplanation },
    scoreExplanation: {
      items: scoreItems,
      total: scoreItems.reduce((sum, item) => sum + item.contribution, 0),
      final: risk.finalScore,
      mainDriver: driver ? `${driver.label} contributed the largest share of the current risk score.` : "No eligible category contributed to the current risk score.",
    },
    compoundRisks,
    dataCoverage: {
      overall: overallCoverage,
      categories: profile.map(({ key, label, coverage }) => ({ key, label, coverage, status: coverage >= 100 ? "FULL" : coverage > 0 ? "PARTIAL" : "UNKNOWN" })),
    },
    timeline: {
      status: evidencePoint(scan, d.deploymentDate) ? "AVAILABLE" : "LIMITED EVIDENCE",
      items: [
        { label: "DEPLOYED", value: valueForPoint(d.deploymentDate) || "UNKNOWN" },
        { label: "OWNERSHIP", value: owner ? truncateAddress(owner) : "UNKNOWN" },
        { label: "LIQUIDITY", value: liquidityUsd === null ? "UNKNOWN" : formatCurrency(liquidityUsd) },
        { label: "CURRENT", value: formatDateValue(scan.timestamp) },
      ],
    },
    addressRelationships: owner || evidencePoint(scan, d.address) ? [
      { label: "DEPLOYER", value: valueForPoint(d.address) || "UNKNOWN" },
      { label: "TOKEN CONTRACT", value: scan.contract.address },
      { label: "OWNER", value: owner || "UNKNOWN" },
    ] : [],
  };
}

function categoryLabelsForEngine() {
  return { contract: "Contract Control", trading: "Trading", holder: "Holder Concentration", liquidity: "Liquidity", deployer: "Deployer", marketProject: "Market / Project" };
}

function valueForPoint(dataPoint) {
  return dataPoint && dataPoint.value !== null && dataPoint.value !== undefined && dataPoint.value !== "" ? dataPoint.value : null;
}

function formatDateValue(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

function impactForFinding(finding) {
  if (finding.id.includes("mint")) return "Additional supply could reduce the relative ownership of existing holders and increase selling pressure.";
  if (finding.id.includes("sell") || finding.id.includes("buy")) return "Trading access or practical exit conditions could be restricted.";
  if (finding.id.includes("liquidity")) return "Limited market depth can increase execution impact and market fragility.";
  if (finding.id.includes("holder")) return "A small number of wallets may have a larger effect on supply and liquidity.";
  if (finding.id.includes("deployer")) return "Deployer activity may warrant review alongside the contract and distribution evidence.";
  return "The signal may affect how the contract should be independently reviewed.";
}

function finalizeScan(scan) {
  const risk = calculateCategoryScores(scan);
  scan.risk = risk;
  scan.riskScore = risk.finalScore;
  scan.reliability = calculateReliability(scan, risk);
  scan.reliabilityScore = scan.reliability.score;
  scan.findings = generateFindings(scan, risk);
  scan.intelligence = buildIntelligence(scan, risk);
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

function toPublicScan(scan) {
  const publicScan = JSON.parse(JSON.stringify(scan));
  const stripPointProvenance = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(stripPointProvenance);
      return;
    }
    delete value.source;
    delete value.provenance;
    delete value.evidenceStatus;
    for (const child of Object.values(value)) stripPointProvenance(child);
  };
  for (const section of ["token", "security", "trading", "holders", "liquidity", "market", "deployer", "project", "verification"]) {
    stripPointProvenance(publicScan[section]);
  }
  publicScan.findings = (publicScan.findings || []).map(({ source, ...finding }) => finding);
  publicScan.evidence = (publicScan.evidence || []).map(({ source, ...evidence }) => evidence);
  publicScan.errors = (publicScan.errors || []).map(({ provider, ...error }) => error);
  delete publicScan.providerResults;
  return publicScan;
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

function stableValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value;
}

function equivalentValues(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function isNormalizedPoint(value) {
  return value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "evidenceStatus");
}

function mergeNormalizedEvidence(scan, result) {
  const mergeSection = (target, incoming, path = []) => {
    for (const [key, value] of Object.entries(incoming || {})) {
      if (isNormalizedPoint(value)) {
        const current = target[key];
        if (!current || !isNormalizedPoint(current)) {
          target[key] = value;
          continue;
        }
        const currentValid = current.evidenceStatus === PROVIDER_RESULT_STATUS.VALID && current.status !== STATUS.UNKNOWN;
        const incomingValid = value.evidenceStatus === PROVIDER_RESULT_STATUS.VALID && value.status !== STATUS.UNKNOWN;
        if (!currentValid && incomingValid) {
          target[key] = value;
          continue;
        }
        if (currentValid && incomingValid && !equivalentValues(current.value, value.value)) {
          const conflictPath = [...path, key].join(".");
          scan.conflicts.push({
            path: conflictPath,
            status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR,
            values: [stableValue(current.value), stableValue(value.value)],
            evidenceReferences: [current.evidenceId, value.evidenceId].filter(Boolean),
          });
          target[key] = point(
            null,
            STATUS.UNKNOWN,
            "Conflicting normalized evidence",
            "UNKNOWN",
            null,
            null,
            false,
            PROVIDER_RESULT_STATUS.UNKNOWN,
            {
              engineVersion: ENGINE_VERSION,
              schemaVersion: EVIDENCE_SCHEMA_VERSION,
              conflictPath,
            },
          );
        }
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        mergeSection(target[key], value, [...path, key]);
      }
    }
  };
  mergeSection(scan, result.evidence);
}

function applyProviderResult(scan, result) {
  scan.providerResults.push({
    providerId: result.providerId,
    status: result.status,
    adapterVersion: result.adapterVersion,
    retrievedAt: result.retrievedAt,
    confidence: result.confidence,
    errorCode: result.errorCode,
    limitations: result.limitations,
  });
  if (result.limitations?.length) scan.limitations.push(...result.limitations);
  if (result.status === PROVIDER_RESULT_STATUS.VALID) {
    mergeNormalizedEvidence(scan, result);
    return true;
  }
  if (result.status === PROVIDER_RESULT_STATUS.PROVIDER_ERROR || result.status === PROVIDER_RESULT_STATUS.UNAVAILABLE) {
    scan.errors.push({
      provider: result.providerId,
      code: result.errorCode || result.status.toUpperCase(),
      message: result.message || "Provider evidence was not usable.",
      status: result.status,
    });
  }
  return false;
}

function validateScanTarget(address, networkId) {
  const addressValidation = validateAddress(address);
  if (!addressValidation.valid) return addressValidation;
  const network = networkById(networkId);
  if (!network) return { valid: false, code: "UNSUPPORTED_NETWORK", message: "Select a supported network." };
  return { valid: true, normalized: addressValidation.normalized, network };
}

async function scanLive({ address, networkId, providerRegistry = createDefaultProviderRegistry() }) {
  const validation = validateScanTarget(address, networkId);
  if (!validation.valid) {
    const validationError = new Error(validation.code);
    const { message, ...validationDetails } = validation;
    Object.assign(validationError, validationDetails, { validationMessage: message });
    throw validationError;
  }
  const timestamp = new Date().toISOString();
  const scan = createBaseScan({ mode: "LIVE", address: validation.normalized, network: validation.network, timestamp });
  const providers = providerRegistry.list().slice().sort((left, right) => left.id.localeCompare(right.id));
  const context = {
    address: validation.normalized,
    network: validation.network,
  };
  const results = await Promise.allSettled(providers.map((provider) => providerRegistry.fetch(provider.id, context)));
  let successes = 0;
  for (const [index, result] of results.entries()) {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      try {
        providerRegistry.validateResponse(provider.id, result.value.json);
        const normalized = providerRegistry.normalizeResponse(provider.id, {
          response: result.value.json,
          retrievedAt: result.value.retrievedAt,
          ...context,
        });
        if (applyProviderResult(scan, normalized)) successes += 1;
      } catch (error) {
        applyProviderResult(scan, {
          providerId: provider.id,
          adapterVersion: provider.version,
          status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR,
          retrievedAt: result.value.retrievedAt,
          confidence: "UNKNOWN",
          errorCode: error.code || "PROVIDER_RESPONSE_INVALID",
          message: "Provider response failed validation or normalization.",
          limitations: [],
        });
      }
    } else {
      const error = result.reason;
      applyProviderResult(scan, {
        providerId: provider.id,
        adapterVersion: provider.version,
        status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR,
        retrievedAt: null,
        confidence: "UNKNOWN",
        errorCode: error.code || "PROVIDER_ERROR",
        message: "Provider request failed.",
        limitations: [],
      });
    }
  }
  const missing = {
    token: ["name", "symbol", "decimals", "totalSupply"],
    security: ["canMint", "canBlacklist", "canWhitelist", "canPause", "canChangeTax", "isUpgradeable", "canWithdraw", "sourceVerified", "ownerAddress", "ownerControl"],
    trading: ["buyTax", "sellTax", "transferTax", "sellRestriction", "buyRestriction", "maliciousTradingSignal", "taxChangeable", "maxTransactionRestriction", "maxWalletRestriction", "tradingPause", "hasPair"],
    holders: ["totalHolders", "top10Percent", "deployerPercent"],
    deployer: ["address"],
    project: ["website", "addressConsistency", "auditClaim"],
  };
  for (const [section, fields] of Object.entries(missing)) {
    for (const field of fields) {
      if (!scan[section][field]) scan[section][field] = unknown("No normalized provider evidence");
    }
  }
  scan.stages.push(successes ? "COMPLETE" : "ERROR");
  if (successes < providers.length) scan.limitations.push("Coverage is partial because not every provider returned usable normalized evidence.");
  if (scan.conflicts.length) {
    scan.errors.push({
      provider: "normalized-evidence",
      code: "PROVIDER_CONFLICT",
      message: "Multiple normalized sources returned conflicting values.",
      status: PROVIDER_RESULT_STATUS.PROVIDER_ERROR,
    });
  }
  scan.dataStatus = scan.errors.length
    ? (scan.conflicts.length ? "provider_error" : "partial")
    : successes
      ? PROVIDER_RESULT_STATUS.VALID
      : PROVIDER_RESULT_STATUS.UNKNOWN;
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
  validateScanTarget,
  truncateAddress,
  createDemoScan,
  createDefaultProviderRegistry,
  toPublicScan,
  calculateCategoryScores,
  calculateReliability,
  generateFindings,
  scanLive,
  formatValue,
  formatCurrency,
};