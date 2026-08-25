const TRUST_CONTRACT_VERSION = "1.0.0";

const EVIDENCE_STATUS = Object.freeze([
  "NOT_SUPPORTED",
  "NOT_CHECKED",
  "UNKNOWN",
  "UNAVAILABLE",
  "UNVERIFIED",
  "CONFLICT",
  "PARTIAL",
  "VERIFIED",
]);

const CAPABILITY_STATE = Object.freeze([
  "NOT_SUPPORTED",
  "NOT_CHECKED",
  "AVAILABLE",
  "PARTIAL",
  "UNAVAILABLE",
  "PROVIDER_ERROR",
]);

const FRESHNESS_STATE = Object.freeze(["FRESH", "STALE", "UNKNOWN"]);

const FRESHNESS_POLICY_HOURS = Object.freeze({
  liquidity: 24,
  market: 6,
  trading: 6,
  holders: 24,
  control: 168,
  owner: 168,
  deployer: 720,
  contract: 720,
  default: 24,
});

const NON_COMPARABLE_EVIDENCE_STATUS = new Set([
  "NOT_SUPPORTED",
  "NOT_CHECKED",
  "UNKNOWN",
  "UNAVAILABLE",
  "UNVERIFIED",
  "CONFLICT",
  "PARTIAL",
  "ERROR",
]);

const EVENT_TYPE = Object.freeze([
  "TARGET_REGISTERED",
  "SCAN_REQUESTED",
  "SNAPSHOT_COMPLETED",
  "SNAPSHOT_PARTIAL",
  "SNAPSHOT_FAILED",
  "PASSPORT_UPDATED",
  "MONITORING_RUN_COMPLETED",
  "EVIDENCE_PULSE_CREATED",
  "ALERT_CREATED",
  "ALERT_ACKNOWLEDGED",
  "CASE_CREATED",
  "DECISION_RECORDED",
  "DECISION_PACKET_PUBLISHED",
  "REPORT_REVISION_PUBLISHED",
  "DELIVERY_FAILED",
  "DELIVERY_REPLAYED",
]);

function normalizeEvidenceStatus(value, fallback = "UNKNOWN") {
  const normalized = String(value || fallback).toUpperCase();
  if (!EVIDENCE_STATUS.includes(normalized)) {
    throw new TypeError(`Invalid evidence status: ${value}`);
  }
  return normalized;
}

function isComparableEvidenceStatus(value) {
  return !NON_COMPARABLE_EVIDENCE_STATUS.has(String(value || "UNKNOWN").toUpperCase());
}

function confidenceToNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  const normalized = String(value || "").toUpperCase();
  return ({ HIGH: 90, MEDIUM: 65, LOW: 35 }[normalized] || null);
}

function normalizeCapabilityProfile(capabilities = [], { version = TRUST_CONTRACT_VERSION } = {}) {
  if (!Array.isArray(capabilities) || !capabilities.length) throw new TypeError("Capability profile must contain at least one capability.");
  const seen = new Set();
  const normalized = capabilities.map((capability) => {
    if (!capability || typeof capability !== "object" || !capability.key) throw new TypeError("Capability profile entries require a key.");
    if (seen.has(capability.key)) throw new TypeError(`Capability profile contains duplicate key: ${capability.key}`);
    seen.add(capability.key);
    const state = String(capability.state || capability.support || "").toUpperCase();
    const resolvedState = state === "SUPPORTED" ? "AVAILABLE"
      : state === "NOT_SUPPORTED" ? "NOT_SUPPORTED"
        : CAPABILITY_STATE.includes(state) ? state : "NOT_CHECKED";
    return Object.freeze({
      key: capability.key,
      state: resolvedState,
      evidenceStatus: normalizeEvidenceStatus(capability.evidenceStatus || (resolvedState === "AVAILABLE" || resolvedState === "PROVIDER_ERROR" ? "NOT_CHECKED" : resolvedState === "UNAVAILABLE" ? "UNAVAILABLE" : resolvedState)),
      provider: capability.provider || null,
      limitation: capability.limitation || null,
    });
  });
  return Object.freeze({ version, capabilities: Object.freeze(normalized) });
}

function freshnessFor({ retrievedAt, family = "default", now = new Date() } = {}) {
  const parsed = Date.parse(retrievedAt);
  if (!Number.isFinite(parsed)) {
    return { state: "UNKNOWN", retrievedAt: retrievedAt || null, ageHours: null, ttlHours: FRESHNESS_POLICY_HOURS[family] || FRESHNESS_POLICY_HOURS.default };
  }
  const nowMs = new Date(now).getTime();
  const ageHours = Math.max(0, (nowMs - parsed) / 3600000);
  const ttlHours = FRESHNESS_POLICY_HOURS[family] || FRESHNESS_POLICY_HOURS.default;
  return {
    state: ageHours > ttlHours ? "STALE" : "FRESH",
    retrievedAt: new Date(parsed).toISOString(),
    ageHours: Number(ageHours.toFixed(2)),
    ttlHours,
  };
}

function assertSnapshotEnvelope(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new TypeError("Evidence snapshot must be an object.");
  for (const field of ["id", "targetId", "capturedAt", "evidenceHash"]) {
    if (!snapshot[field]) throw new TypeError(`Evidence snapshot is missing ${field}.`);
  }
  if (!Number.isFinite(Date.parse(snapshot.capturedAt))) throw new TypeError("Evidence snapshot capturedAt must be an ISO date.");
  if (snapshot.dataStatus !== undefined && !["valid", "partial", "unknown", "unavailable", "provider_error", "error"].includes(String(snapshot.dataStatus).toLowerCase())) {
    throw new TypeError(`Invalid snapshot data status: ${snapshot.dataStatus}`);
  }
  return true;
}

function createEventEnvelope({ type, eventId, occurredAt = new Date().toISOString(), correlationId = null, causationId = null, workspaceId = null, targetId = null, payload = {} } = {}) {
  if (!EVENT_TYPE.includes(type)) throw new TypeError(`Invalid trust event type: ${type}`);
  if (!eventId) throw new TypeError("Trust event requires eventId.");
  if (!Number.isFinite(Date.parse(occurredAt))) throw new TypeError("Trust event occurredAt must be an ISO date.");
  return Object.freeze({
    eventId, eventType: type, schemaVersion: TRUST_CONTRACT_VERSION, occurredAt,
    correlationId, causationId, workspaceId, targetId, payload,
  });
}

module.exports = {
  TRUST_CONTRACT_VERSION,
  EVIDENCE_STATUS,
  CAPABILITY_STATE,
  normalizeCapabilityProfile,
  FRESHNESS_STATE,
  FRESHNESS_POLICY_HOURS,
  EVENT_TYPE,
  normalizeEvidenceStatus,
  isComparableEvidenceStatus,
  confidenceToNumber,
  freshnessFor,
  assertSnapshotEnvelope,
  createEventEnvelope,
};