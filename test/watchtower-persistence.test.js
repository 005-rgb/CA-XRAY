const test = require("node:test");
const assert = require("node:assert/strict");
const { MemoryWatchtowerRunStore } = require("../src/watchtower/persistence");

test("watchtower persistence deduplicates windows and preserves retry/DLQ/replay state", async () => {
  let now = new Date("2026-08-25T00:00:00.000Z");
  const store = new MemoryWatchtowerRunStore({ clock: () => now, leaseMs: 100, maxAttempts: 3, retryBaseMs: 10 });
  const first = await store.enqueue({ targetId: "target-a", workspaceId: "workspace-a", windowKey: "2026-08-25T00:00:00.000Z", payload: { networkId: "ethereum" } });
  const duplicate = await store.enqueue({ targetId: "target-a", workspaceId: "workspace-a", windowKey: "2026-08-25T00:00:00.000Z" });
  assert.equal(duplicate.duplicate, true);
  const claimed = await store.claim({ workerId: "worker-a" });
  assert.equal(await store.claim({ workerId: "worker-b" }), null);
  now = new Date(now.getTime() + 101);
  const reclaimed = await store.claim({ workerId: "worker-b" });
  assert.equal(reclaimed.runId, claimed.runId);
  await store.complete({ runId: reclaimed.runId, workerId: "worker-b", success: false, error: { code: "TIMEOUT" } });
  now = new Date(now.getTime() + 21);
  const retry = await store.claim({ workerId: "worker-c" });
  await store.complete({ runId: retry.runId, workerId: "worker-c", success: false, error: { code: "TIMEOUT" } });
  assert.equal((await store.listDeadLetters("workspace-a")).length, 1);
  assert.equal((await store.replay({ runId: first.run.runId })).status, "QUEUED");
});