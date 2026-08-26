const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const { MemoryPersistence } = require("../src/persistence");
const { ImmuneSystemService } = require("../src/immune-system/service");
const { collectDeploymentEvidence, normalizeProvenanceEdge } = require("../src/immune-system/evidence");
const { validateDeploymentConfig } = require("../src/immune-system/deployment");

const CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

function service() {
  return new ImmuneSystemService({
    persistence: new MemoryPersistence(),
    clock: CLOCK,
    deploymentReader: async (method) => ({
      eth_chainId: "0x66eee",
      eth_blockNumber: "0x100",
      eth_getCode: "0x60016000",
    }[method]),
  });
}

test("P1 dangerous approval is blocked with explicit exposure reasons", async () => {
  const result = await service().createIntentCheck({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    idempotencyKey: "dangerous-approval",
    useFixture: "dangerous",
  });
  assert.equal(result.decision.decision, "BLOCK");
  assert.equal(result.decision.status, "BLOCK");
  assert.ok(result.decision.reasonCodes.includes("UNLIMITED_APPROVAL"));
  assert.ok(result.decision.reasonCodes.includes("APPROVAL_EXCEEDS_INTENT"));
  assert.ok(result.decision.reasonCodes.includes("UNKNOWN_SPENDER"));
  assert.ok(result.decision.reasonCodes.includes("UPGRADEABLE_SPENDER"));
  assert.ok(result.decision.permissionExposure);
  assert.equal(result.decision.evidenceSnapshot.mode, "FIXTURE");
  assert.match(result.decision.decisionHash, /^0x[0-9a-f]{64}$/);
});

test("P1 compliant capped approval reaches ALLOW and is idempotent across service instances", async () => {
  const persistence = new MemoryPersistence();
  const first = await new ImmuneSystemService({ persistence, clock: CLOCK }).createIntentCheck({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    idempotencyKey: "compliant-approval",
    useFixture: "compliant",
  });
  const second = await new ImmuneSystemService({ persistence, clock: CLOCK }).createIntentCheck({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    idempotencyKey: "compliant-approval",
    useFixture: "compliant",
  });
  assert.equal(first.decision.decision, "ALLOW");
  assert.equal(second.duplicate, true);
  assert.equal(second.decision.decisionId, first.decision.decisionId);
  assert.equal(second.decision.workspaceId, undefined);
  assert.equal(second.decision.intent.actorId, undefined);
});

test("P1 idempotency is tenant scoped and missing live evidence never allows", async () => {
  const persistence = new MemoryPersistence();
  const firstService = new ImmuneSystemService({ persistence, clock: CLOCK, fetchImpl: async () => { throw new Error("offline"); } });
  const payload = {
    intent: {
      intentId: "live-1", actorType: "AI_AGENT", actorId: "agent-a", chainId: 421614,
      sender: "0x0000000000000000000000000000000000000404", declaredAction: "DEPOSIT",
      asset: { address: "0x0000000000000000000000000000000000000101" }, amount: "500000000",
      destination: "0x0000000000000000000000000000000000000202", expectedSpender: "0x0000000000000000000000000000000000000303",
      maxApproval: "500000000", policyId: "AI_AGENT_CONSERVATIVE", policyVersion: "1.0.0",
    },
    unsignedTransaction: {
      transactionId: "live-tx-1", chainId: 421614, from: "0x0000000000000000000000000000000000000404",
      to: "0x0000000000000000000000000000000000000101", value: "0", data: `0x095ea7b3${"0000000000000000000000000000000000000303".padStart(64, "0")}${"1dcd6500".padStart(64, "0")}`,
      gasLimit: "100000", targetStandard: "ERC20",
    },
  };
  const first = await firstService.createIntentCheck({ workspaceId: "workspace-a", actorId: "agent-a", payload, idempotencyKey: "same-key" });
  const second = await firstService.createIntentCheck({ workspaceId: "workspace-b", actorId: "agent-b", payload: { ...payload, intent: { ...payload.intent, actorId: "agent-b" } }, idempotencyKey: "same-key" });
  assert.notEqual(first.decision.decision, "ALLOW");
  assert.ok(["UNAVAILABLE", "REVIEW_REQUIRED", "BLOCK"].includes(first.decision.decision));
  assert.equal(second.duplicate, false);
});

