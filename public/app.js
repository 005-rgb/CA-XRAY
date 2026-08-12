const landing = document.querySelector("#landing");
const loading = document.querySelector("#scan-loading");
const report = document.querySelector("#report");
const form = document.querySelector("#scan-form");
const addressInput = document.querySelector("#contract-address");
const networkInput = document.querySelector("#network");
const addressError = document.querySelector("#address-error");
const networkError = document.querySelector("#network-error");
const clearAddress = document.querySelector("#clear-address");
const loadingStages = document.querySelector("#loading-stages");
let currentScan = null;

const categoryLabels = {
  contract: "Contract",
  trading: "Trading",
  holder: "Holder",
  liquidity: "Liquidity",
  deployer: "Deployer",
  marketProject: "Market / Project",
};

const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, POSITIVE: 4 };

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function valueOf(dataPoint, fallback = "UNKNOWN") {
  if (!dataPoint || dataPoint.value === null || dataPoint.value === undefined || dataPoint.value === "") return fallback;
  return dataPoint.value;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "UNKNOWN";
  if (typeof value === "boolean") return value ? "DETECTED" : "NOT DETECTED";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return String(value);
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return "UNKNOWN";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}%` : "UNKNOWN";
}

function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

function truncateAddress(value) {
  if (!value || value === "UNKNOWN") return "UNKNOWN";
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function statusClass(status) {
  return String(status || "UNKNOWN").toLowerCase().replaceAll("_", "-");
}

function statusPill(dataPoint, valueOverride = null) {
  const status = dataPoint?.status || "UNKNOWN";
  const label = valueOverride || status.replaceAll("_", " ");
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(label)}</span>`;
}

function pointText(dataPoint, formatter = formatValue) {
  if (!dataPoint || dataPoint.value === null || dataPoint.value === undefined || dataPoint.value === "") {
    return statusPill(dataPoint);
  }
  return `${escapeHtml(formatter(dataPoint.value))} ${statusPill(dataPoint)}`;
}

function pointEvidence(dataPoint) {
  if (!dataPoint) return "UNKNOWN";
  return dataPoint.evidenceId ? `<span class="evidence-id">${escapeHtml(dataPoint.evidenceId)}</span>` : "—";
}

function showLanding() {
  landing.hidden = false;
  loading.hidden = true;
  report.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLoading(stages = []) {
  landing.hidden = true;
  report.hidden = true;
  loading.hidden = false;
  loadingStages.innerHTML = (stages.length ? stages : ["VALIDATING", "FETCHING DATA"]).map((stage, index) => `<span class="stage ${index === 0 ? "active" : ""}">${escapeHtml(stage)}</span>`).join("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateLoading(scan) {
  if (!scan?.stages) return;
  loadingStages.innerHTML = scan.stages.map((stage, index) => `<span class="stage ${index === scan.stages.length - 1 ? "active" : "done"}">${escapeHtml(stage)}</span>`).join("");
}

function validateForm() {
  const address = addressInput.value.trim();
  let valid = true;
  addressError.textContent = "";
  networkError.textContent = "";
  if (!address) {
    addressError.textContent = "Paste a contract address to begin.";
    valid = false;
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    addressError.textContent = "Enter a valid 42-character EVM contract address.";
    valid = false;
  }
  if (!networkInput.value) {
    networkError.textContent = "Select a supported network for a live scan.";
    valid = false;
  }
  return valid;
}

async function scanLive() {
  if (!validateForm()) return;
  showLoading(["VALIDATING", "FETCHING DATA"]);
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressInput.value.trim(), network: networkInput.value }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "The scan failed.");
    currentScan = body.scan;
    updateLoading(currentScan);
    renderReport(currentScan);
  } catch (error) {
    loading.hidden = true;
    landing.hidden = false;
    addressError.textContent = error.message;
  }
}

