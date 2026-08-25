const crypto = require("node:crypto");

const POLICY_STATUSES = Object.freeze(["DRAFT", "ACTIVE", "ARCHIVED"]);
const REVIEW_STATUSES = Object.freeze(["NOT_STARTED", "IN_REVIEW", "APPROVED", "CONDITIONAL", "REJECTED", "EXPIRED"]);
const DECISIONS = Object.freeze(["APPROVE", "CONDITIONAL", "REJECT"]);
const CHECK_STATUSES = Object.freeze(["PASS", "FAIL", "WAIVED", "UNKNOWN"]);

const DEFAULT_POLICY = Object.freeze({
  id: "default-listing-review",
  name: "Listing & Compliance Review",
  description: "Evidence-backed contract listing review with explicit uncertainty.",
  version: 1,
  status: "ACTIVE",
  reviewValidityDays: 30,
  checks: [
    { id: "contract-deployed", title: "Contract is deployed on the selected network", category: "technical", required: true, rule: "contract_deployed" },
    { id: "evidence-coverage", title: "Evidence coverage is sufficient for review", category: "evidence", required: true, rule: "evidence_coverage" },
    { id: "risk-threshold", title: "Risk score is within the listing threshold", category: "risk", required: true, rule: "risk_threshold", maxScore: 70 },
    { id: "ownership-disclosed", title: "Ownership and upgradeability are disclosed", category: "disclosure", required: true, rule: "ownership_disclosed" },
  ],
});

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function invalid(code, message) { const error = new Error(message); error.code = code; throw error; }

