const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PHASE0_CONTRACT_VERSION,
  DECISION_STATUS,
  DECISION_STATUS_MEANINGS,
  NETWORK_PROFILES,
  SELECTOR_MATRIX,
  REASON_CODES,
  POLICY_CATALOG,
  DEMO_SCENARIO,
  ELIGIBILITY_DECISION,
  PROVENANCE_SCOPE,
  EVIDENCE_BOUNDARY,
  THREAT_MODEL_CATEGORIES,
  EVIDENCE_CHECKLIST,
  resolveSelector,
  getPolicy,
  assertPhase0Contract,
} = require("../src/immune-system/phase0");

test("Phase 0 lock is complete and eligibility is evidence-backed", () => {
  assert.equal(PHASE0_CONTRACT_VERSION, "1.0.0");
  assert.equal(assertPhase0Contract(), true);
  assert.equal(ELIGIBILITY_DECISION.status, "SEPOLIA_ACCEPTED");
  assert.equal(ELIGIBILITY_DECISION.acceptedNetwork, "arbitrum-sepolia");
  assert.equal(ELIGIBILITY_DECISION.fallbackNetwork, "arbitrum-one");
  assert.match(ELIGIBILITY_DECISION.source.url, /^https:\/\//);
  assert.equal(ELIGIBILITY_DECISION.source.checkedAt, "2026-08-26");
  assert.match(ELIGIBILITY_DECISION.source.quotedRule, /Arbitrum Sepolia/);
});

test("the frozen demo scenario distinguishes dangerous, compliant, and immune paths", () => {
  assert.equal(DEMO_SCENARIO.liveEvidence, false);
  assert.equal(DEMO_SCENARIO.label, "DEMO FIXTURE");
  assert.equal(DEMO_SCENARIO.chainId, NETWORK_PROFILES["arbitrum-sepolia"].chainId);
  assert.equal(DEMO_SCENARIO.asset.amount, "500000000");
  assert.equal(DEMO_SCENARIO.dangerousTransaction.expectedDecision, "BLOCK");
  assert.ok(DEMO_SCENARIO.dangerousTransaction.expectedReasonCodes.includes("UNLIMITED_APPROVAL"));
  assert.equal(DEMO_SCENARIO.compliantTransaction.expectedDecision, "ALLOW");
  assert.deepEqual(DEMO_SCENARIO.immuneResponse.transitions.slice(-2), [
    "ATTESTATION_NOT_USABLE",
    "FOLLOW_UP_ADMISSION_REVIEW_REQUIRED_OR_BLOCK",
  ]);
});

test("supported selectors have explicit operations and permission types", () => {
  assert.deepEqual(SELECTOR_MATRIX.map((entry) => entry.selector), [
    "0xa9059cbb",
    "0x095ea7b3",
    "0x23b872dd",
    "0xd505accf",
    "0xa22cb465",
  ]);
  assert.equal(resolveSelector("0x095EA7B3").operation, "ERC20_APPROVE");
  assert.equal(resolveSelector("0x095ea7b3").permissionType, "ERC20_ALLOWANCE");
  assert.equal(resolveSelector("0xd505accf").requiresDeadline, true);
  assert.equal(resolveSelector("0xa22cb465").status, "REVIEW_REQUIRED");
  assert.equal(resolveSelector("0xa22cb465", { targetStandard: "ERC721" }).operation, "ERC721_SET_APPROVAL_FOR_ALL");
  assert.equal(resolveSelector("0xa22cb465", { targetStandard: "ERC1155" }).operation, "ERC1155_SET_APPROVAL_FOR_ALL");
  assert.equal(resolveSelector("0xdeadbeef").status, "UNAVAILABLE");
  assert.deepEqual(resolveSelector("0xdeadbeef").reasonCodes, ["INTENT_DECODE_UNAVAILABLE"]);
});

test("decision statuses, policies, and reason codes are stable", () => {
  assert.deepEqual(DECISION_STATUS, [
    "ALLOW",
    "REVIEW_REQUIRED",
    "BLOCK",
    "STALE_EVIDENCE",
    "UNAVAILABLE",
    "CONFLICT",
  ]);
  for (const status of DECISION_STATUS) assert.equal(typeof DECISION_STATUS_MEANINGS[status], "string");
  for (const policyId of ["AI_AGENT_CONSERVATIVE", "LENDING_ASSET_ADMISSION", "DEMO_PERMISSIVE"]) {
    const policy = getPolicy(policyId, "1.0.0");
    assert.equal(policy.id, policyId);
    assert.equal(policy.missingEvidenceOutcome, "REVIEW_REQUIRED");
    assert.equal(policy.conflictOutcome, "CONFLICT");
  }
  assert.ok(POLICY_CATALOG.AI_AGENT_CONSERVATIVE.requiredChecks.includes("APPROVAL_WITHIN_DECLARED_AMOUNT"));
  assert.ok(REASON_CODES.includes("ATTESTATION_INVALIDATED"));
  assert.throws(() => getPolicy("AI_AGENT_CONSERVATIVE", "9.9.9"), /Unsupported policy version/);
});

test("provenance and fixture boundaries are explicit", () => {
  assert.deepEqual(PROVENANCE_SCOPE.path, [
    "origin_contract",
    "configured_canonical_bridge",
    "arbitrum_representation",
  ]);
  assert.ok(PROVENANCE_SCOPE.prohibitedInferenceInputs.includes("ADDRESS_SIMILARITY"));
  assert.equal(PROVENANCE_SCOPE.unknownBehavior, "UNKNOWN");
  assert.ok(EVIDENCE_BOUNDARY.rules.some((rule) => /never be merged into a LIVE report/i.test(rule)));
});

test("threat model and evidence checklist cover the P0 exit criteria", () => {
  for (const category of [
    "INTENT_SPOOFING",
    "STALE_EVIDENCE",
    "FORGED_ATTESTATION",
    "FALSE_PROVENANCE_INFERENCE",
    "AI_TEXT_INFLUENCING_MACHINE_DECISION",
    "PUBLIC_VERIFICATION_DATA_LEAKAGE",
  ]) assert.ok(THREAT_MODEL_CATEGORIES.includes(category));
  for (const item of [
    "official_rule_reference_and_check_date",
    "selected_network_and_chain_id",
    "attestation_transaction_hash",
    "invalidation_transaction_hash",
    "admission_gate_interaction_and_result",
  ]) assert.ok(EVIDENCE_CHECKLIST.includes(item));
});