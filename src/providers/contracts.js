const ENGINE_VERSION = "2.0.0";
const EVIDENCE_SCHEMA_VERSION = "1.0.0";
const {
  TRUST_CONTRACT_VERSION,
  EVIDENCE_STATUS,
  CAPABILITY_STATE,
  FRESHNESS_POLICY_HOURS,
  normalizeCapabilityProfile,
} = require("../contracts/trust");

const PROVIDER_RESULT_STATUS = Object.freeze({
  VALID: "valid",
  UNKNOWN: "unknown",
  UNAVAILABLE: "unavailable",
  PROVIDER_ERROR: "provider_error",
});

function isFiniteNumber(value) {
  return typeof value === "number" ? Number.isFinite(value) : true;
}

function pointStatus(value) {
  if (value === null || value === undefined || value === "" || !isFiniteNumber(value)) {
    return {
      status: "UNKNOWN",
      evidenceStatus: PROVIDER_RESULT_STATUS.UNKNOWN,
    };
  }
  if (typeof value === "boolean") {
    return {
      status: value ? "DETECTED" : "NOT_DETECTED",
      evidenceStatus: PROVIDER_RESULT_STATUS.VALID,
    };
  }
  return {
    status: "VERIFIED",
    evidenceStatus: PROVIDER_RESULT_STATUS.VALID,
  };
}

function normalizedPoint({
  value,
  providerId,
  adapterVersion,
  retrievedAt,
  confidence = "HIGH",
  evidenceReference = null,
  derived = false,
  status = null,
} = {}) {
  const resolved = status
    ? { status, evidenceStatus: PROVIDER_RESULT_STATUS.VALID }
    : pointStatus(value);
  return {
    value: resolved.evidenceStatus === PROVIDER_RESULT_STATUS.VALID ? value : null,
    status: resolved.status,
    evidenceStatus: resolved.evidenceStatus,
    confidence: resolved.evidenceStatus === PROVIDER_RESULT_STATUS.VALID ? confidence : "UNKNOWN",
    evidenceId: evidenceReference,
    retrievedAt: retrievedAt || null,
    derived,
    provenance: {
      providerId,
      adapterVersion,
      retrievedAt: retrievedAt || null,
      confidence: resolved.evidenceStatus === PROVIDER_RESULT_STATUS.VALID ? confidence : "UNKNOWN",
      engineVersion: ENGINE_VERSION,
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      evidenceReference,
    },
  };
}

function unverifiedSignalPoint({
  value,
  providerId,
  adapterVersion,
  retrievedAt,
  evidenceReference = null,
} = {}) {
  return normalizedPoint({
    value,
    providerId,
    adapterVersion,
    retrievedAt,
    evidenceReference,
    confidence: "LOW",
    status: "UNVERIFIED_SIGNAL",
  });
}

function normalizedResult({
  providerId,
  adapterVersion,
  status,
  evidence = {},
  retrievedAt = null,
  confidence = "HIGH",
  errorCode = null,
  message = null,
  limitations = [],
} = {}) {
  if (!Object.values(PROVIDER_RESULT_STATUS).includes(status)) {
    throw new TypeError(`Invalid provider result status: ${status}`);
  }
  return {
    status,
    providerId,
    adapterVersion,
    retrievedAt,
    confidence,
    evidence,
    errorCode,
    message,
    limitations,
  };
}

module.exports = {
  ENGINE_VERSION,
  EVIDENCE_SCHEMA_VERSION,
  TRUST_CONTRACT_VERSION,
  PROVIDER_RESULT_STATUS,
  EVIDENCE_STATUS,
  CAPABILITY_STATE,
  FRESHNESS_POLICY_HOURS,
  normalizeCapabilityProfile,
  normalizedPoint,
  unverifiedSignalPoint,
  normalizedResult,
};