function normalizeCheck(check, index) {
  if (!check || typeof check !== "object" || !String(check.title || "").trim()) {
    invalid("INVALID_POLICY_CHECK", "Every policy check needs a title.");
  }
  const rule = String(check.rule || "manual").toLowerCase();
  if (!["manual", "contract_deployed", "evidence_coverage", "risk_threshold", "ownership_disclosed"].includes(rule)) {
    invalid("INVALID_POLICY_RULE", `Unsupported policy rule: ${rule}`);
  }
  return {
    id: String(check.id || `check-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80),
    title: String(check.title).trim().slice(0, 240),
    category: String(check.category || "general").trim().slice(0, 80),
    required: check.required !== false,
    rule,
    maxScore: check.maxScore === undefined ? null : Number(check.maxScore),
  };
}

function normalizePolicy(input, { id: policyId = null, version = 1 } = {}) {
  const name = String(input?.name || "").trim();
  if (!name || name.length > 160) invalid("INVALID_POLICY", "Policy name must be between 1 and 160 characters.");
  const checks = Array.isArray(input.checks) ? input.checks : [];
  if (!checks.length || checks.length > 100) invalid("INVALID_POLICY_CHECKS", "A policy needs between 1 and 100 checks.");
  const validity = Number(input.reviewValidityDays ?? 30);
  if (!Number.isInteger(validity) || validity < 1 || validity > 3650) invalid("INVALID_REVIEW_VALIDITY", "Review validity must be between 1 and 3650 days.");
  return {
    id: policyId || String(input.id || id("policy")),
    name,
    description: String(input.description || "").trim().slice(0, 1000),
    version: Number.isInteger(Number(input.version)) ? Number(input.version) : version,
    status: POLICY_STATUSES.includes(input.status) ? input.status : "DRAFT",
    reviewValidityDays: validity,
    checks: checks.map(normalizeCheck),
  };
}

function evidenceValue(scan, paths) {
  for (const path of paths) {
    let value = scan;
    for (const key of path.split(".")) value = value?.[key];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function evaluatePolicy(policy, scan, manualResults = {}) {
  const results = policy.checks.map((check) => {
    let status = "UNKNOWN";
    let reason = "Evidence is not available for this check.";
    if (manualResults[check.id] && CHECK_STATUSES.includes(manualResults[check.id].status)) {
      status = manualResults[check.id].status;
      reason = String(manualResults[check.id].reason || "Reviewer-provided result.").slice(0, 500);
    } else if (check.rule === "contract_deployed") {
      const deployed = evidenceValue(scan, ["contract.deployed", "contract.isDeployed", "evidence.contract.deployed"]);
      status = deployed === true ? "PASS" : deployed === false ? "FAIL" : "UNKNOWN";
      reason = deployed === true ? "Deployment evidence confirms bytecode on the selected network." : "Deployment evidence is unavailable or negative.";
    } else if (check.rule === "evidence_coverage") {
      const coverage = Number(evidenceValue(scan, ["evidenceSummary.coverage", "evidenceCoverage", "reliability.score"]));
      status = Number.isFinite(coverage) ? (coverage >= 60 ? "PASS" : "FAIL") : "UNKNOWN";
      reason = Number.isFinite(coverage) ? `Observed coverage: ${coverage}.` : "Coverage is unknown.";
    } else if (check.rule === "risk_threshold") {
      const score = Number(evidenceValue(scan, ["risk.finalScore", "risk.score"]));
      status = Number.isFinite(score) ? (score <= (check.maxScore ?? 70) ? "PASS" : "FAIL") : "UNKNOWN";
      reason = Number.isFinite(score) ? `Observed risk score: ${score}; threshold: ${check.maxScore ?? 70}.` : "Risk score is unknown.";
    } else if (check.rule === "ownership_disclosed") {
      const owner = evidenceValue(scan, ["contract.owner", "contract.ownerAddress", "security.ownerAddress"]);
      const upgradeable = evidenceValue(scan, ["contract.isUpgradeable", "contract.proxy", "security.isUpgradeable"]);
      status = owner !== null && upgradeable !== null ? "PASS" : "UNKNOWN";
      reason = status === "PASS" ? "Ownership and upgradeability evidence are present." : "Ownership or upgradeability evidence is incomplete.";
    }
    return { checkId: check.id, title: check.title, category: check.category, required: check.required, status, reason };
  });
  const required = results.filter((result) => result.required);
  const failed = required.filter((result) => result.status === "FAIL");
  const unknown = required.filter((result) => result.status === "UNKNOWN");
  return {
    results,
    outcome: failed.length ? "FAIL" : unknown.length ? "UNKNOWN" : "PASS",
    passed: results.filter((result) => result.status === "PASS").length,
    failed: failed.length,
    unknown: unknown.length,
    evaluatedAt: new Date().toISOString(),
  };
}

function decisionOutcome(decision, evaluation) {
  if (decision === "REJECT") return "REJECTED";
  if (decision === "CONDITIONAL") return "CONDITIONAL";
  if (evaluation?.outcome !== "PASS") invalid("APPROVAL_EVIDENCE_INCOMPLETE", "Approval requires all required checks to pass.");
  return "APPROVED";
}

function bilingualReport(review) {
  const approved = review.outcome === "APPROVED";
  const conditional = review.outcome === "CONDITIONAL";
  const statusEn = approved ? "Approved" : conditional ? "Conditionally approved" : review.outcome === "REJECTED" ? "Rejected" : "Expired";
  const statusId = approved ? "Disetujui" : conditional ? "Disetujui dengan syarat" : review.outcome === "REJECTED" ? "Ditolak" : "Kedaluwarsa";
  return {
    locale: "en",
    title: "Listing & Compliance Review",
    status: statusEn,
    summary: `Decision: ${statusEn}. Evidence remains bounded by the recorded checks and retrieval time.`,
    disclaimer: "This report is not a guarantee of safety or financial performance.",
    indonesian: {
      locale: "id",
      title: "Tinjauan Listing & Kepatuhan",
      status: statusId,
      summary: `Keputusan: ${statusId}. Bukti dibatasi oleh pemeriksaan dan waktu pengambilan yang tercatat.`,
      disclaimer: "Laporan ini bukan jaminan keamanan atau kinerja finansial.",
    },
  };
}

module.exports = {
  CHECK_STATUSES,
  DECISIONS,
  DEFAULT_POLICY,
  POLICY_STATUSES,
  REVIEW_STATUSES,
  bilingualReport,
  decisionOutcome,
  evaluatePolicy,
  normalizePolicy,
  invalid,
  id,
  clone,
};