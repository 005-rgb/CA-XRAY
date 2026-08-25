const test = require("node:test");
const assert = require("node:assert/strict");
const { IntelligenceStore } = require("../src/intelligence/store");

const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("Phase 8 supports evidence-backed annotations, independent peer review, disputes, and quality reputation", () => {
  const store = new IntelligenceStore({ clock: () => new Date("2026-08-25T00:00:00.000Z") });
  store.upsertResearcherProfile({ workspaceId: "w", actorId: "alice", displayName: "Alice", specialties: ["solidity"] });
  const annotation = store.createAnnotation({
    workspaceId: "w", actorId: "alice", networkId: "ethereum", address,
    title: "Proxy admin remains active", body: "The control path is still upgradeable.",
    evidenceRefs: ["evidence-1"], tags: ["control"],
  });
  assert.equal(annotation.moderation, "PENDING");
  assert.throws(() => store.reviewAnnotation({ workspaceId: "w", actorId: "alice", annotationId: annotation.id, decision: "ACCEPT" }), /own annotation/);
  store.reviewAnnotation({ workspaceId: "w", actorId: "bob", annotationId: annotation.id, decision: "ACCEPT", rationale: "ABI and RPC evidence agree." });
  assert.throws(() => store.reviewAnnotation({ workspaceId: "w", actorId: "bob", annotationId: annotation.id, decision: "ACCEPT" }), /once/);
  const dispute = store.createDispute({ workspaceId: "w", actorId: "carol", annotationId: annotation.id, reason: "Evidence is stale.", evidenceRefs: ["evidence-2"] });
  store.moderateCommunity({ workspaceId: "w", actorId: "moderator", targetType: "annotation", targetId: annotation.id, decision: "APPROVE", rationale: "Citation is reviewable." });
  const listed = store.listAnnotations("w");
  assert.equal(listed[0].peerReviews[0].decision, "ACCEPT");
  assert.equal(listed[0].moderation, "APPROVED");
  assert.equal(store.getResearcherProfile("w", "alice").reputation.qualityScore, 60);
  assert.equal(dispute.status, "OPEN");
  assert.equal(store.listAnnotations("other").length, 0);
});

test("Phase 8 rejects uncited annotations and keeps reputation independent of popularity", () => {
  const store = new IntelligenceStore();
  assert.throws(() => store.createAnnotation({
    workspaceId: "w", actorId: "alice", networkId: "ethereum", address, title: "No citation", body: "Claim",
  }), /one to twenty/);
  const profile = store.upsertResearcherProfile({ workspaceId: "w", actorId: "alice", displayName: "Alice" });
  assert.equal(profile.reputation.qualityScore, 50);
  assert.match(profile.reputation.basis, /popularity is excluded/);
});