async function scanDemo(scenario) {
  showLoading(["BUILDING REPORT"]);
  try {
    const response = await fetch(`/api/demo?scenario=${encodeURIComponent(scenario)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "The demo could not be loaded.");
    currentScan = body.scan;
    updateLoading(currentScan);
    renderReport(currentScan);
  } catch (error) {
    loading.hidden = true;
    landing.hidden = false;
    addressError.textContent = error.message;
  }
}

function scoreTone(score) {
  if (score === null || score === undefined) return "";
  if (score >= 61) return "risk-high";
  if (score >= 41) return "risk-medium";
  return "risk-low";
}

function dataCoverage(scan) {
  if (scan.mode === "DEMO") return "DEMO FIXTURE";
  const values = Object.values(scan.risk?.categories || {});
  if (!values.length) return "UNKNOWN";
  return `${Math.round(values.reduce((total, category) => total + category.coverage, 0) / values.length)}%`;
}

function scanConfidence(scan) {
  return scan.risk?.confidence || "UNKNOWN";
}

function coverageClass(coverage) {
  return Math.min(100, Math.max(0, Math.round(Number(coverage || 0) / 10) * 10));
}

function summaryParagraph(scan) {
  if (!scan.risk || scan.risk.finalScore === null) {
    return "The available evidence does not support a reliable final risk score. Missing categories and provider limitations are shown below; UNKNOWN is not treated as a healthy result.";
  }
  const risks = scan.findings.filter((finding) => !finding.positive).slice(0, 2).map((finding) => finding.title.toLowerCase());
  const limitation = scan.risk.partialData ? "The assessment is partial because some categories are not sufficiently covered." : "All six risk categories have usable evidence for this snapshot.";
  return `The observed evidence maps to a ${scan.risk.level.toLowerCase()} risk level. ${risks.length ? `The most material signals are ${risks.join(" and ")}.` : "No material negative finding was generated from the available evidence."} ${limitation} This is an assessment based on available data at scan time, not financial advice.`;
}

function metaValue(dataPoint, formatter = formatValue) {
  return `<div class="data-value">${pointText(dataPoint, formatter)}</div>`;
}

function renderHero(scan) {
  const name = escapeHtml(valueOf(scan.token.name, "Token identity unavailable"));
  const symbol = escapeHtml(valueOf(scan.token.symbol, ""));
  const score = scan.risk?.finalScore;
  const scoreMarkup = score === null || score === undefined
    ? `<div class="score-number insufficient">INSUFFICIENT DATA<br />FOR RELIABLE SCORE</div>`
    : `<div class="score-number ${scoreTone(score)}">${Math.round(score)}<small>/100</small></div>`;
  const levelMarkup = scan.risk?.level ? `<div class="score-level ${scoreTone(score)}">${escapeHtml(scan.risk.level)}</div>` : `<div class="score-level">SCORE BLOCKED</div>`;
  return `
    <div class="report-topbar">
      <button class="back-button" id="back-home">← BACK TO ANALYZER</button>
      <div class="report-meta"><span>${escapeHtml(scan.scanId)}</span><span class="mode-badge ${scan.mode === "DEMO" ? "demo" : ""}">${escapeHtml(scan.mode)} SCAN</span></div>
    </div>
    ${scan.mode === "DEMO" ? `<div class="demo-banner">DEMO DATA — NOT LIVE BLOCKCHAIN DATA &nbsp; / &nbsp; ENGINE REPRODUCIBILITY: HIGH &nbsp; / &nbsp; LIVE EVIDENCE: NOT APPLICABLE</div>` : ""}
    ${scan.errors.length ? `<div class="error-banner"><strong>PARTIAL DATA:</strong> ${scan.errors.map((error) => `${escapeHtml(error.provider)} — ${escapeHtml(error.code)}`).join(" · ")}</div>` : ""}
    <div class="report-hero">
      <div class="report-identity">
        <p class="eyebrow">CA X-RAY / FORENSIC REPORT</p>
        <h1>${name}${symbol ? ` <span class="symbol">/ ${symbol}</span>` : ""}</h1>
        <p>${escapeHtml(summaryParagraph(scan))}</p>
        <div class="identity-grid">
          <div><div class="data-label">NETWORK</div><div class="data-value">${escapeHtml(scan.network.name)}</div></div>
          <div><div class="data-label">SCAN MODE</div><div class="data-value">${statusPill({ status: scan.mode === "DEMO" ? "DEMO" : "VERIFIED" }, scan.mode)}</div></div>
          <div><div class="data-label">DATA COVERAGE</div><div class="data-value">${escapeHtml(dataCoverage(scan))}</div></div>
          <div class="identity-address"><div class="data-label">CONTRACT</div><div class="address-row"><span class="data-value address-text">${escapeHtml(truncateAddress(scan.contract.address))}</span><button class="copy-button" data-copy="${escapeHtml(scan.contract.address)}">COPY</button></div></div>
          <div><div class="data-label">SCAN TIME</div><div class="data-value">${escapeHtml(formatDate(scan.timestamp))}</div></div>
          <div><div class="data-label">IDENTITY</div><div class="data-value">${statusPill({ status: scan.contract.validated && scan.network.validated ? "VERIFIED" : "UNKNOWN" }, scan.contract.validated ? "VALIDATED" : "UNKNOWN")}</div></div>
        </div>
      </div>
      <div class="score-panel">
        <div class="score-label">OVERALL RISK</div>
        ${scoreMarkup}
        ${levelMarkup}
        <div class="score-facts">
          <div><div class="data-label">RELIABILITY</div><div class="data-value">${scan.reliability ? `${Math.round(scan.reliability.score)} / 100` : "UNKNOWN"}</div></div>
          <div><div class="data-label">CONFIDENCE</div><div class="data-value">${escapeHtml(scanConfidence(scan))}</div></div>
        </div>
      </div>
    </div>`;
}

function sectionHeading(number, title, kicker = "") {
  return `<div class="section-heading"><h2>${escapeHtml(title)}</h2><span class="section-number">${escapeHtml(kicker || number)}</span></div>`;
}

function renderExecutiveSummary(scan) {
  const risks = scan.findings.filter((finding) => !finding.positive).slice(0, 3);
  const positives = scan.findings.filter((finding) => finding.positive).slice(0, 3);
  const limitations = scan.limitations.length ? scan.limitations : ["No additional limitations were generated for this snapshot."];
  return `<section class="report-section full">${sectionHeading("01", "EXECUTIVE SUMMARY", "01 / 08")}
    <div class="summary-grid">
      <div>
        <p class="section-intro">${escapeHtml(summaryParagraph(scan))}</p>
        <div class="signal-columns">
          <div><div class="data-label">TOP 3 RISKS</div><ul class="signal-list">${(risks.length ? risks : [{ title: "No evidence-backed risk finding", severity: "UNKNOWN" }]).map((finding) => `<li><span class="signal-severity ${finding.severity === "UNKNOWN" ? "" : "risk-high"}">${escapeHtml(finding.severity)}</span>${escapeHtml(finding.title)}</li>`).join("")}</ul></div>
          <div><div class="data-label">TOP 3 POSITIVE SIGNALS</div><ul class="signal-list">${(positives.length ? positives : [{ title: "No positive signal was established", severity: "UNKNOWN" }]).map((finding) => `<li><span class="signal-severity positive-text">${escapeHtml(finding.severity)}</span>${escapeHtml(finding.title)}</li>`).join("")}</ul></div>
        </div>
      </div>
      <div><div class="data-label">IMPORTANT LIMITATIONS</div><ul class="limitation-list">${limitations.map((limitation) => `<li>${escapeHtml(limitation)}</li>`).join("")}</ul></div>
    </div>
  </section>`;
}

function renderRiskBreakdown(scan) {
  const categories = scan.risk?.categories || {};
  const rows = Object.entries(categoryLabels).map(([key, label]) => {
    const category = categories[key] || {};
    const score = category.score === null || category.score === undefined ? "UNKNOWN" : `${Math.round(category.score)} / 100`;
    const applied = category.score === null || category.score === undefined ? "EXCLUDED" : `${(category.appliedWeight * 100).toFixed(2)}%`;
    return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(score)}</td><td>${(category.originalWeight * 100).toFixed(0)}%</td><td>${escapeHtml(applied)}</td><td>${statusPill({ status: category.status }, category.status)}</td><td><div class="risk-bar coverage-${coverageClass(category.coverage)}"><span></span></div><small>${category.coverage || 0}%</small></td></tr>`;
  }).join("");
  const calculations = scan.risk?.calculation || [];
  const calcLines = calculations.map((item) => `<div><strong>${escapeHtml(categoryLabels[item.name])}:</strong> ${Math.round(item.score)} × ${(item.originalWeight * 100).toFixed(0)}% = ${(item.contribution).toFixed(2)} <span>→ applied ${(item.appliedWeight * 100).toFixed(2)}%</span></div>`).join("");
  const finalLine = scan.risk?.finalScore === null ? "Final: INSUFFICIENT DATA FOR RELIABLE SCORE" : `Final: ${calculations.reduce((sum, item) => sum + item.contribution, 0).toFixed(2)} ÷ ${(scan.risk.availableWeight * 100).toFixed(2)}% = ${scan.risk.finalScore.toFixed(2)}`;
  const r = scan.reliability?.components || {};
  return `<section class="report-section full">${sectionHeading("02", "RISK BREAKDOWN", "02 / 08")}
    <div class="table-wrap"><table><thead><tr><th>CATEGORY</th><th>SCORE</th><th>ORIGINAL WEIGHT</th><th>APPLIED WEIGHT</th><th>STATUS</th><th>COVERAGE</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="breakdown-note">${scan.risk?.partialData ? "This report is marked PARTIAL DATA. UNKNOWN and UNAVAILABLE categories are omitted from the numerator; their original weights are redistributed only across eligible categories." : "All original category weights are applied because each category has sufficient evidence in this snapshot."}</p>
    <div class="calculation"><div><strong>HOW THE SCORE WAS CALCULATED</strong></div>${calcLines || "<div>Category scores are not eligible for a final calculation.</div>"}<div class="calc-total">${escapeHtml(finalLine)}</div></div>
    <div class="calculation"><div><strong>RELIABILITY CALCULATION</strong></div><div>E: ${r.E ?? 0} × 35%</div><div>S: ${r.S ?? 0} × 20%</div><div>F: ${r.F ?? 0} × 15%</div><div>C: ${r.C ?? 0} × 15%</div><div>R: ${r.R ?? 0} × 10%</div><div>I: ${r.I ?? 0} × 5%</div><div class="calc-total">Reliability: ${scan.reliability ? Math.round(scan.reliability.score) : "UNKNOWN"} / 100</div></div>
  </section>`;
}