test("P2 target validation distinguishes deployed bytecode and wrong chain", async () => {
  const deployed = await collectDeploymentEvidence({
    networkId: "arbitrum-sepolia", chainId: 421614,
    address: "0x0000000000000000000000000000000000000101",
    now: CLOCK(), reader: async (method) => ({ eth_chainId: "0x66eee", eth_blockNumber: "0x10", eth_getCode: "0x6001" }[method]),
  });
  const wrongChain = await collectDeploymentEvidence({
    networkId: "arbitrum-sepolia", chainId: 42161,
    address: "0x0000000000000000000000000000000000000101",
    now: CLOCK(), reader: async () => "0x6001",
  });
  assert.equal(deployed.status, "VERIFIED");
  assert.equal(deployed.deploymentStatus, "DEPLOYED");
  assert.equal(wrongChain.status, "CONFLICT");
  assert.ok(wrongChain.reasonCodes.includes("TARGET_CHAIN_MISMATCH"));
});

test("P2 provenance rejects guessed edges and preserves explicit status", () => {
  assert.throws(() => normalizeProvenanceEdge({
    from: { networkId: "arbitrum-one", address: "0x0000000000000000000000000000000000000001" },
    to: { networkId: "arbitrum-one", address: "0x0000000000000000000000000000000000000002" },
    classification: "ADDRESS_SIMILARITY",
  }), /classification/);
  const edge = normalizeProvenanceEdge({
    from: { networkId: "arbitrum-one", address: "0x0000000000000000000000000000000000000001" },
    to: { networkId: "arbitrum-one", address: "0x0000000000000000000000000000000000000002" },
    classification: "CONFIGURED", status: "VERIFIED", source: "canonical-bridge",
  });
  assert.equal(edge.status, "VERIFIED");
  assert.equal(edge.classification, "CONFIGURED");
});

test("P3 attestation binds subject and chain, supports expiry/invalidation, and persists passport", async () => {
  const persistence = new MemoryPersistence();
  const immune = new ImmuneSystemService({ persistence, clock: CLOCK });
  const decision = await immune.createIntentCheck({ workspaceId: "workspace-a", actorId: "agent-a", idempotencyKey: "attestable", useFixture: "compliant" });
  const issued = await immune.attestDecision({ workspaceId: "workspace-a", decisionId: decision.decision.decisionId });
  assert.match(issued.passport.passportId, /^passport:/);
  assert.equal((await immune.getPassport(issued.passport.passportId)).decision, "ALLOW");
  assert.equal((await immune.verifyPassport({ passportId: issued.passport.passportId, subjectChainId: 421614, subject: "0x0000000000000000000000000000000000000101" })).usable, true);
  assert.equal((await immune.verifyPassport({ passportId: issued.passport.passportId, subjectChainId: 42161 })).usable, false);
  await immune.invalidatePassport({ workspaceId: "workspace-a", passportId: issued.passport.passportId, reasonCode: "DEPENDENCY_CHANGED" });
  const rejected = await immune.verifyPassport({ passportId: issued.passport.passportId });
  assert.equal(rejected.usable, false);
  assert.ok(rejected.reasonCodes.includes("ATTESTATION_INVALIDATED"));
});

