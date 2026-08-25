const crypto = require("node:crypto");

const DATA_CLASSIFICATION = Object.freeze({
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  RESTRICTED: "RESTRICTED",
  SECRET: "SECRET",
});

const ROLES = Object.freeze({
  VISITOR: "Visitor",
  USER: "User",
  WORKSPACE_MEMBER: "Workspace Member",
  WORKSPACE_OWNER: "Workspace Owner",
  SUPERADMIN: "Superadmin",
  SUPPORT_ADMIN: "Support Admin",
  READ_ONLY_AUDITOR: "Read-only Auditor",
});

const ACTIONS = Object.freeze({
  PUBLIC_READ: "public.read",
  WORKSPACE_READ: "workspace.read",
  SCAN_CREATE: "scan.create",
  SCAN_READ: "scan.read",
  SCAN_EXPORT: "scan.export",
  MEMBERSHIP_MANAGE: "membership.manage",
  BILLING_MANAGE: "billing.manage",
  PROVIDER_CONFIGURE: "provider.configure",
  AUDIT_READ: "audit.read",
  PLATFORM_MANAGE: "platform.manage",
  COMPLIANCE_READ: "compliance.read",
  COMPLIANCE_REVIEW: "compliance.review",
  COMPLIANCE_APPROVE: "compliance.approve",
  GOVERNANCE_MANAGE: "governance.manage",
});

// Superadmin is intentionally not granted workspace permissions. A platform
// role must use a separately audited platform/support path.
const PERMISSION_MATRIX = Object.freeze({
  [ROLES.VISITOR]: Object.freeze([ACTIONS.PUBLIC_READ, ACTIONS.SCAN_CREATE, ACTIONS.SCAN_READ]),
  [ROLES.USER]: Object.freeze([
    ACTIONS.PUBLIC_READ,
    ACTIONS.WORKSPACE_READ,
    ACTIONS.SCAN_CREATE,
    ACTIONS.SCAN_READ,
    ACTIONS.SCAN_EXPORT,
    ACTIONS.COMPLIANCE_READ,
    ACTIONS.COMPLIANCE_REVIEW,
    ACTIONS.COMPLIANCE_APPROVE,
    ACTIONS.GOVERNANCE_MANAGE,
  ]),
  [ROLES.WORKSPACE_MEMBER]: Object.freeze([
    ACTIONS.PUBLIC_READ,
    ACTIONS.WORKSPACE_READ,
    ACTIONS.SCAN_CREATE,
    ACTIONS.SCAN_READ,
    ACTIONS.SCAN_EXPORT,
    ACTIONS.COMPLIANCE_READ,
    ACTIONS.COMPLIANCE_REVIEW,
  ]),
  [ROLES.WORKSPACE_OWNER]: Object.freeze([
    ACTIONS.PUBLIC_READ,
    ACTIONS.WORKSPACE_READ,
    ACTIONS.SCAN_CREATE,
    ACTIONS.SCAN_READ,
    ACTIONS.SCAN_EXPORT,
    ACTIONS.COMPLIANCE_READ,
    ACTIONS.COMPLIANCE_REVIEW,
    ACTIONS.COMPLIANCE_APPROVE,
    ACTIONS.GOVERNANCE_MANAGE,
    ACTIONS.MEMBERSHIP_MANAGE,
    ACTIONS.BILLING_MANAGE,
  ]),
  [ROLES.SUPERADMIN]: Object.freeze([ACTIONS.PLATFORM_MANAGE]),
  [ROLES.SUPPORT_ADMIN]: Object.freeze([ACTIONS.PUBLIC_READ, ACTIONS.WORKSPACE_READ, ACTIONS.AUDIT_READ, ACTIONS.COMPLIANCE_READ]),
  [ROLES.READ_ONLY_AUDITOR]: Object.freeze([
    ACTIONS.PUBLIC_READ,
    ACTIONS.WORKSPACE_READ,
    ACTIONS.SCAN_READ,
    ACTIONS.SCAN_EXPORT,
    ACTIONS.AUDIT_READ,
    ACTIONS.COMPLIANCE_READ,
  ]),
});

const PRIVATE_CLASSIFICATIONS = new Set([
  DATA_CLASSIFICATION.PRIVATE,
  DATA_CLASSIFICATION.RESTRICTED,
]);

function assertKnownRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error(`UNKNOWN_ROLE:${role}`);
  }
}

function assertRecordScope(record, workspaceId, classification = DATA_CLASSIFICATION.PRIVATE) {
  if (!PRIVATE_CLASSIFICATIONS.has(classification)) return record;
  if (!record || typeof record !== "object" || typeof record.workspace_id !== "string" || !record.workspace_id) {
    throw new Error("WORKSPACE_SCOPE_REQUIRED");
  }
  if (record.workspace_id !== workspaceId) {
    const error = new Error("WORKSPACE_SCOPE_MISMATCH");
    error.code = "WORKSPACE_SCOPE_MISMATCH";
    throw error;
  }
  return record;
}

function assertNoSecretPersistence(value, path = "record") {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && /secret|token|private.?key|password|api.?key/i.test(path)) {
    throw new Error("SECRET_PERSISTENCE_FORBIDDEN");
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretPersistence(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      assertNoSecretPersistence(nested, `${path}.${key}`);
    }
  }
}

function can(actor, action) {
  if (!actor || typeof actor !== "object") return false;
  assertKnownRole(actor.role);
  return PERMISSION_MATRIX[actor.role].includes(action);
}

function authorize({ actor, workspaceId, action, record = null, classification = DATA_CLASSIFICATION.PRIVATE }) {
  if (!can(actor, action)) {
    const error = new Error("FORBIDDEN");
    error.code = "FORBIDDEN";
    throw error;
  }
  if (action !== ACTIONS.PUBLIC_READ && action !== ACTIONS.PLATFORM_MANAGE) {
    if (!workspaceId || actor.role === ROLES.SUPERADMIN) {
      const error = new Error("WORKSPACE_SCOPE_REQUIRED");
      error.code = "WORKSPACE_SCOPE_REQUIRED";
      throw error;
    }
    if (record) assertRecordScope(record, workspaceId, classification);
    if (actor.workspaceId && actor.workspaceId !== workspaceId) {
      const error = new Error("WORKSPACE_SCOPE_MISMATCH");
      error.code = "WORKSPACE_SCOPE_MISMATCH";
      throw error;
    }
  }
  return true;
}

function createVisitorContext({ visitorId = crypto.randomUUID() } = {}) {
  const workspaceId = `visitor_${visitorId}`;
  return Object.freeze({
    actor: Object.freeze({
      id: workspaceId,
      role: ROLES.VISITOR,
      authenticated: false,
      workspaceId,
    }),
    workspaceId,
    workspaceType: "personal",
    planId: "free",
  });
}

function personalWorkspaceForUser(userId) {
  if (typeof userId !== "string" || !userId) throw new Error("USER_ID_REQUIRED");
  return `personal_${userId}`;
}

module.exports = {
  ACTIONS,
  DATA_CLASSIFICATION,
  PERMISSION_MATRIX,
  ROLES,
  PRIVATE_CLASSIFICATIONS,
  assertKnownRole,
  assertNoSecretPersistence,
  assertRecordScope,
  authorize,
  can,
  createVisitorContext,
  personalWorkspaceForUser,
};