function capabilityRow(label, dataPoint, impact) {
  const state = dataPoint?.status || "UNKNOWN";
  const isDetected = dataPoint?.value === true;
  const isNegative = isDetected || (label === "Source verification" && dataPoint?.value === false);
  return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${pointText(dataPoint)}</td><td class="impact">${isNegative ? escapeHtml(impact) : "No observed addition"}</td><td>${pointEvidence(dataPoint)}</td><td>${escapeHtml(dataPoint?.source || "UNKNOWN")}</td><td>${statusPill(dataPoint, dataPoint?.confidence || "UNKNOWN")}</td></tr>`;
}

function tradingRow(label, dataPoint, formatter = formatValue, impact = "—") {
  return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${pointText(dataPoint, formatter)}</td><td class="impact">${escapeHtml(impact)}</td><td>${pointEvidence(dataPoint)}</td><td>${escapeHtml(dataPoint?.source || "UNKNOWN")}</td><td>${statusPill(dataPoint, dataPoint?.confidence || "UNKNOWN")}</td></tr>`;
}

function renderForensics(scan) {
  const s = scan.security || {};
  const t = scan.trading || {};
  return `<section class="report-section full">${sectionHeading("03", "CONTRACT & TRADING FORENSICS", "03 / 08")}
    <div class="forensic-grid">
      <div><h3 class="subheading">CONTRACT CAPABILITIES</h3><div class="table-wrap"><table><thead><tr><th>CAPABILITY</th><th>STATUS</th><th>IMPACT</th><th>EVIDENCE</th><th>SOURCE</th><th>CONFIDENCE</th></tr></thead><tbody>
        ${capabilityRow("Mint additional tokens", s.canMint, "+30")}
        ${capabilityRow("Blacklist addresses", s.canBlacklist, "+20")}
        ${capabilityRow("Whitelist restrictions", s.canWhitelist, "+10")}
        ${capabilityRow("Pause transfers", s.canPause, "+15")}
        ${capabilityRow("Modify transaction tax", s.canChangeTax, "+20")}
        ${capabilityRow("Upgradeable / proxy", s.isUpgradeable, "+15")}
        ${capabilityRow("Withdraw funds", s.canWithdraw, "+15")}
        ${capabilityRow("Source verification", s.sourceVerified, "Unverified +10")}
      </tbody></table></div></div>
      <div><h3 class="subheading">TRADING SIGNALS</h3><div class="table-wrap"><table><thead><tr><th>SIGNAL</th><th>VALUE / STATUS</th><th>IMPACT</th><th>EVIDENCE</th><th>SOURCE</th><th>CONFIDENCE</th></tr></thead><tbody>
        ${tradingRow("Buy tax", t.buyTax, formatPercent, "≥15% adds +15")}
        ${tradingRow("Sell tax", t.sellTax, formatPercent, "≥20% adds +20")}
        ${tradingRow("Transfer tax", t.transferTax, formatPercent)}
        ${tradingRow("Sell restriction", t.sellRestriction, formatValue, "+30")}
        ${tradingRow("Buy restriction", t.buyRestriction, formatValue, "+20")}
        ${tradingRow("Malicious-trading signal", t.maliciousTradingSignal, formatValue, "+50")}
        ${tradingRow("Max wallet / transaction", t.maxWalletRestriction, formatValue, "+10")}
        ${tradingRow("Trading pause", t.tradingPause, formatValue, "+10")}
      </tbody></table></div></div>
    </div>
  </section>`;
}

