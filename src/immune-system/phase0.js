const PHASE0_CONTRACT_VERSION = "1.0.0";

const DECISION_STATUS = Object.freeze([
  "ALLOW",
  "REVIEW_REQUIRED",
  "BLOCK",
  "STALE_EVIDENCE",
  "UNAVAILABLE",
  "CONFLICT",
]);

const DECISION_STATUS_MEANINGS = Object.freeze({
  ALLOW: "All required policy checks passed against the bound evidence snapshot.",
  REVIEW_REQUIRED: "A human decision is required before the action can proceed.",
  BLOCK: "The action violates a hard policy rule and must not proceed.",
  STALE_EVIDENCE: "A required evidence family is outside its policy freshness window.",
  UNAVAILABLE: "A required operation or evidence source cannot be evaluated.",
  CONFLICT: "Required providers disagree on a material field.",
});

const NETWORK_PROFILES = Object.freeze({
  "arbitrum-sepolia": Object.freeze({
    id: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chainId: 421614,
    environment: "testnet",
    executionRole: "primary-development-and-demo",
    eligibilityRole: "accepted-by-official-buildathon-wording",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerBaseUrl: "https://sepolia.arbiscan.io/address/",
    blockscoutHost: "arbitrum-sepolia.blockscout.com",
    dexChainId: "arbitrum",
    providerSupport: Object.freeze(["arbitrum-json-rpc", "blockscout", "goplus", "dexscreener"]),
    deploymentMetadataLocation: "deployments/arbitrum-sepolia.json",
    demoWritePolicy: "TESTNET_ONLY",
  }),
  "arbitrum-one": Object.freeze({
    id: "arbitrum-one",
    name: "Arbitrum One",
    chainId: 42161,
    environment: "mainnet",
    executionRole: "fallback-submission-and-production",
    eligibilityRole: "accepted-by-official-buildathon-wording",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerBaseUrl: "https://arbiscan.io/address/",
    blockscoutHost: "arbitrum.blockscout.com",
    dexChainId: "arbitrum",
    providerSupport: Object.freeze(["arbitrum-json-rpc", "blockscout", "goplus", "dexscreener"]),
    deploymentMetadataLocation: "deployments/arbitrum-one.json",
    demoWritePolicy: "NO_MAINNET_WRITE",
  }),
});

const SELECTOR_MATRIX = Object.freeze([
  Object.freeze({
    selector: "0xa9059cbb",
    operations: Object.freeze(["ERC20_TRANSFER"]),
    arguments: Object.freeze(["recipient", "amount"]),
    permissionType: "VALUE_TRANSFER",
    targetStandard: "ERC20",
  }),
  Object.freeze({
    selector: "0x095ea7b3",
    operations: Object.freeze(["ERC20_APPROVE"]),
    arguments: Object.freeze(["spender", "amount"]),
    permissionType: "ERC20_ALLOWANCE",
    targetStandard: "ERC20",
  }),
  Object.freeze({
    selector: "0x23b872dd",
    operations: Object.freeze(["ERC20_TRANSFER_FROM"]),
    arguments: Object.freeze(["owner", "recipient", "amount"]),
    permissionType: "ERC20_ALLOWANCE",
    targetStandard: "ERC20",
  }),
  Object.freeze({
    selector: "0xd505accf",
    operations: Object.freeze(["EIP2612_PERMIT"]),
    arguments: Object.freeze(["owner", "spender", "value", "deadline", "v", "r", "s"]),
    permissionType: "ERC20_ALLOWANCE",
    targetStandard: "ERC20",
    requiresDeadline: true,
  }),
  Object.freeze({
    selector: "0xa22cb465",
    operations: Object.freeze(["ERC721_SET_APPROVAL_FOR_ALL", "ERC1155_SET_APPROVAL_FOR_ALL"]),
    arguments: Object.freeze(["operator", "approved"]),
    permissionType: "OPERATOR_APPROVAL",
    targetStandard: "ERC721_OR_ERC1155",
    requiresTargetStandardEvidence: true,
    selectorCollision: true,
  }),
]);

