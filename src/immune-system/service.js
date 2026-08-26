const crypto = require("node:crypto");
const {
  DEMO_SCENARIO,
  NETWORK_PROFILES,
  getPolicy,
} = require("./phase0");
const {
  compareIntentAndTransaction,
  decodeCalldata,
  normalizeAddress,
  normalizeIntent,
  normalizeTransaction,
} = require("./intent");
const { collectDeploymentEvidence, hash: evidenceHash, normalizeProvenanceEdge, unknownProvenance } = require("./evidence");
const { evaluatePolicy } = require("./policy");
const { AdmissionGate, InMemoryAttestationRegistry, canonicalize, hash } = require("./registry");

const FIXTURE = Object.freeze({
  sender: "0x0000000000000000000000000000000000000404",
  token: "0x0000000000000000000000000000000000000101",
  vault: "0x0000000000000000000000000000000000000202",
  spender: "0x0000000000000000000000000000000000000303",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function boundedKey(value) {
  if (typeof value !== "string" || !/^[\x21-\x7e]{1,128}$/.test(value)) {
    throw Object.assign(new Error("INVALID_IDEMPOTENCY_KEY"), { code: "INVALID_IDEMPOTENCY_KEY" });
  }
  return value;
}

function abiWord(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function abiAddress(address) {
  return address.slice(2).padStart(64, "0");
}

function approveCalldata(spender, amount) {
  return `0x095ea7b3${abiAddress(spender)}${abiWord(amount)}`;
}

function policySnapshot(policy) {
  return {
    id: policy.id,
    version: policy.version,
    purpose: policy.purpose,
    requiredChecks: clone(policy.requiredChecks || []),
    missingEvidenceOutcome: policy.missingEvidenceOutcome,
    conflictOutcome: policy.conflictOutcome,
  };
}

function publicDecision(record) {
  if (!record) return null;
  const result = clone(record);
  delete result.workspaceId;
  delete result.actorId;
  delete result.idempotencyKey;
  if (result.intent) delete result.intent.actorId;
  return result;
}

class ImmuneSystemService {
  constructor({
    persistence = null,
    clock = () => new Date(),
    deploymentReader = null,
    fetchImpl = fetch,
    issuerIds = ["server"],
  } = {}) {
    this.persistence = persistence;
    this.clock = clock;
    this.deploymentReader = deploymentReader;
    this.fetchImpl = fetchImpl;
    this.decisions = new Map();
    this.idempotency = new Map();
    this.provenance = new Map();
    this.registry = new InMemoryAttestationRegistry({ issuerIds, clock });
    this.gate = new AdmissionGate({ registry: this.registry, clock });
  }

  listPolicies() {
    return ["AI_AGENT_CONSERVATIVE", "LENDING_ASSET_ADMISSION", "DEMO_PERMISSIVE"].map((id) => policySnapshot(getPolicy(id)));
  }

  makeFixture(kind = "dangerous") {
    if (!["dangerous", "compliant"].includes(kind)) throw Object.assign(new Error("INVALID_DEMO_FIXTURE"), { code: "INVALID_DEMO_FIXTURE" });
    const amount = kind === "dangerous" ? ((1n << 256n) - 1n).toString() : DEMO_SCENARIO.asset.amount;
    const intent = {
      intentId: `fixture-${kind}-${DEMO_SCENARIO.version}`,
      actorType: "AI_AGENT",
      actorId: "fixture-agent",
      chainId: DEMO_SCENARIO.chainId,
      sender: FIXTURE.sender,
      declaredAction: "DEPOSIT",
      asset: { address: FIXTURE.token, symbol: "USDC" },
      amount: DEMO_SCENARIO.asset.amount,
      destination: FIXTURE.vault,
      expectedSpender: FIXTURE.spender,
      maxApproval: DEMO_SCENARIO.asset.amount,
      policyId: "DEMO_PERMISSIVE",
      policyVersion: "1.0.0",
    };
    return {
      fixtureId: `${DEMO_SCENARIO.id}:${kind}`,
      intent,
      unsignedTransaction: {
        transactionId: `fixture-tx-${kind}-${DEMO_SCENARIO.version}`,
        chainId: DEMO_SCENARIO.chainId,
        from: FIXTURE.sender,
        to: FIXTURE.token,
        value: "0",
        data: approveCalldata(FIXTURE.spender, amount),
        gasLimit: "100000",
        nonce: "1",
        capturedAt: this.clock().toISOString(),
        targetStandard: "ERC20",
      },
      fixtureEvidence: {
        label: DEMO_SCENARIO.label,
        liveEvidence: false,
        source: "Phase 0 locked scenario fixture",
        limitations: ["Fixture deployment, spender, and provenance assertions are not public-chain evidence."],
      },
    };
  }

  async createIntentCheck({ workspaceId, actorId, payload = {}, idempotencyKey, useFixture = null } = {}) {
    if (!workspaceId || !actorId) throw Object.assign(new Error("WORKSPACE_SCOPE_REQUIRED"), { code: "WORKSPACE_SCOPE_REQUIRED" });
    const inputForKey = useFixture ? `${DEMO_SCENARIO.id}:${useFixture}` : payload;
    const key = boundedKey(idempotencyKey || `intent:${hash(canonicalize(inputForKey)).slice(0, 96)}`);
    const idempotencyId = `${workspaceId}:${key}`;
    if (this.persistence?.getImmuneDecisionByIdempotency) {
      const persisted = await this.persistence.getImmuneDecisionByIdempotency(workspaceId, key);
      if (persisted) return { duplicate: true, decision: publicDecision(persisted) };
    }
    const existingId = this.idempotency.get(idempotencyId);
    if (existingId) return { duplicate: true, decision: publicDecision(this.decisions.get(existingId)) };

    const input = useFixture ? this.makeFixture(useFixture) : payload;
    const intentInput = input.intent || input;
    const transactionInput = input.unsignedTransaction || input.transaction;
    if (intentInput.actorId !== actorId && !useFixture) throw Object.assign(new Error("ACTOR_MISMATCH"), { code: "ACTOR_MISMATCH" });
    if (useFixture) intentInput.actorId = actorId;
    const intent = normalizeIntent(intentInput);
    const transaction = normalizeTransaction(transactionInput);
    const decoded = decodeCalldata(transaction.data, { targetStandard: transaction.targetStandard });
    const compared = compareIntentAndTransaction({ intent, transaction, decoded });
    const network = NETWORK_PROFILES[Object.keys(NETWORK_PROFILES).find((key) => NETWORK_PROFILES[key].chainId === intent.chainId)] || null;

    let deployment;
    let provenance;
    let evidenceSnapshot;
    if (useFixture || input.fixtureEvidence) {
      deployment = {
        status: "VERIFIED",
        deploymentStatus: "DEPLOYED",
        target: transaction.to,
        selectedChainId: intent.chainId,
        observedChainId: intent.chainId,
        blockNumber: 12345678,
        bytecodeLength: 4200,
        provider: "DEMO FIXTURE",
        evidenceHash: evidenceHash({ label: DEMO_SCENARIO.label, target: transaction.to, chainId: intent.chainId }),
        limitations: input.fixtureEvidence?.limitations || [],
      };
      provenance = {
        status: "VERIFIED",
        classification: "CONFIGURED",
        source: "DEMO FIXTURE",
        edges: [],
        evidenceHash: evidenceHash({ label: DEMO_SCENARIO.label, target: transaction.to }),
        limitation: input.fixtureEvidence?.limitations?.[0] || null,
      };
      if (useFixture === "dangerous") {
        compared.reasonCodes = [...new Set([...compared.reasonCodes, "UNKNOWN_SPENDER", "UPGRADEABLE_SPENDER"])];
        compared.exposure.reasonCodes = [...new Set([...compared.exposure.reasonCodes, "UNKNOWN_SPENDER", "UNLIMITED_APPROVAL"])];
      }
      evidenceSnapshot = {
        id: `snapshot_fixture_${hash({ fixtureId: input.fixtureId, transaction: transaction.transactionId }).slice(0, 24)}`,
        label: DEMO_SCENARIO.label,
        mode: "FIXTURE",
        capturedAt: this.clock().toISOString(),
        evidenceHash: evidenceHash({ deployment, provenance, transaction }),
      };
    } else {
      deployment = await collectDeploymentEvidence({
        networkId: network?.id || null,
        chainId: intent.chainId,
        address: transaction.to,
        now: this.clock(),
        fetchImpl: this.fetchImpl,
        reader: this.deploymentReader,
      });
      provenance = this.getProvenance({ networkId: network?.id, address: transaction.to });
      evidenceSnapshot = {
        id: `snapshot_live_${hash({ transaction: transaction.transactionId, capturedAt: deployment.retrievedAt }).slice(0, 24)}`,
        label: "LIVE",
        mode: "LIVE",
        capturedAt: deployment.retrievedAt || this.clock().toISOString(),
        evidenceHash: evidenceHash({ deployment, provenance }),
      };
    }

    const policyResult = evaluatePolicy({
      intent,
      transaction,
      decoded,
      comparison: compared,
      deployment,
      provenance,
      policyId: intent.policyId,
      policyVersion: intent.policyVersion,
      evidenceSnapshot,
    });
    const issuedAt = this.clock().toISOString();
    const expiresAt = new Date(this.clock().getTime() + 60 * 60 * 1000).toISOString();
    const decisionId = `decision_${crypto.randomUUID()}`;
    const decisionHash = `0x${hash({
      intent,
      transaction,
      decoded,
      compared,
      deployment,
      provenance,
      policy: policyResult.policy,
      decision: policyResult.decision,
      evidenceSnapshot,
    })}`;
    const record = {
      decisionId,
      workspaceId,
      actorId,
      status: policyResult.status,
      decision: policyResult.decision,
      reasonCodes: policyResult.reasonCodes,
      decisionMeaning: policyResult.decisionMeaning,
      issuedAt,
      expiresAt,
      decisionHash,
      policyHash: `0x${policyResult.policyHash}`,
      intent: clone(intent),
      unsignedTransaction: clone(transaction),
      decodedCall: clone(decoded),
      decodedOperation: clone(decoded),
      exposure: clone(compared.exposure),
      permissionExposure: clone(compared.exposure),
      comparison: clone(compared.comparison),
      policy: clone(policyResult.policy),
      evidenceSnapshot: clone(evidenceSnapshot),
      deployment: clone(deployment),
      provenance: clone(provenance),
      limitations: policyResult.limitations,
      fixture: useFixture ? { id: input.fixtureId, label: DEMO_SCENARIO.label, liveEvidence: false } : null,
      attestation: null,
      idempotencyKey: key,
    };
    if (this.persistence?.saveImmuneDecision) {
      const saved = await this.persistence.saveImmuneDecision(record);
      const persisted = saved.decision || record;
      this.decisions.set(persisted.decisionId, persisted);
      this.idempotency.set(idempotencyId, persisted.decisionId);
      return { duplicate: Boolean(saved.duplicate), decision: publicDecision(persisted) };
    }
    this.decisions.set(decisionId, record);
    this.idempotency.set(idempotencyId, decisionId);
    return { duplicate: false, decision: publicDecision(record) };
  }

  async createDecision({ workspaceId, actorId, input = {}, idempotencyKey = null } = {}) {
    return this.createIntentCheck({ workspaceId, actorId, payload: input, idempotencyKey });
  }

  async replayChange({ workspaceId, actorId, decisionId, changeId = "DEPENDENCY_CHANGED", idempotencyKey = null } = {}) {
    const original = this.persistence?.getImmuneDecision
      ? await this.persistence.getImmuneDecision(workspaceId, decisionId)
      : this.decisions.get(decisionId);
    if (!original || original.workspaceId !== workspaceId) {
      throw Object.assign(new Error("DECISION_NOT_FOUND"), { code: "DECISION_NOT_FOUND" });
    }
    const replayKey = idempotencyKey || `watchtower:${decisionId}:${String(changeId).slice(0, 64)}`;
    const replay = await this.createIntentCheck({
      workspaceId,
      actorId,
      idempotencyKey: replayKey,
      payload: {
        intent: clone(original.intent),
        unsignedTransaction: clone(original.unsignedTransaction),
      },
    });
    return {
      replayed: true,
      sourceDecisionId: decisionId,
      changeId: String(changeId).slice(0, 64),
      ...replay,
    };
  }

  async getDecision(workspaceId, decisionId) {
    const record = this.persistence?.getImmuneDecision
      ? await this.persistence.getImmuneDecision(workspaceId, decisionId)
      : this.decisions.get(decisionId);
    if (!record || record.workspaceId !== workspaceId) return null;
    this.decisions.set(decisionId, record);
    return publicDecision(record);
  }

  async attestDecision({ workspaceId, actorId = null, decisionId, issuerId = "server", passportId = null } = {}) {
    const record = this.persistence?.getImmuneDecision
      ? await this.persistence.getImmuneDecision(workspaceId, decisionId)
      : this.decisions.get(decisionId);
    if (!record || record.workspaceId !== workspaceId) throw Object.assign(new Error("DECISION_NOT_FOUND"), { code: "DECISION_NOT_FOUND" });
    if (record.decision !== "ALLOW") throw Object.assign(new Error("ATTESTATION_DECISION_NOT_ALLOW"), { code: "ATTESTATION_DECISION_NOT_ALLOW" });
    if (record.attestation) return { duplicate: true, passport: this.registry.get(record.attestation.passportId) || await this.persistence?.getImmunePassport(record.attestation.passportId) };
    const passport = this.registry.attest({
      issuerId,
      passportId: passportId || `passport:${decisionId}`,
      subjectChainId: record.intent.chainId,
      subject: record.unsignedTransaction.to,
       evidenceHash: record.evidenceSnapshot.evidenceHash,
       policyHash: record.policyHash || `0x${hash(record.policy)}`,
      policyId: record.policy.id,
      policyVersion: record.policy.version,
      decision: record.decision,
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt,
      workspaceId,
      decisionId,
    });
    record.attestation = { passportId: passport.passportId, attestationHash: passport.attestationHash };
    if (this.persistence?.updateImmuneDecision) await this.persistence.updateImmuneDecision(workspaceId, decisionId, record);
    if (this.persistence?.saveImmunePassport) await this.persistence.saveImmunePassport({ ...passport, mode: "LOCAL_SIMULATION", workspaceId, decisionId });
    this.decisions.set(decisionId, record);
    return { duplicate: false, passport: clone(passport), actorId };
  }

  async getPassport(passportId, workspaceId = null) {
    const passport = this.registry.get(passportId) || await this.persistence?.getImmunePassport(passportId);
    if (!passport || (workspaceId && passport.workspaceId !== workspaceId)) return null;
    return clone(passport);
  }

  async verifyPassport({ workspaceId = null, passportId, subjectChainId = null, subject = null } = {}) {
    const passport = await this.getPassport(passportId, workspaceId);
    if (!passport) return null;
    if (this.registry.get(passportId)) return this.gate.admit({ passportId, subjectChainId, subject });
    const reasonCodes = [];
    if (subjectChainId !== null && Number(subjectChainId) !== passport.subjectChainId) reasonCodes.push("TARGET_CHAIN_MISMATCH");
    if (subject !== null && String(subject).toLowerCase() !== passport.subject) reasonCodes.push("TARGET_CHAIN_MISMATCH");
    if (passport.decision !== "ALLOW") reasonCodes.push("HUMAN_REVIEW_REQUIRED");
    if (passport.invalidated) reasonCodes.push("ATTESTATION_INVALIDATED");
    if (new Date() >= new Date(passport.expiresAt)) reasonCodes.push("ATTESTATION_EXPIRED");
    return { usable: reasonCodes.length === 0, status: reasonCodes.length ? "REJECTED" : "ACCEPTED", reasonCodes, passport };
  }

  async invalidatePassport({ workspaceId, passportId, reasonCode = "DEPENDENCY_CHANGED" } = {}) {
    const passport = await this.getPassport(passportId, workspaceId);
    if (!passport || passport.workspaceId !== workspaceId) throw Object.assign(new Error("PASSPORT_NOT_FOUND"), { code: "PASSPORT_NOT_FOUND" });
    const result = this.registry.get(passportId)
      ? this.registry.invalidate({ issuerId: "server", passportId, reasonCode })
      : { duplicate: Boolean(passport.invalidated), passport };
    if (this.persistence?.saveImmunePassport) {
      await this.persistence.saveImmunePassport({ ...passport, invalidated: true, invalidatedAt: result.passport.invalidatedAt || this.clock().toISOString(), invalidationReason: reasonCode });
    }
    return result;
  }

  getProvenance({ networkId, address } = {}) {
    const key = `${networkId}:${String(address || "").toLowerCase()}`;
    const stored = this.provenance.get(key);
    if (stored) return clone(stored);
    return unknownProvenance({ networkId, address });
  }

  configureProvenance(edge) {
    const normalized = normalizeProvenanceEdge(edge);
    const key = `${normalized.to.networkId}:${normalized.to.address}`;
    const current = this.provenance.get(key);
    if (current && current.status !== normalized.status) {
      this.provenance.set(key, {
        subject: normalized.to,
        status: "CONFLICT",
        edges: [current, normalized],
        evidenceHash: evidenceHash({ current, normalized }),
        reasonCodes: ["PROVIDER_CONFLICT"],
        limitation: "Configured provenance sources disagree.",
      });
    } else {
      this.provenance.set(key, {
        subject: normalized.to,
        status: normalized.status,
        edges: [normalized],
        evidenceHash: normalized.evidenceHash,
        limitation: normalized.limitation,
      });
    }
    return clone(this.provenance.get(key));
  }

  getEvents() {
    return this.registry.listEvents();
  }

  getAdmissionAttempts() {
    return this.gate.listAttempts();
  }

  getBlastRadius(subjectId) {
    const invalidated = this.registry.listEvents().filter((item) => item.eventType === "ATTESTATION_INVALIDATED");
    return {
      subjectId,
      status: invalidated.length ? "PARTIAL" : "UNKNOWN",
      affectedPassports: invalidated.filter((item) => item.subject === subjectId || item.passportId === subjectId).map((item) => item.passportId),
      reasonCodes: invalidated.length ? ["DEPENDENCY_CHANGED"] : ["BLAST_RADIUS_INCOMPLETE"],
      limitation: "Only attestations held by this process are included; external registry/indexer state is not inferred.",
    };
  }
}

module.exports = {
  FIXTURE,
  ImmuneSystemService,
  approveCalldata,
  canonicalize,
};