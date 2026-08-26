const { createHash } = require("node:crypto");
const { DECISION_STATUS } = require("./phase0");
const { normalizeAddress, normalizeChainId, normalizeInteger } = require("./intent");

const ZERO_HASH = `0x${"0".repeat(64)}`;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function canonicalize(value) {
  return JSON.stringify(stable(value));
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalize(value)).digest("hex");
}

function normalizeBytes32(value, field) {
  const text = String(value || "");
  if (!/^(?:0x)?[0-9a-f]{64}$/i.test(text)) {
    const error = new TypeError(`${field} must be a 32-byte hex value.`);
    error.code = "INVALID_HASH";
    throw error;
  }
  return `0x${text.replace(/^0x/i, "").toLowerCase()}`;
}

function event(type, payload, clock) {
  return Object.freeze({
    eventId: `event_${hash({ type, payload, at: clock().toISOString() }).slice(0, 24)}`,
    eventType: type,
    schemaVersion: "1.0.0",
    occurredAt: clock().toISOString(),
    ...clone(payload),
  });
}

class InMemoryAttestationRegistry {
  constructor({ issuerIds = ["server"], clock = () => new Date() } = {}) {
    this.issuerIds = new Set(issuerIds);
    this.clock = clock;
    this.records = new Map();
    this.events = [];
  }

  addIssuer(issuerId) {
    if (!issuerId || typeof issuerId !== "string") throw Object.assign(new TypeError("issuerId is required."), { code: "ISSUER_REQUIRED" });
    this.issuerIds.add(issuerId);
  }

  attest({
    issuerId,
    passportId,
    subjectChainId,
    subject,
    evidenceHash,
    policyHash,
    policyId,
    policyVersion,
    decision,
    issuedAt = this.clock().toISOString(),
    expiresAt,
    workspaceId = null,
    decisionId = null,
  } = {}) {
    if (!this.issuerIds.has(issuerId)) throw Object.assign(new Error("ISSUER_NOT_AUTHORIZED"), { code: "ISSUER_NOT_AUTHORIZED" });
    if (!passportId || passportId === ZERO_HASH || /^0x0+$/i.test(passportId)) throw Object.assign(new Error("PASSPORT_ID_REQUIRED"), { code: "PASSPORT_ID_REQUIRED" });
    if (this.records.has(passportId)) throw Object.assign(new Error("PASSPORT_DUPLICATE"), { code: "PASSPORT_DUPLICATE" });
    const chainId = normalizeChainId(subjectChainId, "subjectChainId");
    const normalizedSubject = normalizeAddress(subject, "subject");
    const normalizedDecision = String(decision || "").toUpperCase();
    if (!DECISION_STATUS.includes(normalizedDecision)) throw Object.assign(new Error("INVALID_DECISION"), { code: "INVALID_DECISION" });
    const issued = new Date(issuedAt);
    const expires = new Date(expiresAt);
    if (!Number.isFinite(issued.getTime()) || !Number.isFinite(expires.getTime()) || expires.getTime() <= issued.getTime()) {
      throw Object.assign(new Error("INVALID_ATTESTATION_EXPIRY"), { code: "INVALID_ATTESTATION_EXPIRY" });
    }
    const record = {
      passportId,
      subjectChainId: chainId,
      subject: normalizedSubject,
      evidenceHash: normalizeBytes32(evidenceHash, "evidenceHash"),
      policyHash: normalizeBytes32(policyHash, "policyHash"),
      policyId: String(policyId || ""),
      policyVersion: String(policyVersion || ""),
      issuedAt: issued.toISOString(),
      expiresAt: expires.toISOString(),
      decision: normalizedDecision,
      invalidated: false,
      invalidatedAt: null,
      invalidationReason: null,
      issuerId,
      workspaceId,
      decisionId,
      attestationHash: `0x${hash({
        passportId,
        subjectChainId: chainId,
        subject: normalizedSubject,
        evidenceHash: normalizeBytes32(evidenceHash, "evidenceHash"),
        policyHash: normalizeBytes32(policyHash, "policyHash"),
        policyId,
        policyVersion,
        decision: normalizedDecision,
        issuedAt: issued.toISOString(),
        expiresAt: expires.toISOString(),
      })}`,
    };
    this.records.set(passportId, record);
    this.events.push(event("ATTESTATION_ISSUED", {
      passportId,
      subjectChainId: chainId,
      subject: normalizedSubject,
      decision: normalizedDecision,
      evidenceHash: record.evidenceHash,
      policyHash: record.policyHash,
      issuerId,
    }, this.clock));
    return clone(record);
  }