function metric(label, dataPoint, formatter = formatValue) {
  return `<div class="metric"><div class="data-label">${escapeHtml(label)}</div>${metaValue(dataPoint, formatter)}</div>`;
}

function renderHolderLiquidity(scan) {
  const h = scan.holders || {};
  const l = scan.liquidity || {};
  const holderFields = [h.totalHolders, h.top1Percent, h.top5Percent, h.top10Percent, h.deployerPercent, h.ownerPercent, h.burnPercent, h.liquidityRelatedAddresses];
  const holderUnavailable = holderFields.every((field) => !field || field.status === "UNKNOWN" || field.status === "UNAVAILABLE" || field.status === "ERROR");
  return `<section class="report-section full">${sectionHeading("04", "HOLDER & LIQUIDITY ANALYSIS", "04 / 08")}
    <div class="forensic-grid">
      <div><h3 class="subheading">HOLDER SUMMARY</h3>${holderUnavailable ? `<div class="unknown-message">HOLDER DATA UNAVAILABLE</div>` : `<div class="metric-grid">
        ${metric("Total holders", h.totalHolders)}
        ${metric("Top 1%", h.top1Percent, formatPercent)}
        ${metric("Top 5%", h.top5Percent, formatPercent)}
        ${metric("Top 10%", h.top10Percent, formatPercent)}
        ${metric("Deployer", h.deployerPercent, formatPercent)}
        ${metric("Owner", h.ownerPercent, formatPercent)}
        ${metric("Burn", h.burnPercent, formatPercent)}
        ${metric("Liquidity-related", h.liquidityRelatedAddresses)}
      </div>`}</div>
      <div><h3 class="subheading">PRIMARY LIQUIDITY PAIR</h3>${!l.pair || l.pair.status === "UNKNOWN" ? `<div class="unknown-message">LIQUIDITY DATA UNKNOWN</div>` : `<div class="metric-grid">
        ${metric("Liquidity", l.liquidityUsd, formatCurrency)}
        ${metric("24h volume", l.volume24h, formatCurrency)}
        ${metric("Pair", l.pair, truncateAddress)}
        ${metric("DEX", l.dex)}
        ${metric("Price", l.price, (value) => `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 8 })}`)}
        ${metric("24h change", l.change24h, formatPercent)}
      </div><p class="pair-note">Primary pair rule: ${escapeHtml(l.primaryPairRule || "Provider-selected pair.")} Liquidity lock status is not claimed because no reliable lock source is configured.</p>`}</div>
    </div>
  </section>`;
}

