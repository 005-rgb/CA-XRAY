const test = require("node:test");
const assert = require("node:assert/strict");
const { IntelligenceStore } = require("../src/intelligence/store");

const contract = "0x1111111111111111111111111111111111111111";

test("case workspace preserves lifecycle, decision log, and immutable timeline", () => {
  const store = new IntelligenceStore({ clock: () => new Date("2026-08-25T00:00:00.000Z") });
  const created = store.createCase({
    workspaceId: "workspace-a",
    actorId: "user-a",
    title: "Review token controls",
    priority: "HIGH",
    contracts: [{ networkId: "ethereum", address: contract }],
  });
  assert.equal(created.status, "OPEN");
  assert.equal(created.timeline.length, 1);

  const requested = store.addCaseEvidenceRequest({
    workspaceId: "workspace-a",
    actorId: "user-a",
    caseId: created.id,
    prompt: "Provide verified ownership evidence",
  });
  assert.equal(requested.evidenceRequests[0].status, "OPEN");
  const fulfilled = store.updateCaseEvidenceRequest({
    workspaceId: "workspace-a",
    actorId: "reviewer-a",
    caseId: created.id,
    requestId: requested.evidenceRequests[0].id,
    status: "FULFILLED",
  });
  assert.equal(fulfilled.evidenceRequests[0].status, "FULFILLED");
  const commented = store.addCaseComment({
    workspaceId: "workspace-a",
    actorId: "reviewer-a",
    caseId: created.id,
    body: "Evidence request fulfilled and ready for review.",
  });
  assert.equal(commented.timeline.at(-1).type, "COMMENT_ADDED");

  const reviewed = store.updateCase({
    workspaceId: "workspace-a",
    actorId: "reviewer-a",
    caseId: created.id,
    status: "IN_REVIEW",
    assigneeId: "reviewer-a",
  });
  assert.equal(reviewed.status, "IN_REVIEW");

  const decided = store.decideCase({
    workspaceId: "workspace-a",
    actorId: "reviewer-a",
    caseId: created.id,
    decision: "HOLD",
    rationale: "Awaiting independently verified ownership evidence.",
  });
  assert.equal(decided.status, "DECIDED");
  assert.equal(decided.decision.decision, "HOLD");
  assert.equal(decided.timeline.length, 6);
  assert.equal(store.getCase("workspace-b", created.id), null);
  assert.equal(store.listCases("workspace-a")[0].timeline.length, 6);
});

test("case workspace rejects unsupported lifecycle input", () => {
  const store = new IntelligenceStore();
  assert.throws(() => store.createCase({
    workspaceId: "workspace-a",
    actorId: "user-a",
    title: "Invalid",
    contracts: [{ networkId: "ethereum", address: "not-an-address" }],
  }), /Each case contract/);
  const created = store.createCase({
    workspaceId: "workspace-a",
    actorId: "user-a",
    title: "Invalid decision target",
    contracts: [{ networkId: "ethereum", address: contract }],
  });
  assert.throws(() => store.updateCase({
    workspaceId: "workspace-a",
    actorId: "user-a",
    caseId: created.id,
    status: "NOT_A_STATUS",
  }), /Case status is invalid/);
});