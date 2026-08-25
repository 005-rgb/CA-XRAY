const test = require("node:test");
const assert = require("node:assert/strict");
const { IntelligenceStore } = require("../src/intelligence/store");

const address = "0x1111111111111111111111111111111111111111";

function scan(capturedAt, evidenceRetrievedAt) {
  return {
    network: { id: "ethereum" },
    contract: { address, owner: { value: "0x2222222222222222222222222222222222222222", status: "DETECTED", evidenceId: "OWNER-1" } },
    risk: { finalScore: 64, level: "MEDIUM", coverage: 72, categories: {
      contract: { status: "AVAILABLE", coverage: 100 },
      market: { status: "PARTIAL", coverage: 44 },
      holders: { status: "UNKNOWN", coverage: 0 },
    } },
    reliability: { score: 88 },
    dataStatus: "partial",
    timestamp: capturedAt,
    evidence: [
      { id: "LIQ-1", family: "liquidity", status: "VERIFIED", retrievedAt: evidenceRetrievedAt },
      { id: "OWNER-1", family: "owner", status: "VERIFIED", retrievedAt: capturedAt },
    ],
  };
}

test("Passport freshness, evidence-backed review lifecycle, and audit export", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");
  const store = new IntelligenceStore({ clock: () => now });
  store.recordSnapshot({
    workspaceId: "workspace-a",
    scan: scan("2026-08-24T00:00:00.000Z", "2026-08-24T00:00:00.000Z"),
    jobId: "scan-1",
    capturedAt: "2026-08-24T00:00:00.000Z",
  });

  const freshness = store.getFreshness("workspace-a", "ethereum", address);
  assert.equal(freshness.healthScore, 50);
  assert.equal(freshness.uncertaintyBudget, 28);
  assert.equal(freshness.items.find((item) => item.family === "liquidity").freshness, "STALE");

  const queue = store.listPassportReviews("workspace-a", "ethereum", address);
  assert.ok(queue.some((item) => item.rule === "refresh_liquidity"));
  assert.ok(queue.every((item) => item.evidenceRef || item.rule === "complete_evidence_history"));
  const refresh = queue.find((item) => item.rule === "refresh_liquidity");
  const acknowledged = store.updatePassportReview({
    workspaceId: "workspace-a", networkId: "ethereum", address,
    reviewId: refresh.id, status: "ACKNOWLEDGED", actorId: "investigator-a",
  });
  assert.equal(acknowledged.status, "ACKNOWLEDGED");
  assert.throws(() => store.updatePassportReview({
    workspaceId: "workspace-a", networkId: "ethereum", address,
    reviewId: refresh.id, status: "ACKNOWLEDGED", actorId: "investigator-a",
  }), /Cannot move review/);
  const reopened = store.updatePassportReview({
    workspaceId: "workspace-a", networkId: "ethereum", address,
    reviewId: refresh.id, status: "DEFERRED", actorId: "investigator-a",
  });
  assert.equal(reopened.status, "DEFERRED");
  assert.equal(reopened.timeline.length, 3);

  const audit = store.createPassportAuditExport("workspace-a", "ethereum", address);
  assert.equal(audit.manifest.format, "joben-risk-passport-audit-v1");
  assert.equal(audit.snapshots.length, 1);
  assert.equal(audit.manifest.evidenceHashes[0], audit.snapshots[0].evidenceHash);
  assert.match(audit.verificationHash, /^[a-f0-9]{64}$/);
  assert.equal(audit.reviewQueue.find((item) => item.id === refresh.id).status, "DEFERRED");
});