const REASON_CODES = Object.freeze([
  "TARGET_NOT_DEPLOYED",
  "TARGET_CHAIN_MISMATCH",
  "INTENT_DECODE_UNAVAILABLE",
  "INTENT_ACTION_MISMATCH",
  "APPROVAL_EXCEEDS_INTENT",
  "UNLIMITED_APPROVAL",
  "UNKNOWN_SPENDER",
  "UPGRADEABLE_SPENDER",
  "PRIVILEGED_FUNCTION_CALL",
  "ORIGIN_UNKNOWN",
  "BRIDGE_UNVERIFIED",
  "BRIDGE_ADMIN_ACTIVE",
  "ORIGIN_MINT_AUTHORITY_UNRESOLVED",
  "PROVIDER_CONFLICT",
  "CRITICAL_EVIDENCE_STALE",
  "ATTESTATION_EXPIRED",
  "ATTESTATION_INVALIDATED",
  "DEPENDENCY_CHANGED",
  "BLAST_RADIUS_INCOMPLETE",
  "HUMAN_REVIEW_REQUIRED",
]);

const POLICY_CATALOG = Object.freeze({
  AI_AGENT_CONSERVATIVE: Object.freeze({
    id: "AI_AGENT_CONSERVATIVE",
    version: "1.0.0",
    purpose: "Fail-closed transaction admission for autonomous agents.",
    requiredChecks: Object.freeze([
      "TARGET_BYTECODE_ON_SELECTED_CHAIN",
      "DECLARED_AND_DECODED_ACTION_MATCH",
      "APPROVAL_WITHIN_DECLARED_AMOUNT",
      "TARGET_AND_SPENDER_KNOWN",
      "CRITICAL_EVIDENCE_FRESH",
      "NO_UNRESOLVED_PROVIDER_CONFLICT",
      "NO_CRITICAL_PROXY_OR_ADMIN_CHANGE",
      "PROVENANCE_VERIFIED_OR_EXPLICITLY_ALLOWED",
      "VALUE_WITHIN_POLICY_LIMIT",
    ]),
    humanReviewChecks: Object.freeze(["SENSITIVE_SELECTOR"]),
    missingEvidenceOutcome: "REVIEW_REQUIRED",
    conflictOutcome: "CONFLICT",
  }),
  LENDING_ASSET_ADMISSION: Object.freeze({
    id: "LENDING_ASSET_ADMISSION",
    version: "1.0.0",
    purpose: "Admission of an asset to a lending integration.",
    requiredChecks: Object.freeze([
      "ASSET_DEPLOYED_ON_ARBITRUM",
      "SOURCE_OR_BYTECODE_EVIDENCE",
      "RISK_BELOW_CONFIGURED_THRESHOLD",
      "RELIABILITY_ABOVE_CONFIGURED_THRESHOLD",
      "OWNER_CONTROL_EVIDENCE_FRESH",
      "BRIDGED_ASSET_ORIGIN_KNOWN",
      "CRITICAL_MINT_BLACKLIST_PAUSE_FINDINGS_RESOLVED",
      "LIQUIDITY_MINIMUM_WHERE_APPLICABLE",
    ]),
    missingEvidenceOutcome: "REVIEW_REQUIRED",
    conflictOutcome: "CONFLICT",
  }),
  DEMO_PERMISSIVE: Object.freeze({
    id: "DEMO_PERMISSIVE",
    version: "1.0.0",
    purpose: "Bounded demonstration policy; not a production safety policy.",
    toleratedUnknowns: Object.freeze(["LOW_SEVERITY_UNKNOWN"]),
    neverAllows: Object.freeze([
      "INVALID_TARGET",
      "VALUE_TRANSFER_INTENT_MISMATCH",
      "UNLIMITED_APPROVAL_WHEN_CAP_DECLARED",
      "KNOWN_CRITICAL_CHANGE",
      "INVALID_OR_EXPIRED_ATTESTATION",
    ]),
    missingEvidenceOutcome: "REVIEW_REQUIRED",
    conflictOutcome: "CONFLICT",
  }),
});

