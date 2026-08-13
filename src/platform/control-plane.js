const crypto = require("node:crypto");

const PROVIDER_STATES = Object.freeze(["ACTIVE", "DISABLED"]);
const APPROVAL_STATES = Object.freeze(["PENDING", "APPROVED", "REJECTED", "CONSUMED"]);
const SUBSCRIPTION_STATES = Object.freeze(["trial", "active", "past_due", "paused", "canceled", "expired"]);
const HIGH_RISK_ACTIONS = new Set([
  "provider.publish",
  "provider.kill_switch",
  "feature_flag.publish",
  "entitlement.change",
  "subscription.override",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function error(code, message = code) {
  return Object.assign(new Error(message), { code });
}

function reasonCode(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!/^[A-Z][A-Z0-9_.-]{2,63}$/.test(normalized)) {
    throw error("REASON_CODE_REQUIRED", "A valid reason code is required.");
  }
  return normalized;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function signedWebhookPayload(secret, rawBody) {
  return `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

function verifyWebhookSignature(secret, rawBody, signature) {
  if (typeof secret !== "string" || !secret || typeof signature !== "string") return false;
  const expected = Buffer.from(signedWebhookPayload(secret, rawBody));
  const received = Buffer.from(signature.trim());
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

class MemoryControlPlaneStore {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.providers = new Map();
    this.flags = new Map();
    this.approvals = new Map();
    this.subscriptions = new Map();
    this.webhooks = new Map();
    this.incidents = [];
  }

  now() { return this.clock().toISOString(); }

  provider(id) {
    if (!this.providers.has(id)) {
      this.providers.set(id, {
        providerId: id,
        state: "ACTIVE",
        timeoutMs: 12_000,
        retries: 1,
        quotaPerMinute: 120,
        concurrencyLimit: 2,
        killSwitch: false,
        version: 0,
        draft: null,
        published: null,
        history: [],
        updatedAt: this.now(),
        updatedBy: null,
      });
    }
    return this.providers.get(id);
  }

  async listProviders() { return [...this.providers.values()].map(clone); }
  async getProvider(id) { return clone(this.providers.get(id) || null); }
  async saveProvider(id, patch) {
    const current = this.provider(id);
    Object.assign(current, patch, { updatedAt: this.now() });
    return clone(current);
  }

  async listFlags() { return [...this.flags.values()].map(clone); }
  async getFlag(key) { return clone(this.flags.get(key) || null); }
  async saveFlag(key, patch) {
    const current = this.flags.get(key) || {
      key, enabled: false, version: 0, draft: null, published: null,
      updatedAt: this.now(), updatedBy: null,
    };
    Object.assign(current, patch, { updatedAt: this.now() });
    this.flags.set(key, current);
    return clone(current);
  }

  async createApproval(record) {
    const approval = {
      id: `approval_${crypto.randomUUID()}`,
      status: "PENDING",
      createdAt: this.now(),
      approvedAt: null,
      approvedBy: null,
      ...clone(record),
    };
    this.approvals.set(approval.id, approval);
    return clone(approval);
  }
  async getApproval(id) { return clone(this.approvals.get(id) || null); }
  async saveApproval(id, patch) {
    const approval = this.approvals.get(id);
    if (!approval) return null;
    Object.assign(approval, patch);
    return clone(approval);
  }
  async listApprovals() { return [...this.approvals.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(clone); }

  async saveSubscription(record) {
    const id = record.id || `subscription_${crypto.randomUUID()}`;
    const current = { id, createdAt: this.now(), ...clone(record) };
    this.subscriptions.set(id, current);
    return clone(current);
  }
  async getSubscription(id) { return clone(this.subscriptions.get(id) || null); }
  async listSubscriptions() { return [...this.subscriptions.values()].map(clone); }

  async recordWebhook(record) {
    const key = `${record.provider}:${record.eventId}`;
    const existing = this.webhooks.get(key);
    if (existing) return { duplicate: true, event: clone(existing) };
    const event = {
      id: `webhook_${crypto.randomUUID()}`,
      status: "RECEIVED",
      replayCount: 0,
      receivedAt: this.now(),
      processedAt: null,
      ...clone(record),
    };
    this.webhooks.set(key, event);
    return { duplicate: false, event: clone(event) };
  }
  async getWebhook(provider, eventId) { return clone(this.webhooks.get(`${provider}:${eventId}`) || null); }
  async saveWebhook(provider, eventId, patch) {
    const event = this.webhooks.get(`${provider}:${eventId}`);
    if (!event) return null;
    Object.assign(event, patch);
    return clone(event);
  }
  async listWebhooks() { return [...this.webhooks.values()].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map(clone); }
}

class PlatformControlPlane {
  constructor({ store = new MemoryControlPlaneStore(), audit = async () => null, clock = () => new Date() } = {}) {
    this.store = store;
    this.audit = audit;
    this.clock = clock;
  }

  async listProviderHealth(providerRegistry = null) {
    const registered = providerRegistry?.list?.() || [];
    const known = new Set(registered.map((provider) => provider.id));
    const saved = await this.store.listProviders();
    for (const provider of saved) known.add(provider.providerId);
    const health = providerRegistry?.health?.() || {};
    return [...known].sort().map((providerId) => {
      const config = saved.find((item) => item.providerId === providerId) || {
        providerId, state: "ACTIVE", timeoutMs: 12_000, retries: 1,
        quotaPerMinute: 120, concurrencyLimit: 2, killSwitch: false, version: 0,
      };
      return {
        providerId,
        source: registered.find((item) => item.id === providerId)?.source || null,
        state: config.state,
        killSwitch: Boolean(config.killSwitch),
        timeoutMs: config.timeoutMs,
        retries: config.retries,
        quotaPerMinute: config.quotaPerMinute,
        concurrencyLimit: config.concurrencyLimit,
        version: config.version,
        runtime: health[providerId] || null,
        updatedAt: config.updatedAt || null,
      };
    });
  }

  async requestProviderDraft({ providerId, patch = {}, actorId, reason }) {
    const reasonValue = reasonCode(reason);
    if (!/^[a-z0-9-]{2,64}$/.test(String(providerId || ""))) throw error("PROVIDER_ID_INVALID");
    const safePatch = {
      state: patch.state || "ACTIVE",
      timeoutMs: boundedInteger(patch.timeoutMs, 12_000, 100, 120_000),
      retries: boundedInteger(patch.retries, 1, 0, 2),
      quotaPerMinute: boundedInteger(patch.quotaPerMinute, 120, 1, 100_000),
      concurrencyLimit: boundedInteger(patch.concurrencyLimit, 2, 1, 1_000),
      killSwitch: Boolean(patch.killSwitch),
    };
    if (!PROVIDER_STATES.includes(safePatch.state)) throw error("PROVIDER_STATE_INVALID");
    const current = await this.store.getProvider(providerId) || await this.store.saveProvider(providerId, {});
    const draft = await this.store.saveProvider(providerId, {
      ...current,
      draft: { ...safePatch, reasonCode: reasonValue, requestedBy: actorId, createdAt: this.clock().toISOString() },
      updatedBy: actorId,
    });
    const highRisk = safePatch.killSwitch || safePatch.state === "DISABLED";
    if (highRisk) {
      const approval = await this.store.createApproval({
        action: "provider.kill_switch",
        targetId: providerId,
        requestedBy: actorId,
        reasonCode: reasonValue,
        payload: safePatch,
      });
      await this.audit("PLATFORM_PROVIDER_DRAFT_REQUESTED", actorId, null, {
        providerId, reasonCode: reasonValue, approvalId: approval.id,
      });
      return { provider: draft, approval };
    }
    await this.audit("PLATFORM_PROVIDER_DRAFT_SAVED", actorId, null, { providerId, reasonCode: reasonValue });
    return { provider: draft, approval: null };
  }

  async publishProvider({ providerId, actorId, reason, approvalId = null }) {
    const reasonValue = reasonCode(reason);
    const provider = await this.store.getProvider(providerId);
    if (!provider?.draft) throw error("PROVIDER_DRAFT_REQUIRED");
    const highRisk = provider.draft.killSwitch || provider.draft.state === "DISABLED";
    const approval = await this.#consumeApproval({
      approvalId, action: highRisk ? "provider.kill_switch" : "provider.publish",
      targetId: providerId, actorId, reasonCode: reasonValue, required: highRisk,
    });
    const published = await this.store.saveProvider(providerId, {
      ...provider.draft,
      published: { ...provider.draft },
      draft: null,
      history: [...(provider.history || []), ...(provider.published ? [provider.published] : [])],
      version: provider.version + 1,
      updatedBy: actorId,
      updatedAt: this.clock().toISOString(),
    });
    await this.audit("PLATFORM_PROVIDER_PUBLISHED", actorId, null, {
      providerId, version: published.version, reasonCode: reasonValue, approvalId: approval?.id || null,
    });
    return { provider: published, approval: approval ? { id: approval.id, status: "CONSUMED" } : null };
  }

  async rollbackProvider({ providerId, actorId, reason, approvalId = null }) {
    const reasonValue = reasonCode(reason);
    const provider = await this.store.getProvider(providerId);
    const previous = provider?.history?.at(-1);
    if (!previous) throw error("PROVIDER_VERSION_NOT_FOUND");
    const approval = await this.#consumeApproval({
      approvalId, action: "provider.publish", targetId: providerId, actorId,
      reasonCode: reasonValue, required: true,
    });
    const rolledBack = await this.store.saveProvider(providerId, {
      ...previous,
      draft: null,
      published: { ...previous },
      history: provider.history.slice(0, -1),
      version: provider.version + 1,
      updatedBy: actorId,
      updatedAt: this.clock().toISOString(),
    });
    await this.audit("PLATFORM_PROVIDER_ROLLED_BACK", actorId, null, {
      providerId, version: rolledBack.version, reasonCode: reasonValue, approvalId: approval.id,
    });
    return { provider: rolledBack, approval: { id: approval.id, status: "CONSUMED" } };
  }

  async requestFeatureFlag({ key, enabled, actorId, reason }) {
    const reasonValue = reasonCode(reason);
    if (!/^[a-z][a-z0-9_.-]{1,80}$/.test(String(key || ""))) throw error("FEATURE_FLAG_KEY_INVALID");
    const flag = await this.store.saveFlag(key, {
      draft: { enabled: Boolean(enabled), reasonCode: reasonValue, requestedBy: actorId },
      updatedBy: actorId,
    });
    const approval = await this.store.createApproval({
      action: "feature_flag.publish",
      targetId: key,
      requestedBy: actorId,
      reasonCode: reasonValue,
      payload: { enabled: Boolean(enabled) },
    });
    await this.audit("PLATFORM_FEATURE_FLAG_DRAFT_SAVED", actorId, null, { key, reasonCode: reasonValue });
    return { flag, approval };
  }

  async publishFeatureFlag({ key, actorId, reason, approvalId = null }) {
    const reasonValue = reasonCode(reason);
    const flag = await this.store.getFlag(key);
    if (!flag?.draft) throw error("FEATURE_FLAG_DRAFT_REQUIRED");
    const approval = await this.#consumeApproval({
      approvalId, action: "feature_flag.publish", targetId: key, actorId,
      reasonCode: reasonValue, required: true,
    });
    const published = await this.store.saveFlag(key, {
      enabled: flag.draft.enabled,
      published: { ...flag.draft },
      draft: null,
      version: flag.version + 1,
      updatedBy: actorId,
    });
    await this.audit("PLATFORM_FEATURE_FLAG_PUBLISHED", actorId, null, {
      key, version: published.version, reasonCode: reasonValue, approvalId: approval.id,
    });
    return { flag: published, approval: { id: approval.id, status: "CONSUMED" } };
  }

  async listFeatureFlags() { return this.store.listFlags(); }

  async changeEntitlement({ persistence, workspaceId, capability, status, expiresAt = null, actorId, reason, approvalId = null }) {
    const reasonValue = reasonCode(reason);
    if (!/^[a-z][a-z0-9_.-]{2,80}$/.test(String(capability || ""))) throw error("CAPABILITY_INVALID");
    if (!["active", "revoked", "expired"].includes(status)) throw error("ENTITLEMENT_STATUS_INVALID");
    const approval = await this.#consumeApproval({
      approvalId, action: "entitlement.change", targetId: workspaceId, actorId,
      reasonCode: reasonValue, required: true,
    });
    const entitlement = await persistence.setEntitlement({
      workspaceId, capability, status, source: "manual",
      effectiveAt: this.clock(), expiresAt, reason: reasonValue,
    });
    await this.audit("PLATFORM_ENTITLEMENT_CHANGED", actorId, workspaceId, {
      capability, status, expiresAt, reasonCode: reasonValue, approvalId: approval.id,
    });
    return { entitlement, approval: { id: approval.id, status: "CONSUMED" } };
  }

  async changeSubscription({
    subscriptionId,
    workspaceId,
    planId,
    status,
    currentPeriodEnd = null,
    actorId,
    reason,
    approvalId = null,
  }) {
    const reasonValue = reasonCode(reason);
    if (!workspaceId || !planId || !SUBSCRIPTION_STATES.includes(status)) {
      throw error("SUBSCRIPTION_STATE_INVALID");
    }
    const approval = await this.#consumeApproval({
      approvalId, action: "subscription.override", targetId: workspaceId, actorId,
      reasonCode: reasonValue, required: true,
    });
    const subscription = await this.store.saveSubscription({
      id: subscriptionId,
      workspaceId,
      planId,
      status,
      currentPeriodEnd,
      source: "manual",
      reasonCode: reasonValue,
      updatedBy: actorId,
      updatedAt: this.clock().toISOString(),
    });
    await this.audit("PLATFORM_SUBSCRIPTION_CHANGED", actorId, workspaceId, {
      subscriptionId: subscription.id, planId, status, reasonCode: reasonValue, approvalId: approval.id,
    });
    return { subscription, approval: { id: approval.id, status: "CONSUMED" } };
  }

  async listSubscriptions() { return this.store.listSubscriptions(); }

  async requestApproval({ action, targetId, actorId, reason, payload = {} }) {
    const reasonValue = reasonCode(reason);
    if (!HIGH_RISK_ACTIONS.has(action)) throw error("APPROVAL_NOT_REQUIRED");
    const approval = await this.store.createApproval({
      action, targetId, requestedBy: actorId, reasonCode: reasonValue, payload,
    });
    await this.audit("PLATFORM_APPROVAL_REQUESTED", actorId, null, {
      approvalId: approval.id, action, targetId, reasonCode: reasonValue,
    });
    return approval;
  }

  async approve({ approvalId, actorId, reason }) {
    const reasonValue = reasonCode(reason);
    const approval = await this.store.getApproval(approvalId);
    if (!approval) throw error("APPROVAL_NOT_FOUND");
    if (approval.status !== "PENDING") throw error("APPROVAL_NOT_PENDING");
    if (approval.requestedBy === actorId) throw error("FOUR_EYES_REQUIRED");
    const updated = await this.store.saveApproval(approvalId, {
      status: "APPROVED", approvedBy: actorId, approvedAt: this.clock().toISOString(),
      approvalReasonCode: reasonValue,
    });
    await this.audit("PLATFORM_APPROVAL_GRANTED", actorId, null, {
      approvalId, action: approval.action, targetId: approval.targetId, reasonCode: reasonValue,
    });
    return updated;
  }

  async listApprovals() { return this.store.listApprovals(); }

  async recordWebhook({ provider, eventId, rawBody, signature, secret, payload }) {
    if (!/^[a-z0-9-]{2,64}$/.test(String(provider || "")) || !/^[a-zA-Z0-9._:-]{1,200}$/.test(String(eventId || ""))) {
      throw error("WEBHOOK_ID_INVALID");
    }
    if (!verifyWebhookSignature(secret, rawBody, signature)) throw error("WEBHOOK_SIGNATURE_INVALID");
    const result = await this.store.recordWebhook({
      provider, eventId, payload: clone(payload), signatureVerified: true,
    });
    if (!result.duplicate) await this.audit("BILLING_WEBHOOK_RECEIVED", "system", null, { provider, eventId });
    return result;
  }

  async replayWebhook({ provider, eventId, actorId, reason }) {
    const reasonValue = reasonCode(reason);
    const event = await this.store.getWebhook(provider, eventId);
    if (!event) throw error("WEBHOOK_NOT_FOUND");
    if (event.status === "RECEIVED" && event.replayCount > 0) throw error("WEBHOOK_REPLAY_IN_PROGRESS");
    const updated = await this.store.saveWebhook(provider, eventId, {
      status: "RECEIVED", replayCount: event.replayCount + 1, replayedBy: actorId,
      replayedAt: this.clock().toISOString(),
    });
    await this.audit("BILLING_WEBHOOK_REPLAY_REQUESTED", actorId, null, { provider, eventId, reasonCode: reasonValue });
    return updated;
  }

  async listWebhooks() { return this.store.listWebhooks(); }

  async #consumeApproval({ approvalId, action, targetId, actorId, reasonCode: code, required }) {
    if (!required) return null;
    if (!approvalId) throw error("APPROVAL_REQUIRED");
    const approval = await this.store.getApproval(approvalId);
    if (!approval || approval.action !== action || approval.targetId !== targetId) throw error("APPROVAL_INVALID");
    if (approval.status !== "APPROVED") throw error("APPROVAL_NOT_APPROVED");
    if (approval.requestedBy === actorId) throw error("FOUR_EYES_REQUIRED");
    return this.store.saveApproval(approvalId, { status: "CONSUMED", consumedBy: actorId, consumedAt: this.clock().toISOString(), consumedReasonCode: code });
  }
}

module.exports = {
  APPROVAL_STATES,
  HIGH_RISK_ACTIONS,
  MemoryControlPlaneStore,
  PlatformControlPlane,
  PROVIDER_STATES,
  SUBSCRIPTION_STATES,
  reasonCode,
  signedWebhookPayload,
  verifyWebhookSignature,
};