  get(passportId) {
    return clone(this.records.get(passportId) || null);
  }

  invalidate({ issuerId, passportId, reasonCode = "ATTESTATION_INVALIDATED" } = {}) {
    if (!this.issuerIds.has(issuerId)) throw Object.assign(new Error("ISSUER_NOT_AUTHORIZED"), { code: "ISSUER_NOT_AUTHORIZED" });
    const record = this.records.get(passportId);
    if (!record) throw Object.assign(new Error("PASSPORT_NOT_FOUND"), { code: "PASSPORT_NOT_FOUND" });
    if (record.invalidated) return { duplicate: true, passport: clone(record) };
    record.invalidated = true;
    record.invalidatedAt = this.clock().toISOString();
    record.invalidationReason = reasonCode;
    this.events.push(event("ATTESTATION_INVALIDATED", {
      passportId,
      subjectChainId: record.subjectChainId,
      subject: record.subject,
      reasonCode,
      issuerId,
    }, this.clock));
    return { duplicate: false, passport: clone(record) };
  }

  verify({ passportId, subjectChainId = null, subject = null, now = this.clock() } = {}) {
    const record = this.records.get(passportId);
    if (!record) return { usable: false, status: "NOT_FOUND", reasonCodes: ["ATTESTATION_EXPIRED"], passport: null };
    const reasonCodes = [];
    if (subjectChainId !== null && normalizeChainId(subjectChainId) !== record.subjectChainId) reasonCodes.push("TARGET_CHAIN_MISMATCH");
    if (subject !== null && normalizeAddress(subject, "subject") !== record.subject) reasonCodes.push("TARGET_CHAIN_MISMATCH");
    if (record.decision !== "ALLOW") reasonCodes.push("HUMAN_REVIEW_REQUIRED");
    if (record.invalidated) reasonCodes.push("ATTESTATION_INVALIDATED");
    if (new Date(now).getTime() >= new Date(record.expiresAt).getTime()) reasonCodes.push("ATTESTATION_EXPIRED");
    const usable = reasonCodes.length === 0;
    return {
      usable,
      status: usable ? "ACCEPTED" : "REJECTED",
      reasonCodes,
      passport: clone(record),
    };
  }

  listEvents() {
    return clone(this.events);
  }
}

class AdmissionGate {
  constructor({ registry, clock = () => new Date() } = {}) {
    if (!registry) throw new TypeError("AdmissionGate requires a registry.");
    this.registry = registry;
    this.clock = clock;
    this.attempts = [];
  }

  admit({ passportId, subjectChainId = null, subject = null } = {}) {
    const result = this.registry.verify({ passportId, subjectChainId, subject, now: this.clock() });
    const attempt = {
      attemptId: `admission_${hash({ passportId, subjectChainId, subject, at: this.clock().toISOString() }).slice(0, 24)}`,
      passportId,
      subjectChainId,
      subject,
      result: result.usable ? "ACCEPTED" : "REJECTED",
      reasonCodes: result.reasonCodes,
      attemptedAt: this.clock().toISOString(),
    };
    this.attempts.push(attempt);
    return { ...result, attempt: clone(attempt) };
  }

  listAttempts() {
    return clone(this.attempts);
  }
}

module.exports = {
  ZERO_HASH,
  canonicalize,
  hash,
  InMemoryAttestationRegistry,
  AdmissionGate,
};