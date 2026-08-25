const test = require("node:test");
const assert = require("node:assert/strict");
const { DeveloperApi } = require("../src/api/developer");

test("Phase 6 developer API keys are hashed, scoped, metered, and signed", () => {
  const clock = () => new Date("2026-08-25T00:00:00.000Z");
  const api = new DeveloperApi({ secret: "phase6-test-secret", clock });
  const issued = api.issue({ workspaceId: "workspace-a", actorId: "user-a" });
  assert.match(issued.key, /^jn_live_/);
  assert.equal(api.authenticate(issued.key).workspaceId, "workspace-a");
  assert.equal(api.authenticate("jn_live_invalid"), null);
  assert.equal(api.list("workspace-a")[0].key, undefined);
  api.consume("workspace-a", "scan");
  api.consume("workspace-a", "bundle");
  const usage = api.usageFor("workspace-a");
  assert.deepEqual({ requests: usage.requests, scans: usage.scans, bundles: usage.bundles }, { requests: 2, scans: 1, bundles: 1 });
  const uncertain = api.uncertaintyContract({ risk: { finalScore: null }, evidence: [{ status: "CONFLICT" }, { status: "UNKNOWN" }] });
  assert.deepEqual(uncertain.states.sort(), ["CONFLICT", "UNKNOWN"]);
  const signed = api.sign({ reportHash: "abc" });
  assert.equal(signed.algorithm, "HMAC-SHA256");
  assert.ok(signed.signature);
});