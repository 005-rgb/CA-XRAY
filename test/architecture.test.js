const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ARCHITECTURE_TARGETS,
  getRuntimeConfig,
  publicPlanCatalog,
  resolveWorkspacePolicy,
} = require("../src/platform/config");
const { createProviderRegistry } = require("../src/providers/registry");
const { InMemoryScanJobQueue } = require("../src/jobs/scan-queue");

test("phase 0 capacity targets are explicit", () => {
  assert.deepEqual(ARCHITECTURE_TARGETS, {
    monthlyActiveUsers: 100000,
    concurrentUsers: 2000,
    scansPerMinute: 300,
    rpoMinutes: 15,
    rtoMinutes: 60,
    availabilitySlo: 0.999,
  });
  assert.equal(getRuntimeConfig({ NODE_ENV: "production" }).queue.workerConcurrency, 64);
});

test("workspace policy separates personal Free/Pro and Team/Enterprise", () => {
  assert.equal(resolveWorkspacePolicy({ workspaceType: "personal", planId: "free" }).valid, true);
  assert.equal(resolveWorkspacePolicy({ workspaceType: "personal", planId: "team" }).code, "PLAN_NOT_ALLOWED_FOR_WORKSPACE");
  assert.equal(resolveWorkspacePolicy({ workspaceType: "team", planId: "enterprise" }).valid, true);
  assert.equal(publicPlanCatalog().map((plan) => plan.id).join(","), "free,pro,team,enterprise");
});

test("provider registry enforces an adapter contract", () => {
  const registry = createProviderRegistry([{
    id: "test-provider",
    source: "Test provider",
    fetch: async () => ({ json: {}, retrievedAt: "2026-01-01T00:00:00.000Z" }),
    apply: () => true,
  }]);
  assert.equal(registry.list().length, 1);
  assert.throws(() => createProviderRegistry([{
    id: "invalid",
    source: "Invalid",
    fetch: () => {},
  }]), /missing apply/);
});

test("scan jobs leave the request path and preserve terminal state", async () => {
  const queue = new InMemoryScanJobQueue({
    processor: async ({ value }) => ({ value }),
    concurrency: 1,
  });
  const job = queue.enqueue({ value: "complete" });
  assert.ok(["QUEUED", "RUNNING"].includes(job.status));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(queue.get(job.id).scan, { value: "complete" });
  assert.equal(queue.get(job.id).status, "SUCCEEDED");
});