function renderMarketDeployer(scan) {
  const m = scan.market || {};
  const d = scan.deployer || {};
  const p = scan.project || {};
  return `<section class="report-section full">${sectionHeading("05", "MARKET & DEPLOYER SIGNALS", "05 / 08")}
    <div class="forensic-grid">
      <div><h3 class="subheading">MARKET & PROJECT</h3><div class="metric-grid">
        ${metric("Price", m.price, (value) => `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 8 })}`)}
        ${metric("24h volume", m.volume24h, formatCurrency)}
        ${metric("Liquidity", m.liquidityUsd, formatCurrency)}
        ${metric("FDV", m.fdv, formatCurrency)}
        ${metric("24h change", m.change24h, formatPercent)}
        ${metric("7d change", m.change7d, formatPercent)}
        ${metric("Website", p.website)}
        ${metric("Address consistency", p.addressConsistency)}
        ${metric("Audit claim", p.auditClaim)}
      </div></div>
      <div><h3 class="subheading">DEPLOYER</h3><div class="metric-grid">
        ${metric("Address", d.address, truncateAddress)}
        ${metric("Deployment date", d.deploymentDate)}
        ${metric("Suspicious behavior", d.suspiciousBehavior)}
        ${metric("Related contracts", d.relatedContracts)}
        ${metric("Recent deployment", d.veryRecentDeployment)}
        ${metric("Token concentration", d.tokenConcentration, formatPercent)}
        ${metric("Malicious association", d.maliciousAssociation)}
      </div></div>
    </div>
  </section>`;
}

