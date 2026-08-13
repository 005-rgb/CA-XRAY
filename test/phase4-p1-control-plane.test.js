const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  MemoryControlPlaneStore,
  PlatformControlPlane,
  signedWebhookPayload,
} = require("../src/platform/control-plane");
const { MemoryPersistence } = require("../src/persistence");

function makePlane() {
  const clock = () => new Date("2026-08-13T12:00:00.000Z");
  const audit = [];
  const plane = new PlatformControlPlane({
    store: new MemoryControlPlaneStore({ clock }),
    clock,
    audit: async (entry) => { audit.push(entry); },
  });
  return { plane, audit };
}

test("provider configuration has explicit draft, publish, approval, and rollback states", async () => {
  const { plane } = makePlane();
  const first = await plane.requestProviderDraft({
    providerId: "dexscreener",
    patch: { timeoutMs: 5_000, retries: 0 },
    actorId: "admin-a",
    reason: "LATENCY_TUNING",
  });
  const published = await plane.publishProvider({
    providerId: "dexscreener",
    actorId: "admin-a",
    reason: "LATENCY_TUNING",
  });
  assert.equal(published.provider.version, 1);
  assert.equal(published.provider.published.timeoutMs, 5_000);
  assert.equal(first.approval, null);

  const requested = await plane.requestProviderDraft({
    providerId: "dexscreener",
    patch: { killSwitch: true, state: "DISABLED" },
    actorId: "admin-a",
    reason: "PROVIDER_INCIDENT",
  });
  assert.ok(requested.approval.id);
  await assert.rejects(
    () => plane.approve({ approvalId: requested.approval.id, actorId: "admin-a", reason: "REVIEW" }),
    (error) => error.code === "FOUR_EYES_REQUIRED",
  );
  await plane.approve({ approvalId: requested.approval.id, actorId: "admin-b", reason: "REVIEW" });
  const disabled = await plane.publishProvider({
    providerId: "dexscreener",
    actorId: "admin-a",
    reason: "PROVIDER_INCIDENT",
    approvalId: requested.approval.id,
  });
  assert.equal(disabled.provider.killSwitch, true);

  const rollbackApproval = await plane.requestApproval({
    action: "provider.publish",
    targetId: "dexscreener",
    actorId: "admin-a",
    reason: "INCIDENT_RESOLVED",
  });
  await plane.approve({ approvalId: rollbackApproval.id, actorId: "admin-b", reason: "REVIEW" });
  const rollback = await plane.rollbackProvider({
    providerId: "dexscreener",
    actorId: "admin-a",
    reason: "INCIDENT_RESOLVED",
    approvalId: rollbackApproval.id,
  });
  assert.equal(rollback.provider.killSwitch, false);
  assert.equal(rollback.provider.timeoutMs, 5_000);
});

test("feature flags and manual entitlements require reasoned four-eyes approval", async () => {
  const { plane } = makePlane();
  const flagDraft = await plane.requestFeatureFlag({
    key: "security.provider-kill-switch",
    enabled: true,
    actorId: "admin-a",
    reason: "CONTAINMENT",
  });
  await assert.rejects(
    () => plane.publishFeatureFlag({
      key: "security.provider-kill-switch",
      actorId: "admin-a",
      reason: "CONTAINMENT",
      approvalId: flagDraft.approval.id,
    }),
    (error) => error.code === "APPROVAL_NOT_APPROVED",
  );
  await plane.approve({ approvalId: flagDraft.approval.id, actorId: "admin-b", reason: "REVIEW" });
  const published = await plane.publishFeatureFlag({
    key: "security.provider-kill-switch",
    actorId: "admin-a",
    reason: "CONTAINMENT",
    approvalId: flagDraft.approval.id,
  });
  assert.equal(published.flag.enabled, true);

  const persistence = new MemoryPersistence();
  const approval = await plane.requestApproval({
    action: "entitlement.change",
    targetId: "workspace-one",
    actorId: "admin-a",
    reason: "CUSTOM_SUPPORT",
  });
  await plane.approve({ approvalId: approval.id, actorId: "admin-b", reason: "REVIEW" });
  const entitlement = await plane.changeEntitlement({
    persistence,
    workspaceId: "workspace-one",
    capability: "scan.export",
    status: "active",
    expiresAt: "2026-09-01T00:00:00.000Z",
    actorId: "admin-a",
    reason: "CUSTOM_SUPPORT",
    approvalId: approval.id,
  });
  assert.equal(entitlement.entitlement.expiresAt, "2026-09-01T00:00:00.000Z");
});

test("webhooks require HMAC verification and remain idempotent on duplicate delivery", async () => {
  const { plane } = makePlane();
  const secret = crypto.randomBytes(32).toString("hex");
  const rawBody = JSON.stringify({ type: "subscription.updated", id: "evt_1" });
  const signature = signedWebhookPayload(secret, rawBody);
  const first = await plane.recordWebhook({
    provider: "stripe",
    eventId: "evt_1",
    rawBody,
    signature,
    secret,
    payload: JSON.parse(rawBody),
  });
  assert.equal(first.duplicate, false);
  const duplicate = await plane.recordWebhook({
    provider: "stripe",
    eventId: "evt_1",
    rawBody,
    signature,
    secret,
    payload: JSON.parse(rawBody),
  });
  assert.equal(duplicate.duplicate, true);
  await assert.rejects(
    () => plane.recordWebhook({
      provider: "stripe",
      eventId: "evt_2",
      rawBody,
      signature: "sha256=invalid",
      secret,
      payload: JSON.parse(rawBody),
    }),
    (error) => error.code === "WEBHOOK_SIGNATURE_INVALID",
  );
});