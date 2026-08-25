const test = require("node:test");
const assert = require("node:assert/strict");
const { IntelligenceStore } = require("../src/intelligence/store");

const scan = {
  timestamp: "2026-08-25T00:00:00.000Z",
  contract: { address: `0x${"1".repeat(40)}`, deployed: true, owner: `0x${"2".repeat(40)}`, isUpgradeable: false },
  risk: { finalScore: 20 },
  reliability: { score: 90 },
  evidence: [{ id: "E-001", source: "rpc-contract", retrievedAt: "2026-08-25T00:00:00.000Z", hash: "abc" }],
};

test("Phase 5 policy review is tenant-scoped, evidence-backed, and bilingual", () => {
  let now = new Date("2026-08-25T00:00:00.000Z");
  const store = new IntelligenceStore({ clock: () => now });
  const item = store.createCase({
    workspaceId: "workspace-a", actorId: "reviewer-a", title: "Listing review",
    contracts: [{ networkId: "ethereum", address: scan.contract.address }],
  });
  const review = store.startCaseReview({
    workspaceId: "workspace-a", actorId: "reviewer-a", caseId: item.id, scan,
  });
  assert.equal(review.evaluation.outcome, "PASS");
  assert.equal(review.evidenceRegister[0].id, "E-001");
  assert.equal(store.getCaseReview("workspace-b", item.id), null);
  assert.throws(() => store.approveCaseReview({
    workspaceId: "workspace-a", actorId: "reviewer-a", caseId: item.id, decision: "APPROVE", rationale: "Looks good",
  }), /reviewer cannot approve/i);
  const approved = store.approveCaseReview({
    workspaceId: "workspace-a", actorId: "approver-b", caseId: item.id, decision: "APPROVE", rationale: "Independent review complete",
  });
  assert.equal(approved.status, "APPROVED");
  assert.ok(approved.expiresAt);
  const report = store.complianceReport("workspace-a", item.id);
  assert.equal(report.report.locale, "en");
  assert.equal(report.report.indonesian.locale, "id");
  now = new Date("2026-09-25T00:00:00.000Z");
  assert.equal(store.getCaseReview("workspace-a", item.id).status, "EXPIRED");
});

test("Phase 5 active policy versions cannot be mutated", () => {
  const store = new IntelligenceStore();
  const policy = store.createPolicy({
    workspaceId: "workspace-a", actorId: "owner-a", name: "Custom policy",
    status: "ACTIVE", checks: [{ id: "manual-1", title: "Manual control", rule: "manual" }],
  });
  assert.throws(() => store.updatePolicy({
    workspaceId: "workspace-a", policyId: policy.id, name: "Changed",
  }), /immutable/i);
});