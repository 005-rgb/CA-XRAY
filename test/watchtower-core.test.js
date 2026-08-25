const test = require("node:test");
const assert = require("node:assert/strict");
const { DurableWatchScheduler } = require("../src/watchtower/scheduler");
const { compareSnapshots } = require("../src/watchtower/materiality");
const { DeliveryOutbox, signPayload, validateWebhookUrl } = require("../src/watchtower/delivery");

const at = new Date("2026-08-25T00:00:00.000Z");
const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("scheduler claims one target window, reclaims an expired lease, and dead-letters after bounded retries", () => {
  let now = at.getTime();
  const scheduler = new DurableWatchScheduler({ clock: () => new Date(now), leaseMs: 100, maxAttempts: 3, retryBaseMs: 10 });
  scheduler.schedule({ targetId: "target-a", workspaceId: "workspace-a", intervalMs: 1000 });
  assert.equal(scheduler.tick().runs.length, 1);
  assert.equal(scheduler.tick().runs.length, 0);
  const claimed = scheduler.claim({ workerId: "worker-a" });
  assert.ok(claimed);
  assert.equal(scheduler.claim({ workerId: "worker-b" }), null);
  now += 101;
  const reclaimed = scheduler.claim({ workerId: "worker-b" });
  assert.equal(reclaimed.runId, claimed.runId);
  scheduler.complete(reclaimed.runId, { workerId: "worker-b", success: false, error: { code: "TIMEOUT" } });
  now += 21;
  const retry = scheduler.claim({ workerId: "worker-c" });
  scheduler.complete(retry.runId, { workerId: "worker-c", success: false, error: { code: "TIMEOUT" } });
  assert.equal(scheduler.listDeadLetters().length, 1);
  assert.equal(scheduler.replay(retry.runId).status, "QUEUED");
});

test("materiality keeps unknown values non-comparable and produces deterministic forensic deltas", () => {
  const before = { id: "before", evidenceHash: "h1", risk: { score: 20 }, changePoints: { sellTax: { value: 5, status: "VERIFIED" }, owner: { value: address, status: "VERIFIED" } } };
  const after = { id: "after", capturedAt: at.toISOString(), evidenceHash: "h2", risk: { score: 35 }, changePoints: { sellTax: { value: null, status: "UNAVAILABLE" }, owner: { value: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", status: "VERIFIED" } } };
  const result = compareSnapshots(before, after);
  assert.equal(result.changes.find((item) => item.field === "sellTax").comparability, "NOT_COMPARABLE");
  assert.equal(result.changes.find((item) => item.field === "sellTax").materiality, "NONE");
  const owner = result.changes.find((item) => item.field === "owner");
  assert.deepEqual({ before: owner.before, after: owner.after, direction: owner.direction }, { before: address, after: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", direction: "changed" });
  assert.equal(result.changeHash, compareSnapshots(before, after).changeHash);
});

test("delivery signs payloads, rejects unsafe webhooks, retries transient failures, and redacts secrets from listings", async () => {
  assert.equal(signPayload("secret", "{\"ok\":true}").startsWith("sha256="), true);
  assert.throws(() => validateWebhookUrl("http://localhost/hook"), /WEBHOOK_/);
  const outbox = new DeliveryOutbox({ clock: () => at, maxAttempts: 2, retryBaseMs: 1 });
  const [job] = outbox.enqueue({ alertId: "alert-a", workspaceId: "workspace-a", channels: [{ type: "webhook", url: "https://example.com/hook", secret: "do-not-leak" }], payload: { alertId: "alert-a" } });
  assert.equal(outbox.list()[0].destination, "https://example.com/hook");
  assert.equal(JSON.stringify(outbox.list()).includes("do-not-leak"), false);
  let calls = 0;
  await outbox.process({ sender: async ({ signature }) => { calls += 1; assert.ok(signature.startsWith("sha256=")); return { status: calls === 1 ? 503 : 200 }; } });
  assert.equal(outbox.list()[0].status, "QUEUED");
  await outbox.process({ now: new Date(at.getTime() + 2), sender: async () => ({ status: 200 }) });
  assert.equal(outbox.list()[0].status, "SENT");
  assert.ok(job.id);
});