const DEMO_SCENARIO = Object.freeze({
  id: "arbitrum-vault-deposit-500-usdc",
  version: "1.0.0",
  label: "DEMO FIXTURE",
  liveEvidence: false,
  network: "arbitrum-sepolia",
  chainId: 421614,
  instruction: "Deposit 500 USDC into the selected Arbitrum vault.",
  asset: Object.freeze({
    symbol: "USDC",
    decimals: 6,
    amount: "500000000",
    amountDisplay: "500 USDC",
    amountBasis: "Scenario-fixed USDC base units; target token identity is supplied by the later fixture/evidence layer.",
  }),
  dangerousTransaction: Object.freeze({
    operation: "ERC20_APPROVE",
    selector: "0x095ea7b3",
    amount: "MAX_UINT256",
    spenderClassification: "UPGRADEABLE_OR_UNKNOWN",
    expectedDecision: "BLOCK",
    expectedReasonCodes: Object.freeze([
      "APPROVAL_EXCEEDS_INTENT",
      "UNLIMITED_APPROVAL",
      "UPGRADEABLE_SPENDER",
      "UNKNOWN_SPENDER",
    ]),
  }),
  compliantTransaction: Object.freeze({
    operation: "ERC20_APPROVE",
    selector: "0x095ea7b3",
    amount: "500000000",
    spenderClassification: "EXPECTED_SPENDER",
    expectedDecision: "ALLOW",
    prerequisites: Object.freeze([
      "TARGET_DEPLOYED_ON_SELECTED_CHAIN",
      "SPENDER_KNOWN_AND_ACCEPTED",
      "CRITICAL_EVIDENCE_FRESH",
      "NO_UNRESOLVED_CONFLICT",
    ]),
  }),
  immuneResponse: Object.freeze({
    trigger: "MONITORED_DEPENDENCY_CHANGED",
    transitions: Object.freeze([
      "PASSPORT_CURRENT",
      "DEPENDENCY_CHANGED",
      "PASSPORT_STALE_OR_INVALIDATED",
      "ATTESTATION_NOT_USABLE",
      "FOLLOW_UP_ADMISSION_REVIEW_REQUIRED_OR_BLOCK",
    ]),
  }),
});

const ELIGIBILITY_DECISION = Object.freeze({
  status: "SEPOLIA_ACCEPTED",
  checkedAt: "2026-08-26",
  source: Object.freeze({
    url: "https://arbitrum-singapore.hackquest.io/buildathons/Arbitrum-Open-House-Singapore-Online-Buildathon",
    publisher: "Arbitrum x HackQuest",
    checkedAt: "2026-08-26",
    quotedRule: "Your project must be deployed on an Arbitrum chain to qualify. For example: Arbitrum Sepolia, Arbitrum One, Robinhood Chain, or others.",
  }),
  acceptedNetwork: "arbitrum-sepolia",
  fallbackNetwork: "arbitrum-one",
  limitations: Object.freeze([
    "The source establishes Arbitrum-chain eligibility and explicitly names Sepolia; it does not replace final submission registration or team requirements.",
    "Submission deadline and participant-specific requirements must be rechecked before submission.",
  ]),
});

const PROVENANCE_SCOPE = Object.freeze({
  version: "1.0.0",
  path: Object.freeze(["origin_contract", "configured_canonical_bridge", "arbitrum_representation"]),
  supportedRelationships: Object.freeze(["BRIDGED_REPRESENTATION"]),
  allowedEdgeClasses: Object.freeze(["CONFIGURED", "DIRECTLY_OBSERVED", "EXPLICITLY_INFERRED"]),
  prohibitedInferenceInputs: Object.freeze([
    "ADDRESS_SIMILARITY",
    "TICKER_OR_NAME_SIMILARITY",
    "SHARED_DEPLOYER_ALONE",
    "SHARED_FUNDER_ALONE",
  ]),
  unknownBehavior: "UNKNOWN",
});

const EVIDENCE_BOUNDARY = Object.freeze({
  fixtureLabel: "DEMO FIXTURE",
  liveLabel: "LIVE",
  rules: Object.freeze([
    "Fixture fields must never be merged into a LIVE report.",
    "A fixture must disclose its fixed inputs, source, and limitations.",
    "Provider failure must remain degraded/unavailable; it cannot silently select a fixture.",
    "Public output must not contain private keys, seed phrases, API keys, or raw secrets.",
  ]),
});