function findingRow(finding) {
  return `<tr><td>${statusPill({ status: finding.severity }, finding.severity)}</td><td><div class="finding-title">${escapeHtml(finding.title)}</div><div class="finding-why">${escapeHtml(finding.why)}</div></td><td>${escapeHtml(finding.confidence)}</td><td>${escapeHtml(finding.evidence)}</td></tr>`;
}

function renderFindings(scan) {
  const findings = scan.findings || [];
  const top = findings.slice(0, 5);
  const all = findings.slice(5);
  return `<section class="report-section full">${sectionHeading("06", "KEY FINDINGS", "06 / 08")}
    <p class="section-intro">Findings are generated only when the normalized snapshot contains supporting evidence. They are ordered by severity, risk contribution, confidence, and stable finding ID.</p>
    <div class="table-wrap"><table class="finding-table"><thead><tr><th>SEVERITY</th><th>FINDING / WHY IT MATTERS</th><th>CONFIDENCE</th><th>EVIDENCE</th></tr></thead><tbody>${top.length ? top.map(findingRow).join("") : `<tr><td colspan="4">No evidence-backed findings were generated.</td></tr>`}</tbody></table></div>
    ${all.length ? `<button class="view-all" id="view-all-findings">VIEW ALL FINDINGS (${all.length})</button><div id="all-findings" class="additional-findings" hidden><div class="table-wrap"><table class="finding-table"><tbody>${all.map(findingRow).join("")}</tbody></table></div></div>` : ""}
  </section>`;
}

