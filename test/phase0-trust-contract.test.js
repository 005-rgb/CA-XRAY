const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TRUST_CONTRACT_VERSION,
  EVIDENCE_STATUS,
  CAPABILITY_STATE,
  FRESHNESS_STATE,
  EVENT_TYPE,
  normalizeEvidenceStatus,
  isComparableEvidenceStatus,
  confidenceToNumber,
  freshnessFor,
  assertSnapshotEnvelope,
  createEventEnvelope,
} = require("../src/contracts/trust");
const { getNetworkCapabilityMatrix, NETWORKS } = require("../src/engine");
const { snapshotFromScan } = require("../src/intelligence/store");

test("phase 0 trust contract exposes stable cross-module vocabularies", () => {
  assert.equal(TRUST_CONTRACT_VERSION, "1.0.0");
  assert.deepEqual(EVIDENCE_STATUS, ["NOT_SUPPORTED", "NOT_CHECKED", "UNKNOWN", "UNAVAILABLE", "UNVERIFIED", "CONFLICT", "PARTIAL", "VERIFIED"]);
  assert.ok(CAPABILITY_STATE.includes("PROVIDER_ERROR"));
  assert.equal(require("../src/providers/contracts").TRUST_CONTRACT_VERSION, TRUST_CONTRACT_VERSION);
  assert.deepEqual(FRESHNESS_STATE, ["FRESH", "STALE", "UNKNOWN"]);
  assert.ok(EVENT_TYPE.includes("EVIDENCE_PULSE_CREATED"));
});

test("evidence status normalization rejects semantic drift", () => {
  assert.equal(normalizeEvidenceStatus("verified"), "VERIFIED");
  assert.equal(normalizeEvidenceStatus(null), "UNKNOWN");
  assert.throws(() => normalizeEvidenceStatus("SAFE"), /Invalid evidence status/);
  for (const status of ["UNKNOWN", "UNAVAILABLE", "UNVERIFIED", "CONFLICT", "PARTIAL"]) {
    assert.equal(isComparableEvidenceStatus(status), false);
  }
  assert.equal(isComparableEvidenceStatus("VERIFIED"), true);
  assert.equal(require("../src/contracts/trust").normalizeCapabilityProfile([
    { key: "market", support: "supported", evidenceStatus: "NOT_CHECKED" },
    { key: "history", state: "PROVIDER_ERROR" },
  ]).capabilities[1].evidenceStatus, "NOT_CHECKED");
});

test("confidence and freshness remain bounded and explicit", () => {
  assert.equal(confidenceToNumber("HIGH"), 90);
  assert.equal(confidenceToNumber(65), 65);
  assert.equal(confidenceToNumber(101), null);
  const now = new Date("2026-08-25T00:00:00.000Z");
  assert.equal(freshnessFor({ family: "market", retrievedAt: "2026-08-24T23:00:00.000Z", now }).state, "FRESH");
  assert.equal(freshnessFor({ family: "market", retrievedAt: "2026-08-24T00:00:00.000Z", now }).state, "STALE");
  assert.equal(freshnessFor({ family: "market", retrievedAt: "not-a-date", now }).state, "UNKNOWN");
});

test("snapshot and event envelopes require replayable identity", () => {
  const snapshot = { id: "snapshot-1", targetId: "target-1", capturedAt: "2026-08-25T00:00:00.000Z", evidenceHash: "hash-1", dataStatus: "valid" };
  assert.equal(assertSnapshotEnvelope(snapshot), true);
  assert.throws(() => assertSnapshotEnvelope({ ...snapshot, evidenceHash: null }), /evidenceHash/);
  const event = createEventEnvelope({ type: "SNAPSHOT_COMPLETED", eventId: "event-1", targetId: "target-1", occurredAt: snapshot.capturedAt });
  assert.equal(event.schemaVersion, TRUST_CONTRACT_VERSION);
  assert.equal(event.eventType, "SNAPSHOT_COMPLETED");
  assert.throws(() => createEventEnvelope({ type: "UNKNOWN_EVENT", eventId: "event-2" }), /Invalid trust event type/);
});

test("runtime modules emit contract-backed capability and snapshot metadata", () => {
  const ethereum = NETWORKS.find((network) => network.id === "ethereum");
  const capability = getNetworkCapabilityMatrix(ethereum);
  assert.equal(capability.capabilityProfileVersion, TRUST_CONTRACT_VERSION);
  assert.equal(capability.capabilities.find((item) => item.key === "bytecode").state, "AVAILABLE");
  const snapshot = snapshotFromScan({
    scan: {
      network: { id: "ethereum" },
      contract: { address: "0x1111111111111111111111111111111111111111" },
      dataStatus: "valid",
      findings: [],
      evidence: [],
      risk: { finalScore: 10, level: "LOW", categories: {} },
      reliability: { score: 90 },
    },
    jobId: "job-1",
    capturedAt: "2026-08-25T00:00:00.000Z",
  });
  assert.equal(snapshot.targetId, "target:ethereum:0x1111111111111111111111111111111111111111");
  assert.equal(assertSnapshotEnvelope(snapshot), true);
});