test("P3 admission gate exposes deterministic accept/reject behavior", async () => {
  const immune = service();
  const decision = await immune.createIntentCheck({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    idempotencyKey: "admission-check",
    useFixture: "compliant",
  });
  const issued = await immune.attestDecision({
    workspaceId: "workspace-a",
    decisionId: decision.decision.decisionId,
  });
  const accepted = await immune.admit({
    workspaceId: "workspace-a",
    passportId: issued.passport.passportId,
    subjectChainId: 421614,
    subject: "0x0000000000000000000000000000000000000101",
  });
  assert.equal(accepted.usable, true);
  const foreign = await immune.admit({
    workspaceId: "workspace-b",
    passportId: issued.passport.passportId,
    subjectChainId: 421614,
    subject: "0x0000000000000000000000000000000000000101",
  });
  assert.equal(foreign.usable, false);
  assert.equal(foreign.status, "NOT_FOUND");
});

test("P1 expired permit is review-required and retains its explicit deadline", async () => {
  const immune = service();
  const intent = {
    intentId: "permit-expired",
    actorType: "AI_AGENT",
    actorId: "agent-a",
    chainId: 421614,
    sender: "0x0000000000000000000000000000000000000404",
    declaredAction: "PERMIT",
    asset: { address: "0x0000000000000000000000000000000000000101" },
    amount: "500000000",
    destination: "0x0000000000000000000000000000000000000202",
    expectedSpender: "0x0000000000000000000000000000000000000303",
    maxApproval: "500000000",
    policyId: "DEMO_PERMISSIVE",
    policyVersion: "1.0.0",
  };
  const words = [
    "0000000000000000000000000000000000000000000000000000000000000404",
    "0000000000000000000000000000000000000000000000000000000000000303",
    "000000000000000000000000000000000000000000000000000000001dcd6500",
    "00000000000000000000000000000000000000000000000000000000695247c0",
    "000000000000000000000000000000000000000000000000000000000000001b",
    "0".repeat(64),
    "1".padStart(64, "0"),
  ];
  const result = await immune.createIntentCheck({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    idempotencyKey: "permit-expired",
    payload: {
      intent,
      unsignedTransaction: {
        transactionId: "permit-tx",
        chainId: 421614,
        from: intent.sender,
        to: intent.asset.address,
        value: "0",
        data: `0xd505accf${words.join("")}`,
        gasLimit: "100000",
        targetStandard: "ERC20",
      },
      fixtureEvidence: { label: "PERMIT FIXTURE", liveEvidence: false },
    },
  });
  assert.equal(result.decision.exposure.expiry, "1767000000");
  assert.equal(result.decision.decision, "REVIEW_REQUIRED");
  assert.ok(result.decision.reasonCodes.includes("HUMAN_REVIEW_REQUIRED"));
});

test("watchtower change replay re-evaluates the original immutable intent with bounded idempotency", async () => {
  const persistence = new MemoryPersistence();
  const immune = new ImmuneSystemService({ persistence, clock: CLOCK });
  const original = await immune.createIntentCheck({ workspaceId: "workspace-a", actorId: "agent-a", idempotencyKey: "original", useFixture: "compliant" });
  const replay = await immune.replayChange({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    decisionId: original.decision.decisionId,
    changeId: "DEPENDENCY_CHANGED",
    idempotencyKey: "replay-1",
  });
  const duplicate = await immune.replayChange({
    workspaceId: "workspace-a",
    actorId: "agent-a",
    decisionId: original.decision.decisionId,
    changeId: "DEPENDENCY_CHANGED",
    idempotencyKey: "replay-1",
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.decision.intent.intentId, original.decision.intent.intentId);
  assert.equal(duplicate.duplicate, true);
  assert.notEqual(replay.decision.decisionId, original.decision.decisionId);
});

test("P3 deployment preflight requires explicit metadata and credentials without exposing them", () => {
  assert.throws(() => validateDeploymentConfig({
    networkId: "arbitrum-one", chainId: 42161, environment: "mainnet",
    rpcUrl: "configured", deployerAddress: "configured",
  }), /metadata/);
  const source = fs.readFileSync(path.join(__dirname, "..", "contracts", "JobenAttestationRegistry.sol"), "utf8");
  assert.match(source, /non-upgradeable/);
  assert.doesNotMatch(source, /delegatecall|selfdestruct|transferFrom/i);
});