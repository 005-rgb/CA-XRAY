const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MemoryPersistence,
  PostgresPersistence,
  createPersistence,
} = require("../src/persistence");
const { InMemoryScanJobQueue } = require("../src/jobs/scan-queue");
const { getRuntimeConfig } = require("../src/platform/config");

const baseRequest = {
  workspaceId: "visitor_workspace_a",
  actorId: "visitor_workspace_a",
  planId: "free",
  limit: 2,
  idempotencyKey: "scan-request-1",
  address: "0x1234567890123456789012345678901234567890",
  networkId: "ethereum",
  engineVersion: "2.0.0",
};

test("memory persistence atomically deduplicates scan creation and quota usage", async () => {
  const persistence = new MemoryPersistence({
    clock: () => new Date("2026-08-12T00:00:00.000Z"),
  });
  const [first, second] = await Promise.all([
    persistence.createScanRequest(baseRequest),
    persistence.createScanRequest(baseRequest),
  ]);
  assert.equal([first, second].filter((value) => !value.duplicate).length, 1);
  assert.equal([first, second].filter((value) => value.duplicate).length, 1);
  const response = first.duplicate ? first.response : first.response;
  const duplicate = await persistence.getIdempotency(baseRequest.workspaceId, baseRequest.idempotencyKey);
  assert.deepEqual(duplicate, response);
  assert.equal((await persistence.listOutbox()).length, 1);

  const next = await persistence.createScanRequest({
    ...baseRequest,
    idempotencyKey: "scan-request-2",
  });
  assert.equal(next.duplicate, false);
  await assert.rejects(
    () => persistence.createScanRequest({ ...baseRequest, idempotencyKey: "scan-request-3" }),
    (error) => error.code === "MONTHLY_SCAN_QUOTA_EXCEEDED",
  );
});

test("persistence status updates preserve tenant isolation and completed reports", async () => {
  const persistence = new MemoryPersistence();
  const created = await persistence.createScanRequest({ ...baseRequest, idempotencyKey: "status-1" });
  const queue = new InMemoryScanJobQueue({
    processor: async () => ({
      mode: "LIVE",
      dataStatus: "valid",
      risk: { finalScore: 12 },
      findings: [],
      evidence: [],
    }),
    onStatusChange: (job) => {
      if (job.status === "RUNNING") return persistence.markJobRunning(job);
      if (job.status === "SUCCEEDED") return persistence.markJobSucceeded(job);
      return undefined;
    },
  });
  queue.enqueue({ jobId: created.job.id });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const completed = await persistence.getScanJob(created.job.id, baseRequest.workspaceId);
  assert.equal(completed.status, "SUCCEEDED");
  assert.equal(completed.scan.risk.finalScore, 12);
  assert.equal(await persistence.getScanJob(created.job.id, "visitor_workspace_b"), null);
  assert.equal((await persistence.listScanJobs(baseRequest.workspaceId)).length, 1);
  assert.equal((await persistence.listScanJobs("visitor_workspace_b")).length, 0);
});

test("webhook event and outbox processing are idempotent", async () => {
  const persistence = new MemoryPersistence();
  const first = await persistence.recordWebhookEvent({
    provider: "stripe",
    eventId: "evt_1",
    payload: { type: "subscription.updated" },
  });
  const second = await persistence.recordWebhookEvent({
    provider: "stripe",
    eventId: "evt_1",
    payload: { type: "subscription.updated" },
  });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  const created = await persistence.createScanRequest({ ...baseRequest, idempotencyKey: "outbox-1" });
  const pending = await persistence.listOutbox();
  assert.equal(pending.length, 1);
  assert.equal(await persistence.markOutboxProcessed(pending[0].id), true);
  assert.equal(await persistence.markOutboxProcessed(pending[0].id), false);
  assert.equal((await persistence.listOutbox()).length, 0);
  assert.ok(created.job.id);
});

test("production persistence selection is explicit and never silently memory-backed", () => {
  const config = getRuntimeConfig({ NODE_ENV: "development", DATA_STORE_DRIVER: "memory" });
  assert.ok(createPersistence({ runtimeConfig: config }) instanceof MemoryPersistence);
  assert.throws(
    () => createPersistence({
      runtimeConfig: getRuntimeConfig({ NODE_ENV: "development", DATA_STORE_DRIVER: "postgresql" }),
      env: {},
    }),
    /DATABASE_URL is required/,
  );
  assert.equal(typeof PostgresPersistence.prototype.createScanRequest, "function");
});