const THREAT_MODEL_CATEGORIES = Object.freeze([
  "INTENT_SPOOFING",
  "MALICIOUS_OR_AMBIGUOUS_CALLDATA",
  "REPLAYED_DECISION",
  "STALE_EVIDENCE",
  "PROVIDER_CONFLICT",
  "ISSUER_COMPROMISE",
  "FORGED_ATTESTATION",
  "CHAIN_SUBJECT_MISMATCH",
  "FALSE_PROVENANCE_INFERENCE",
  "AI_TEXT_INFLUENCING_MACHINE_DECISION",
  "PUBLIC_VERIFICATION_DATA_LEAKAGE",
]);

const EVIDENCE_CHECKLIST = Object.freeze([
  "official_rule_reference_and_check_date",
  "participant_or_team_confirmation",
  "selected_network_and_chain_id",
  "contract_source_and_compiler_version",
  "deployment_transaction_hash",
  "deployed_contract_address",
  "explorer_url",
  "contract_verification_url_when_available",
  "attestation_transaction_hash",
  "invalidation_transaction_hash",
  "admission_gate_interaction_and_result",
  "same_chain_screenshots_or_recording",
  "known_limitations_and_testnet_or_production_labels",
  "session_or_workshop_participation_log",
]);

function selectorEntry(selector) {
  const normalized = String(selector || "").toLowerCase();
  return SELECTOR_MATRIX.find((entry) => entry.selector === normalized) || null;
}

function resolveSelector(selector, { targetStandard = null } = {}) {
  const entry = selectorEntry(selector);
  if (!entry) {
    return Object.freeze({
      selector: String(selector || "").toLowerCase(),
      status: "UNAVAILABLE",
      operation: null,
      operationCandidates: Object.freeze([]),
      reasonCodes: Object.freeze(["INTENT_DECODE_UNAVAILABLE"]),
      limitation: "Selector is outside the Phase 0 supported operation matrix.",
    });
  }

  if (entry.selectorCollision && !["ERC721", "ERC1155"].includes(String(targetStandard || "").toUpperCase())) {
    return Object.freeze({
      selector: entry.selector,
      status: "REVIEW_REQUIRED",
      operation: null,
      operationCandidates: entry.operations,
      reasonCodes: Object.freeze(["HUMAN_REVIEW_REQUIRED"]),
      limitation: "The shared setApprovalForAll selector requires verified target-standard evidence.",
    });
  }

  const normalizedStandard = String(targetStandard || "").toUpperCase();
  const operation = entry.selectorCollision
    ? `${normalizedStandard}_SET_APPROVAL_FOR_ALL`
    : entry.operations[0];
  return Object.freeze({
    selector: entry.selector,
    status: "VERIFIED",
    operation,
    operationCandidates: entry.operations,
    arguments: entry.arguments,
    permissionType: entry.permissionType,
    requiresDeadline: Boolean(entry.requiresDeadline),
  });
}

function getPolicy(policyId, policyVersion = null) {
  const policy = POLICY_CATALOG[policyId];
  if (!policy) throw new TypeError(`Unknown Phase 0 policy: ${policyId}`);
  if (policyVersion !== null && policy.version !== policyVersion) {
    throw new TypeError(`Unsupported policy version: ${policyId} ${policyVersion}`);
  }
  return policy;
}

function assertPhase0Contract() {
  if (DECISION_STATUS.length !== 6) throw new Error("Phase 0 decision status contract is incomplete.");
  if (SELECTOR_MATRIX.length !== 5) throw new Error("Phase 0 selector matrix is incomplete.");
  if (!REASON_CODES.includes("INTENT_DECODE_UNAVAILABLE")) throw new Error("Phase 0 reason code registry is incomplete.");
  if (ELIGIBILITY_DECISION.status !== "SEPOLIA_ACCEPTED") throw new Error("Eligibility status is not resolved.");
  if (ELIGIBILITY_DECISION.acceptedNetwork !== "arbitrum-sepolia") throw new Error("Primary network is not Arbitrum Sepolia.");
  return true;
}

module.exports = {
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
  selectorEntry,
  resolveSelector,
  getPolicy,
  assertPhase0Contract,
};