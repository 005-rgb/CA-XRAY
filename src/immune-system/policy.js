const { createHash } = require("node:crypto");
const {
  DECISION_STATUS,
  DECISION_STATUS_MEANINGS,
  getPolicy,
} = require("./phase0");

const HARD_BLOCK_REASONS = new Set([
  "APPROVAL_EXCEEDS_INTENT",
  "UNLIMITED_APPROVAL",
  "INTENT_ACTION_MISMATCH",
  "TARGET_NOT_DEPLOYED",
  "TARGET_CHAIN_MISMATCH",
  "UNKNOWN_SPENDER",
  "PRIVILEGED_FUNCTION_CALL",
  "BRIDGE_ADMIN_ACTIVE",
]);

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function evaluatePolicy({
  intent,
  transaction,
  decoded,
  comparison,
  deployment,
  provenance,
  criticalEvidence = {},
  policyId,
  policyVersion,
  evidenceSnapshot,
} = {}) {
  const policy = getPolicy(policyId, policyVersion);
  const reasons = unique([
    ...(comparison?.reasonCodes || []),
    ...(deployment?.reasonCodes || []),
    ...(criticalEvidence.reasonCodes || []),
    ...(provenance?.reasonCodes || []),
  ]);
  let decision = "ALLOW";
  let status = "ALLOW";
  const limitations = [];

  if (decoded?.status === "UNAVAILABLE") {
    decision = "UNAVAILABLE";
    status = "UNAVAILABLE";
  } else if (reasons.some((reason) => HARD_BLOCK_REASONS.has(reason))) {
    decision = "BLOCK";
    status = "BLOCK";
  } else if (deployment?.status === "UNAVAILABLE") {
    decision = "UNAVAILABLE";
    status = "UNAVAILABLE";
  } else if (deployment?.status === "UNKNOWN") {
    decision = reasons.includes("TARGET_NOT_DEPLOYED") ? "BLOCK" : "REVIEW_REQUIRED";
    status = decision;
  } else if (deployment?.status === "CONFLICT" || criticalEvidence.status === "CONFLICT" || provenance?.status === "CONFLICT") {
    decision = "CONFLICT";
    status = "CONFLICT";
  } else if (criticalEvidence.freshness === "STALE" || provenance?.freshness === "STALE") {
    decision = "STALE_EVIDENCE";
    status = "STALE_EVIDENCE";
  } else if (reasons.includes("HUMAN_REVIEW_REQUIRED") || reasons.includes("UNKNOWN_SPENDER") || provenance?.status === "UNKNOWN") {
    decision = "REVIEW_REQUIRED";
    status = "REVIEW_REQUIRED";
  } else if (reasons.length) {
    decision = "REVIEW_REQUIRED";
    status = "REVIEW_REQUIRED";
  }

  if (provenance?.status !== "VERIFIED") limitations.push("Provenance is not fully verified for this decision.");
  if (deployment?.limitations?.length) limitations.push(...deployment.limitations);
  if (criticalEvidence.limitations?.length) limitations.push(...criticalEvidence.limitations);
  if (decision === "ALLOW" && !evidenceSnapshot) {
    decision = "UNAVAILABLE";
    status = "UNAVAILABLE";
    limitations.push("A decision cannot be allowed without an evidence snapshot.");
  }
  if (!DECISION_STATUS.includes(status)) throw new Error(`Invalid policy decision status: ${status}`);
  return {
    decision,
    status,
    reasonCodes: reasons,
    evidenceRefs: unique([
      ...(decoded?.evidenceRefs || []),
      ...(deployment?.evidenceHash ? [`deployment:${deployment.evidenceHash}`] : []),
      ...(evidenceSnapshot?.id ? [`snapshot:${evidenceSnapshot.id}`] : []),
    ]),
    policy: {
      id: policy.id,
      version: policy.version,
      purpose: policy.purpose,
    },
    evidenceSnapshot: evidenceSnapshot || null,
    limitations: [...new Set(limitations)],
    decisionMeaning: DECISION_STATUS_MEANINGS[status],
    policyHash: hash({ id: policy.id, version: policy.version }),
  };
}

module.exports = {
  HARD_BLOCK_REASONS,
  evaluatePolicy,
};