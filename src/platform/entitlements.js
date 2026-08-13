const CAPABILITIES = Object.freeze({
  WORKSPACE_READ: "workspace.read",
  SCAN_CREATE: "scan.create",
  SCAN_READ: "scan.read",
  SCAN_EXPORT: "scan.export",
  MEMBERSHIP_MANAGE: "membership.manage",
  BILLING_MANAGE: "billing.manage",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function planCapabilities(plan) {
  if (!plan) return [];
  return Array.isArray(plan.capabilities) ? plan.capabilities.slice() : [];
}

function resolvePlanEntitlements({ plan, now = new Date() } = {}) {
  const effectiveAt = new Date(now).toISOString();
  return planCapabilities(plan).map((capability) => ({
    capability,
    source: "plan",
    status: "active",
    effectiveAt,
    expiresAt: null,
    reason: `Included in ${plan.name || plan.id} plan`,
  }));
}

function isEffective(entitlement, now = new Date()) {
  if (!entitlement || entitlement.status !== "active") return false;
  const timestamp = new Date(now).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (entitlement.effectiveAt && new Date(entitlement.effectiveAt).getTime() > timestamp) return false;
  if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() <= timestamp) return false;
  return true;
}

function resolveEffectiveEntitlements({ plan, grants = [], now = new Date() } = {}) {
  const resolved = new Map(resolvePlanEntitlements({ plan, now }).map((item) => [item.capability, item]));
  for (const grant of grants || []) {
    if (!grant?.capability) continue;
    // An explicit grant/revocation is authoritative for that capability.
    resolved.set(grant.capability, {
      capability: grant.capability,
      source: grant.source || "manual",
      status: grant.status || "active",
      effectiveAt: grant.effectiveAt || grant.effective_at || new Date(now).toISOString(),
      expiresAt: grant.expiresAt || grant.expires_at || null,
      reason: grant.reason || grant.auditReference || grant.audit_reference || "Explicit entitlement change",
    });
  }
  return [...resolved.values()].map(clone);
}

function hasEntitlement(entitlements, capability, now = new Date()) {
  return (entitlements || []).some((item) => item.capability === capability && isEffective(item, now));
}

function requireEntitlement(entitlements, capability, now = new Date()) {
  if (hasEntitlement(entitlements, capability, now)) return true;
  const error = new Error("ENTITLEMENT_REQUIRED");
  error.code = "ENTITLEMENT_REQUIRED";
  error.capability = capability;
  throw error;
}

module.exports = {
  CAPABILITIES,
  hasEntitlement,
  isEffective,
  requireEntitlement,
  resolveEffectiveEntitlements,
  resolvePlanEntitlements,
};