function renderEvidence(scan) {
  return `<section class="report-section full">${sectionHeading("07", "EVIDENCE REGISTER", "07 / 08")}
    <p class="section-intro">Expand an item for WHAT, WHY, EVIDENCE, SOURCE, timestamp, status, confidence, and provider limitations.</p>
    ${scan.evidence?.length ? `<div class="table-wrap"><table><thead><tr><th>ID</th><th>FINDING</th><th>SOURCE</th><th>RETRIEVED AT</th><th>CONFIDENCE</th></tr></thead><tbody>${scan.evidence.map((evidence) => `<tr><td><span class="evidence-id">${escapeHtml(evidence.id)}</span></td><td>${escapeHtml(evidence.finding)}<details class="evidence-detail"><summary>VIEW EVIDENCE DETAIL</summary><div class="detail-grid"><strong>WHAT</strong><span>${escapeHtml(evidence.what)}</span><strong>WHY</strong><span>${escapeHtml(evidence.why)}</span><strong>EVIDENCE</strong><span>${escapeHtml(evidence.evidence)}</span><strong>SOURCE</strong><span>${escapeHtml(evidence.source)}</span><strong>RETRIEVED AT</strong><span>${escapeHtml(formatDate(evidence.retrievedAt))}</span><strong>STATUS</strong><span>${statusPill(evidence, evidence.status)}</span><strong>CONFIDENCE</strong><span>${escapeHtml(evidence.confidence)}</span>${evidence.limitations ? `<strong>LIMITATIONS</strong><span>${escapeHtml(evidence.limitations)}</span>` : ""}</div></details></td><td>${escapeHtml(evidence.source)}</td><td>${escapeHtml(formatDate(evidence.retrievedAt))}</td><td>${escapeHtml(evidence.confidence)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="unknown-message">NO MATERIAL EVIDENCE REGISTERED</div>`}
  </section>`;
}

function renderFinalAssessment(scan) {
  const risk = scan.risk || {};
  const primaryRisks = (scan.findings || []).filter((finding) => !finding.positive).slice(0, 3);
  const positives = (scan.findings || []).filter((finding) => finding.positive).slice(0, 3);
  return `<section class="report-section full">${sectionHeading("08", "FINAL ASSESSMENT", "08 / 08")}
    <div class="summary-grid">
      <div><div class="metric-grid">
        ${metric("Overall risk", risk.finalScore === null ? { status: "UNKNOWN", value: null } : { status: "VERIFIED", value: `${Math.round(risk.finalScore)} / 100` })}
        ${metric("Risk level", { status: risk.level ? "VERIFIED" : "UNKNOWN", value: risk.level || null })}
        ${metric("Reliability", { status: "VERIFIED", value: scan.reliability ? `${Math.round(scan.reliability.score)} / 100` : null })}
        ${metric("Confidence", { status: scanConfidence(scan) === "UNKNOWN" ? "UNKNOWN" : "VERIFIED", value: scanConfidence(scan) })}
        ${metric("Data coverage", { status: "VERIFIED", value: dataCoverage(scan) })}
      </div></div>
      <div><div class="data-label">PRIMARY RISKS</div><ul class="limitation-list">${(primaryRisks.length ? primaryRisks : [{ title: "No primary risk finding established." }]).map((finding) => `<li>${escapeHtml(finding.title)}</li>`).join("")}</ul><div class="data-label positive-block">POSITIVE SIGNALS</div><ul class="limitation-list">${(positives.length ? positives : [{ title: "No positive signal established." }]).map((finding) => `<li>${escapeHtml(finding.title)}</li>`).join("")}</ul></div>
    </div>
    <h3 class="subheading verify-heading">WHAT TO VERIFY BEFORE TRUSTING THIS TOKEN</h3>
    <div class="checklist"><div>Verify contract address</div><div>Review owner permissions</div><div>Review holder concentration</div><div>Review liquidity</div><div>Review trading restrictions</div><div>Review audit claims</div><div>Review deployer activity</div></div>
    <p class="disclaimer">This is not financial advice. This assessment does not guarantee safety and does not establish that a token is a scam. CA X-RAY does not provide BUY, SELL, LONG, or SHORT recommendations.</p>
  </section>`;
}

function renderReport(scan) {
  updateLoading(scan);
  landing.hidden = true;
  loading.hidden = true;
  report.hidden = false;
  report.innerHTML = `<div class="report-shell">${renderHero(scan)}<div class="report-grid">${renderExecutiveSummary(scan)}${renderRiskBreakdown(scan)}${renderForensics(scan)}${renderHolderLiquidity(scan)}${renderMarketDeployer(scan)}${renderFindings(scan)}${renderEvidence(scan)}${renderFinalAssessment(scan)}</div><div class="report-footer">CA X-RAY / ASSESSMENT BASED ON AVAILABLE DATA AT SCAN TIME / NO FINANCIAL ADVICE</div></div>`;
  document.querySelector("#back-home")?.addEventListener("click", showLanding);
  document.querySelector("#view-all-findings")?.addEventListener("click", (event) => {
    const target = document.querySelector("#all-findings");
    target.hidden = !target.hidden;
    event.currentTarget.textContent = target.hidden ? `VIEW ALL FINDINGS (${scan.findings.length - 5})` : "HIDE ADDITIONAL FINDINGS";
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        const original = button.textContent;
        button.textContent = "COPIED";
        setTimeout(() => { button.textContent = original; }, 1200);
      } catch {
        button.textContent = "COPY FAILED";
      }
    });
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  scanLive();
});
addressInput.addEventListener("input", () => {
  clearAddress.hidden = !addressInput.value;
  addressError.textContent = "";
});
clearAddress.addEventListener("click", () => {
  addressInput.value = "";
  clearAddress.hidden = true;
  addressInput.focus();
});
networkInput.addEventListener("change", () => { networkError.textContent = ""; });
document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => scanDemo(button.dataset.demo)));

const demoQuery = new URLSearchParams(window.location.search).get("demo");
if (["high", "moderate", "low"].includes(demoQuery)) scanDemo(demoQuery);