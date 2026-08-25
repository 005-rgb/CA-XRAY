const crypto = require("node:crypto");
const {
  DEFAULT_POLICY, DECISIONS, REVIEW_STATUSES, bilingualReport,
  decisionOutcome, evaluatePolicy, normalizePolicy, clone: complianceClone, id: complianceId, invalid: complianceInvalid,
} = require("../compliance/policy");
const {
  buildCluster, buildNetworkHypotheses, extractDeployerObservation, fingerprintKey, publicFingerprint,
} = require("./deployer-cluster");

const WATCH_INTERVALS = Object.freeze([1, 6, 12, 24, 168]);
const ALERT_TYPES = Object.freeze([
  "risk_increase",
  "owner_change",
  "privilege_change",
  "proxy_change",
  "tax_change",
  "liquidity_change",
  "holder_concentration_change",
  "provider_disagreement",
]);
const VISIBILITIES = new Set(["private", "public"]);
const FINDING_STATUSES = new Set(["open", "reviewing", "resolved"]);
const PASSPORT_REVIEW_STATUSES = new Set(["OPEN", "ACKNOWLEDGED", "DEFERRED", "RESOLVED"]);
const ALERT_STATUSES = new Set(["OPEN", "ACKNOWLEDGED", "SNOOZED", "INVESTIGATING", "RESOLVED"]);
const ALERT_TRANSITIONS = Object.freeze({
  OPEN: new Set(["ACKNOWLEDGED", "SNOOZED", "INVESTIGATING", "RESOLVED"]),
  ACKNOWLEDGED: new Set(["SNOOZED", "INVESTIGATING", "RESOLVED", "OPEN"]),
  SNOOZED: new Set(["OPEN", "INVESTIGATING", "RESOLVED"]),
  INVESTIGATING: new Set(["SNOOZED", "RESOLVED", "OPEN"]),
  RESOLVED: new Set(["OPEN"]),
});
const EVIDENCE_FRESHNESS_TTL_HOURS = Object.freeze({
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
const REVIEW_TRANSITIONS = Object.freeze({
  OPEN: new Set(["ACKNOWLEDGED", "DEFERRED", "RESOLVED"]),
  ACKNOWLEDGED: new Set(["DEFERRED", "RESOLVED", "OPEN"]),
  DEFERRED: new Set(["OPEN", "RESOLVED"]),
  RESOLVED: new Set(["OPEN"]),
});
const NON_COMPARABLE_STATUSES = new Set(["UNKNOWN", "UNAVAILABLE", "ERROR"]);
const TRAJECTORY_FIELDS = Object.freeze([
  { field: "riskScore", label: "Risk score", kind: "number", unit: "points", direction: "higher-risk" },
  { field: "buyTax", label: "Buy tax", kind: "percent", unit: "%", direction: "higher-risk" },
  { field: "sellTax", label: "Sell tax", kind: "percent", unit: "%", direction: "higher-risk" },
  { field: "transferTax", label: "Transfer tax", kind: "percent", unit: "%", direction: "higher-risk" },
  { field: "liquidityUsd", label: "Liquidity", kind: "currency", unit: "USD", direction: "lower-risk" },
  { field: "holderConcentration", label: "Top-10 concentration", kind: "percent", unit: "%", direction: "higher-risk" },
  { field: "totalHolders", label: "Holder count", kind: "count", unit: "holders", direction: "lower-risk" },
  { field: "owner", label: "Owner address", kind: "address", unit: null, direction: "changed" },
  { field: "proxy", label: "Upgradeability", kind: "boolean", unit: null, direction: "changed" },
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function contractKey(workspaceId, networkId, address) {
  return `${workspaceId}:${networkId}:${String(address).toLowerCase()}`;
}

function publicContract(networkId, address) {
  return {
    networkId,
    address: String(address).toLowerCase(),
  };
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function valueOf(point) {
  if (!point || typeof point !== "object") return null;
  return point.value === undefined ? null : point.value;
}

function pointStatus(point) {
  return point?.status || point?.evidenceStatus || "UNKNOWN";
}

function comparableValue(point) {
  const value = valueOf(point);
  if (value === null || value === undefined || value === "" || NON_COMPARABLE_STATUSES.has(pointStatus(point))) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value;
}

function scalarChange(before, after) {
  if (before === after) return null;
  return { before: before ?? null, after: after ?? null };
}

function compactFinding(finding) {
  return {
    id: finding.id || finding.title || finding.finding || "finding",
    title: finding.title || finding.finding || "Finding",
    severity: finding.severity || "UNKNOWN",
    status: finding.status || "UNKNOWN",
    category: finding.category || "unknown",
    confidence: finding.confidence || null,
  };
}

function snapshotFromScan({ scan, jobId, capturedAt }) {
  const security = scan.security || {};
  const trading = scan.trading || {};
  const liquidity = scan.liquidity || {};
  const holders = scan.holders || {};
  const contract = scan.contract || {};
  const changePoints = {
    owner: contract.owner || contract.ownerAddress || security.ownerAddress || security.owner,
    proxy: contract.proxy || contract.isProxy || security.isUpgradeable || security.proxy,
    buyTax: trading.buyTax,
    sellTax: trading.sellTax,
    transferTax: trading.transferTax,
    liquidityUsd: liquidity.liquidityUsd || liquidity.usd,
    holderConcentration: holders.top10Percent || holders.top10Percentage || holders.top10,
    totalHolders: holders.totalHolders,
  };
  const changes = {
    ...Object.fromEntries(Object.entries(changePoints).map(([field, point]) => [field, comparableValue(point)])),
  };
  const findings = (scan.findings || []).map(compactFinding);
  const evidence = clone(scan.evidence || []);
  const consensus = clone(scan.consensus || scan.providerConsensus || null);
  const comparable = {
    riskScore: scan.risk?.finalScore ?? scan.riskScore ?? null,
    riskLevel: scan.risk?.level || null,
    reliabilityScore: scan.reliability?.score ?? scan.reliabilityScore ?? null,
    findings,
    evidence,
    changes,
    consensus,
  };
  return {
    id: id("snapshot"),
    jobId: jobId || scan.scanId || null,
    capturedAt: capturedAt || scan.timestamp || new Date().toISOString(),
    address: scan.contract?.address,
    networkId: scan.network?.id,
    engineVersion: scan.engineVersion || null,
    evidenceSchemaVersion: scan.evidenceSchemaVersion || scan.schemaVersion || null,
    dataStatus: scan.dataStatus || "unknown",
    risk: {
      score: comparable.riskScore,
      level: comparable.riskLevel,
      coverage: scan.risk?.coverage ?? scan.evidenceSummary?.coverage ?? null,
      categories: clone(scan.risk?.categories || {}),
    },
    reliabilityScore: comparable.reliabilityScore,
    findings,
    evidence,
    changes,
    changePoints: clone(Object.fromEntries(Object.entries(changePoints).map(([field, point]) => [
      field,
      point ? {
        value: valueOf(point),
        status: pointStatus(point),
        evidenceStatus: point.evidenceStatus || null,
      } : null,
    ]))),
    consensus,
    evidenceHash: hash(comparable),
    comparable,
  };
}

function snapshotFieldValue(snapshot, field) {
  if (!snapshot) return null;
  if (field === "riskScore") {
    return snapshot.risk?.score ?? snapshot.comparable?.riskScore ?? null;
  }
  if (field === "riskLevel") return snapshot.risk?.level ?? snapshot.comparable?.riskLevel ?? null;
  if (field === "reliabilityScore") return snapshot.reliabilityScore ?? snapshot.comparable?.reliabilityScore ?? null;
  const point = snapshot.changePoints?.[field];
  return point ? comparableValue(point) : snapshot.changes?.[field] ?? null;
}

function trajectoryDefinition(field) {
  return TRAJECTORY_FIELDS.find((item) => item.field === field) || {
    field,
    label: field,
    kind: "value",
    unit: null,
    direction: "changed",
  };
}

function trajectoryTone(definition, delta, changed) {
  if (!changed) return "neutral";
  if (!Number.isFinite(delta)) return "neutral";
  if (definition.direction === "higher-risk") return delta > 0 ? "negative" : delta < 0 ? "positive" : "neutral";
  if (definition.direction === "lower-risk") return delta < 0 ? "negative" : delta > 0 ? "positive" : "neutral";
  return "neutral";
}

function trajectoryChanges(before, after) {
  if (!before || !after) return [];
  return TRAJECTORY_FIELDS.flatMap((definition) => {
    const beforeValue = snapshotFieldValue(before, definition.field);
    const afterValue = snapshotFieldValue(after, definition.field);
    if (beforeValue === null || afterValue === null || beforeValue === undefined || afterValue === undefined) return [];
    const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
    if (!changed) return [];
    const numeric = typeof beforeValue === "number" && typeof afterValue === "number"
      && Number.isFinite(beforeValue) && Number.isFinite(afterValue);
    const delta = numeric ? Number((afterValue - beforeValue).toFixed(6)) : null;
    const relativeDelta = numeric && beforeValue !== 0
      ? Number((((afterValue - beforeValue) / Math.abs(beforeValue)) * 100).toFixed(2))
      : null;
    return [{
      field: definition.field,
      label: definition.label,
      kind: definition.kind,
      unit: definition.unit,
      before: beforeValue,
      after: afterValue,
      delta,
      relativeDelta,
      direction: delta === null ? "changed" : delta > 0 ? "increase" : delta < 0 ? "decrease" : "unchanged",
      tone: trajectoryTone(definition, delta, changed),
    }];
  });
}

function elapsedBetween(before, after) {
  const elapsedMs = Date.parse(after.capturedAt) - Date.parse(before.capturedAt);
  return {
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : null,
    elapsedHours: Number.isFinite(elapsedMs) && elapsedMs >= 0
      ? Number((elapsedMs / 3600000).toFixed(2))
      : null,
  };
}

function changedFields(before, after) {
  if (!before) return [];
  const changes = [];
  for (const field of ["riskScore", "riskLevel", "reliabilityScore"]) {
    const change = scalarChange(snapshotFieldValue(before, field), snapshotFieldValue(after, field));
    if (change) changes.push({ field, ...change });
  }
  for (const field of Object.keys(after.changePoints || after.changes || {})) {
    const beforeValue = snapshotFieldValue(before, field);
    const afterValue = snapshotFieldValue(after, field);
    if (beforeValue === null || afterValue === null || beforeValue === undefined || afterValue === undefined) continue;
    const change = scalarChange(beforeValue, afterValue);
    if (change) changes.push({ field, ...change });
  }
  if (hash(before.findings) !== hash(after.findings)) {
    changes.push({ field: "findings", before: before.findings, after: after.findings });
  }
  if (hash(before.consensus) !== hash(after.consensus)) {
    changes.push({ field: "providerConsensus", before: before.consensus, after: after.consensus });
  }
  return changes;
}

function validateAddress(address) {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function invalid(code, message) {
  throw Object.assign(new Error(message), { code });
}

class IntelligenceStore {
  constructor({ clock = () => new Date(), persistence = null } = {}) {
    this.clock = clock;
    this.persistence = persistence;
    this.persistChain = Promise.resolve();
    this.inFlightWatchChecks = new Set();
    this.passports = new Map();
    this.watchlists = new Map();
    this.alertRules = new Map();
    this.alertEvents = new Map();
    this.reports = new Map();
    this.comments = new Map();
    this.approvals = new Map();
    this.cases = new Map();
    this.policies = new Map();
    this.reviews = new Map();
    this.passportReviews = new Map();
    this.governance = new Map();
    this.deployerObservations = new Map();
    this.researcherProfiles = new Map();
    this.communityAnnotations = new Map();
    this.peerReviews = new Map();
    this.disputes = new Map();
    this.policies.set(DEFAULT_POLICY.id, complianceClone(DEFAULT_POLICY));
  }

  async init() {
    if (!this.persistence?.loadIntelligenceState) return;
    const state = await this.persistence.loadIntelligenceState();
    if (!state) return;
    for (const [key, value] of state.passports || []) this.passports.set(key, value);
    for (const [key, value] of state.watchlists || []) this.watchlists.set(key, value);
    for (const [key, value] of state.alertRules || []) this.alertRules.set(key, value);
    for (const [key, value] of state.alertEvents || []) this.alertEvents.set(key, value);
    for (const [key, value] of state.reports || []) this.reports.set(key, value);
    for (const [key, value] of state.comments || []) this.comments.set(key, value);
    for (const [key, value] of state.approvals || []) this.approvals.set(key, value);
    for (const [key, value] of state.cases || []) this.cases.set(key, value);
    for (const [key, value] of state.policies || []) this.policies.set(key, value);
    for (const [key, value] of state.reviews || []) this.reviews.set(key, value);
    for (const [key, value] of state.passportReviews || []) this.passportReviews.set(key, value);
    for (const [key, value] of state.governance || []) this.governance.set(key, value);
    for (const [key, value] of state.deployerObservations || []) this.deployerObservations.set(key, value);
    for (const [key, value] of state.researcherProfiles || []) this.researcherProfiles.set(key, value);
    for (const [key, value] of state.communityAnnotations || []) this.communityAnnotations.set(key, value);
    for (const [key, value] of state.peerReviews || []) this.peerReviews.set(key, value);
    for (const [key, value] of state.disputes || []) this.disputes.set(key, value);
    if (!this.policies.size) this.policies.set(DEFAULT_POLICY.id, complianceClone(DEFAULT_POLICY));
  }

  #persist() {
    if (!this.persistence?.saveIntelligenceState) return;
    const state = {
      passports: [...this.passports.entries()],
      watchlists: [...this.watchlists.entries()],
      alertRules: [...this.alertRules.entries()],
      alertEvents: [...this.alertEvents.entries()],
      reports: [...this.reports.entries()],
      comments: [...this.comments.entries()],
      approvals: [...this.approvals.entries()],
      cases: [...this.cases.entries()],
      policies: [...this.policies.entries()],
      reviews: [...this.reviews.entries()],
      passportReviews: [...this.passportReviews.entries()],
      governance: [...this.governance.entries()],
      deployerObservations: [...this.deployerObservations.entries()],
      researcherProfiles: [...this.researcherProfiles.entries()],
      communityAnnotations: [...this.communityAnnotations.entries()],
      peerReviews: [...this.peerReviews.entries()],
      disputes: [...this.disputes.entries()],
    };
    this.persistChain = this.persistChain
      .then(() => this.persistence.saveIntelligenceState(state))
      .catch((error) => console.error(`Intelligence persistence update failed: ${error.message}`));
  }

  #key(workspaceId, networkId, address) {
    return contractKey(workspaceId, networkId, address);
  }

  #passport(workspaceId, networkId, address) {
    return this.passports.get(this.#key(workspaceId, networkId, address)) || null;
  }

  recordSnapshot({ workspaceId, scan, jobId = null, capturedAt = this.clock().toISOString() }) {
    if (!workspaceId || !scan?.contract?.address || !scan?.network?.id) {
      invalid("SNAPSHOT_INVALID", "A completed contract scan is required.");
    }
    const key = this.#key(workspaceId, scan.network.id, scan.contract.address);
    const passport = this.passports.get(key) || {
      id: id("passport"),
      workspaceId,
      ...publicContract(scan.network.id, scan.contract.address),
      status: "CURRENT",
      snapshots: [],
      createdAt: capturedAt,
      updatedAt: capturedAt,
    };
    const snapshot = snapshotFromScan({ scan, jobId, capturedAt });
    const observation = extractDeployerObservation({ workspaceId, scan, jobId, capturedAt });
    if (observation) this.deployerObservations.set(`${workspaceId}:${observation.id}`, observation);
    const previous = passport.snapshots.at(-1) || null;
    if (previous?.evidenceHash === snapshot.evidenceHash) {
      passport.updatedAt = capturedAt;
      this.passports.set(key, passport);
      this.#persist();
      return { duplicate: true, passport: clone(passport), snapshot: clone(previous), timeline: null, alerts: [] };
    }
    const changes = changedFields(previous, snapshot);
    snapshot.changeSummary = changes;
    snapshot.trajectory = previous ? {
      status: "CHANGED",
      ...elapsedBetween(previous, snapshot),
      changes: trajectoryChanges(previous, snapshot),
    } : {
      status: "INITIAL",
      elapsedMs: null,
      elapsedHours: null,
      changes: [],
    };
    passport.snapshots.push(snapshot);
    passport.currentSnapshotId = snapshot.id;
    passport.status = "CURRENT";
    passport.updatedAt = capturedAt;
    this.passports.set(key, passport);
    const timeline = previous
      ? {
        id: id("timeline"),
        workspaceId,
        ...publicContract(scan.network.id, scan.contract.address),
        beforeSnapshotId: previous.id,
        afterSnapshotId: snapshot.id,
        changes,
        trajectory: snapshot.trajectory,
        why: this.#explainChanges(changes),
        createdAt: capturedAt,
        dedupeKey: `${key}:${snapshot.evidenceHash}`,
      }
      : null;
    if (timeline) {
      const alerts = this.#evaluateAlerts({ workspaceId, passport, previous, snapshot, timeline });
      this.#persist();
      return { duplicate: false, passport: clone(passport), snapshot: clone(snapshot), timeline: clone(timeline), alerts: clone(alerts) };
    }
    this.#persist();
    return { duplicate: false, passport: clone(passport), snapshot: clone(snapshot), timeline: null, alerts: [] };
  }

  #explainChanges(changes) {
    if (!changes.length) return "Evidence hash changed without a material field-level difference.";
    return changes.map((change) => {
      if (change.field === "riskScore") return `Risk score changed from ${change.before ?? "UNKNOWN"} to ${change.after ?? "UNKNOWN"}.`;
      if (change.field === "riskLevel") return `Risk level changed from ${change.before ?? "UNKNOWN"} to ${change.after ?? "UNKNOWN"}.`;
      if (change.field === "reliabilityScore") return `Reliability changed from ${change.before ?? "UNKNOWN"} to ${change.after ?? "UNKNOWN"}.`;
      return `${change.field} changed.`;
    }).join(" ");
  }

  #evaluateAlerts({ workspaceId, passport, previous, snapshot, timeline }) {
    const rules = [...this.alertRules.values()].filter((rule) =>
      rule.workspaceId === workspaceId
      && rule.networkId === passport.networkId
      && rule.address === passport.address
      && rule.enabled);
    const events = [];
    for (const rule of rules) {
      const riskDelta = Number(snapshot.risk.score) - Number(previous.risk.score);
      const changeField = {
        owner_change: "owner",
        privilege_change: "privilegedWallets",
        proxy_change: "proxy",
        tax_change: "sellTax",
        liquidity_change: "liquidityUsd",
        holder_concentration_change: "holderConcentration",
      }[rule.type];
      const triggered = rule.type === "risk_increase"
        ? Number.isFinite(riskDelta) && riskDelta >= rule.threshold
        : timeline.changes.some((change) => change.field === changeField
          || (rule.type === "provider_disagreement" && change.field === "providerConsensus"));
      if (!triggered) continue;
      const dedupeKey = `${rule.id}:${snapshot.evidenceHash}`;
      if (this.alertEvents.has(dedupeKey)) continue;
      const event = {
        id: id("alert"),
        workspaceId,
        ruleId: rule.id,
        type: rule.type,
        ...publicContract(passport.networkId, passport.address),
        snapshotId: snapshot.id,
        timelineId: timeline.id,
        status: "OPEN",
        deliveryStatus: "QUEUED",
        timeline: [{ type: "OPENED", at: snapshot.capturedAt, snapshotId: snapshot.id }],
        delivery: rule.delivery,
        createdAt: snapshot.capturedAt,
        dedupeKey,
        message: rule.type === "risk_increase"
          ? `Risk increased by ${riskDelta.toFixed(1)} points.`
          : `${rule.type.replaceAll("_", " ")} detected.`,
      };
      this.alertEvents.set(dedupeKey, event);
      events.push(event);
    }
    return events;
  }

  listPassports(workspaceId, { status = null } = {}) {
    return [...this.passports.values()]
      .filter((passport) => passport.workspaceId === workspaceId && (!status || passport.status === status))
      .map((passport) => this.publicPassport(passport));
  }

  getPassport(workspaceId, networkId, address) {
    const passport = this.#passport(workspaceId, networkId, address);
    return passport ? this.publicPassport(passport) : null;
  }

  publicPassport(passport) {
    const snapshot = passport.snapshots.at(-1) || null;
    return {
      id: passport.id,
      ...publicContract(passport.networkId, passport.address),
      status: passport.status,
      createdAt: passport.createdAt,
      updatedAt: passport.updatedAt,
      current: snapshot ? clone({
        id: snapshot.id,
        jobId: snapshot.jobId,
        capturedAt: snapshot.capturedAt,
        engineVersion: snapshot.engineVersion,
        evidenceSchemaVersion: snapshot.evidenceSchemaVersion,
        dataStatus: snapshot.dataStatus,
        risk: snapshot.risk,
        reliabilityScore: snapshot.reliabilityScore,
        findings: snapshot.findings,
        evidence: snapshot.evidence,
        changes: snapshot.changes,
        trajectory: snapshot.trajectory,
        consensus: snapshot.consensus,
        evidenceHash: snapshot.evidenceHash,
      }) : null,
      snapshotCount: passport.snapshots.length,
    };
  }

  #evidenceFamily(item) {
    const text = `${item?.family || ""} ${item?.category || ""} ${item?.type || ""} ${item?.evidenceType || ""} ${item?.id || ""}`.toLowerCase();
    if (text.includes("liquid")) return "liquidity";
    if (text.includes("market") || text.includes("price") || text.includes("volume")) return "market";
    if (text.includes("tax") || text.includes("trading") || text.includes("sell") || text.includes("buy")) return "trading";
    if (text.includes("holder") || text.includes("distribution")) return "holders";
    if (text.includes("owner") || text.includes("control") || text.includes("proxy") || text.includes("privilege")) return "control";
    if (text.includes("deployer") || text.includes("creator")) return "deployer";
    if (text.includes("contract") || text.includes("abi") || text.includes("bytecode") || text.includes("source")) return "contract";
    return "default";
  }

  getFreshness(workspaceId, networkId, address) {
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport?.snapshots.length) return null;
    const snapshot = passport.snapshots.at(-1);
    const now = this.clock().getTime();
    const items = (snapshot.evidence || []).map((item, index) => {
      const family = this.#evidenceFamily(item);
      const ttlHours = EVIDENCE_FRESHNESS_TTL_HOURS[family] || EVIDENCE_FRESHNESS_TTL_HOURS.default;
      const retrievedAt = item.retrievedAt || snapshot.capturedAt;
      const ageHours = Math.max(0, (now - Date.parse(retrievedAt)) / 3600000);
      const validDate = Number.isFinite(Date.parse(retrievedAt));
      const stale = validDate && ageHours > ttlHours;
      return {
        id: item.id || item.evidenceId || `evidence-${index + 1}`,
        family,
        status: item.status || item.evidenceStatus || "UNKNOWN",
        retrievedAt,
        ttlHours,
        ageHours: validDate ? Number(ageHours.toFixed(2)) : null,
        freshness: validDate ? (stale ? "STALE" : "FRESH") : "UNKNOWN",
        evidenceRef: item.evidenceId || item.id || null,
      };
    });
    const stale = items.filter((item) => item.freshness === "STALE");
    const known = items.filter((item) => item.freshness !== "UNKNOWN");
    const healthScore = known.length ? Math.max(0, Math.round(100 - (stale.length / known.length) * 100)) : null;
    const categories = snapshot.risk?.categories || {};
    const categoryValues = Object.values(categories);
    const unknownCategories = categoryValues.filter((category) => ["UNKNOWN", "UNAVAILABLE", "CONFLICT"].includes(String(category?.status || "").toUpperCase()) || Number(category?.coverage) === 0);
    const coverage = Number(snapshot.risk?.coverage);
    const uncertaintyBudget = Number.isFinite(coverage) ? Math.max(0, Math.min(100, 100 - coverage)) : (categoryValues.length ? Math.round((unknownCategories.length / categoryValues.length) * 100) : null);
    return {
      healthScore,
      uncertaintyBudget,
      staleCount: stale.length,
      evidenceCount: items.length,
      items,
      checkedAt: this.clock().toISOString(),
    };
  }

  #reviewDefinitions(passport, freshness) {
    const snapshot = passport.snapshots.at(-1);
    const items = [];
    const add = (rule, title, reason, evidenceRef, priority = "MEDIUM") => items.push({ rule, title, reason, evidenceRef: evidenceRef || null, priority });
    const owner = snapshot.changePoints?.owner;
    if (owner && ["DETECTED", "VERIFIED", "ACTIVE"].includes(String(owner.status || "").toUpperCase())) {
      add("owner_privileges", "Review owner privileges", "An active control address is present in the latest snapshot.", owner.evidenceId || owner.evidenceStatus || `snapshot:${snapshot.id}`, "HIGH");
    }
    const staleLiquidity = freshness?.items.find((item) => item.family === "liquidity" && item.freshness === "STALE");
    if (staleLiquidity) add("refresh_liquidity", "Refresh stale liquidity evidence", `Liquidity evidence is older than its ${staleLiquidity.ttlHours}-hour freshness window.`, staleLiquidity.evidenceRef, "HIGH");
    const holder = snapshot.changePoints?.holderConcentration;
    if (holder && holder.value !== null && holder.value !== undefined) {
      add("inspect_top_holder", "Inspect top-holder concentration", "Holder concentration is available and should be reviewed with current ownership context.", holder.evidenceId || holder.evidenceStatus, "MEDIUM");
    }
    if (snapshot.dataStatus === "partial" || snapshot.dataStatus === "unknown" || freshness?.uncertaintyBudget > 0) {
      const uncertaintyEvidence = (snapshot.evidence || []).find((item) =>
        !["VERIFIED", "VALID", "AVAILABLE"].includes(String(item.status || item.evidenceStatus || "").toUpperCase()),
      ) || snapshot.evidence?.[0];
      add("complete_evidence_history", "Complete the evidence review", "The latest snapshot contains incomplete or uncertain evidence; do not treat missing data as a safe result.", uncertaintyEvidence?.id || `snapshot:${snapshot.id}`, "HIGH");
    }
    if (snapshot.consensus?.status === "CONFLICT" || snapshot.consensus?.conflict) {
      add("resolve_provider_disagreement", "Resolve provider disagreement", "Provider evidence disagrees and requires independent verification before a decision.", null, "HIGH");
    }
    return items;
  }

  listPassportReviews(workspaceId, networkId, address) {
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport?.snapshots.length) return [];
    const freshness = this.getFreshness(workspaceId, networkId, address);
    const definitions = this.#reviewDefinitions(passport, freshness);
    const currentSnapshot = passport.snapshots.at(-1);
    let changed = false;
    return definitions.map((definition) => {
      const key = `${this.#key(workspaceId, networkId, address)}:${definition.rule}`;
      const existing = this.passportReviews.get(key);
      if (existing) {
        if (existing.snapshotId !== currentSnapshot.id) {
          const previousStatus = existing.status;
          Object.assign(existing, definition, {
            snapshotId: currentSnapshot.id,
            updatedAt: this.clock().toISOString(),
          });
          if (previousStatus !== "OPEN") existing.status = "OPEN";
          existing.timeline.push({
            type: "REFRESHED",
            at: existing.updatedAt,
            snapshotId: currentSnapshot.id,
            previousStatus,
          });
          this.passportReviews.set(key, existing);
          changed = true;
        }
        return clone(existing);
      }
      const item = {
        id: `passport_review_${hash(key).slice(0, 20)}`,
        workspaceId, ...publicContract(networkId, address),
        ...definition,
        status: "OPEN",
        snapshotId: passport.currentSnapshotId,
        createdAt: passport.snapshots.at(-1).capturedAt,
        updatedAt: this.clock().toISOString(),
        timeline: [{ type: "OPENED", at: this.clock().toISOString(), snapshotId: passport.currentSnapshotId }],
      };
      this.passportReviews.set(key, item);
      changed = true;
      return clone(item);
    }).sort((a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] ?? 3) - ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority] ?? 3));
    if (changed) this.#persist();
  }

  updatePassportReview({ workspaceId, networkId, address, reviewId, status, actorId }) {
    const reviews = this.listPassportReviews(workspaceId, networkId, address);
    const review = reviews.find((item) => item.id === reviewId);
    if (!review) return null;
    if (!PASSPORT_REVIEW_STATUSES.has(status)) invalid("INVALID_PASSPORT_REVIEW_STATUS", "Review status is invalid.");
    if (!REVIEW_TRANSITIONS[review.status]?.has(status)) invalid("INVALID_PASSPORT_REVIEW_TRANSITION", `Cannot move review from ${review.status} to ${status}.`);
    const key = `${this.#key(workspaceId, networkId, address)}:${review.rule}`;
    const stored = this.passportReviews.get(key);
    const now = this.clock().toISOString();
    stored.status = status;
    stored.updatedAt = now;
    stored.timeline.push({ type: status === "OPEN" ? "REOPENED" : status, actorId, at: now, snapshotId: stored.snapshotId });
    this.passportReviews.set(key, stored);
    this.#persist();
    return clone(stored);
  }

  createPassportAuditExport(workspaceId, networkId, address) {
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport?.snapshots.length) return null;
    const timeline = this.listTimeline(workspaceId, networkId, address);
    const freshness = this.getFreshness(workspaceId, networkId, address);
    const reviewQueue = this.listPassportReviews(workspaceId, networkId, address);
    const snapshots = passport.snapshots.map((snapshot) => ({
      id: snapshot.id, jobId: snapshot.jobId, capturedAt: snapshot.capturedAt,
      evidenceHash: snapshot.evidenceHash, risk: snapshot.risk, dataStatus: snapshot.dataStatus,
    }));
    const manifest = {
      format: "joben-risk-passport-audit-v1",
      networkId: passport.networkId,
      address: passport.address,
      generatedAt: this.clock().toISOString(),
      snapshotIds: snapshots.map((snapshot) => snapshot.id),
      evidenceHashes: snapshots.map((snapshot) => snapshot.evidenceHash),
    };
    return {
      manifest,
      verificationHash: hash({ manifest, snapshots, timeline, freshness, reviewQueue }),
      passport: this.publicPassport(passport),
      snapshots,
      timeline,
      freshness,
      reviewQueue,
    };
  }

  listTimeline(workspaceId, networkId, address) {
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport) return [];
    return passport.snapshots.map((snapshot, index) => {
      const previous = passport.snapshots[index - 1] || null;
      return {
        id: snapshot.id,
        ...publicContract(networkId, address),
        capturedAt: snapshot.capturedAt,
        risk: snapshot.risk,
        reliabilityScore: snapshot.reliabilityScore,
        engineVersion: snapshot.engineVersion,
        evidenceHash: snapshot.evidenceHash,
        before: previous ? {
          snapshotId: previous.id,
          capturedAt: previous.capturedAt,
          risk: previous.risk,
          reliabilityScore: previous.reliabilityScore,
        } : null,
        changes: snapshot.changeSummary || [],
        trajectory: snapshot.trajectory || {
          status: previous ? "UNCHANGED" : "INITIAL",
          elapsedMs: previous ? elapsedBetween(previous, snapshot).elapsedMs : null,
          elapsedHours: previous ? elapsedBetween(previous, snapshot).elapsedHours : null,
          changes: previous ? trajectoryChanges(previous, snapshot) : [],
        },
        why: previous ? this.#explainChanges(snapshot.changeSummary || []) : "Initial evidence snapshot.",
      };
    }).reverse();
  }

  createWatchlist({ workspaceId, actorId, networkId, address, label = "", intervalHours = 24 }) {
    if (!validateAddress(address)) invalid("INVALID_ADDRESS", "Enter a valid contract address.");
    if (!Number.isInteger(intervalHours) || !WATCH_INTERVALS.includes(intervalHours)) {
      invalid("INVALID_MONITOR_INTERVAL", "Monitoring interval is not supported.");
    }
    const key = this.#key(workspaceId, networkId, address);
    const existing = [...this.watchlists.values()].find((item) => item.workspaceId === workspaceId && item.networkId === networkId && item.address === address.toLowerCase());
    if (existing) return clone(existing);
    const item = {
      id: id("watch"),
      workspaceId,
      actorId,
      ...publicContract(networkId, address),
      label: String(label).slice(0, 120),
      intervalHours,
      status: "active",
      lastCheckedAt: null,
      nextCheckAt: this.clock().toISOString(),
      createdAt: this.clock().toISOString(),
    };
    this.watchlists.set(key, item);
    this.#persist();
    return clone(item);
  }

  listWatchlists(workspaceId) {
    return [...this.watchlists.values()].filter((item) => item.workspaceId === workspaceId).map(clone);
  }

  updateWatchlist(workspaceId, watchId, patch) {
    const item = [...this.watchlists.values()].find((candidate) => candidate.id === watchId && candidate.workspaceId === workspaceId);
    if (!item) return null;
    if (patch.intervalHours !== undefined) {
      if (!WATCH_INTERVALS.includes(Number(patch.intervalHours))) invalid("INVALID_MONITOR_INTERVAL", "Monitoring interval is not supported.");
      item.intervalHours = Number(patch.intervalHours);
    }
    if (patch.label !== undefined) item.label = String(patch.label).slice(0, 120);
    if (patch.status !== undefined) {
      if (!["active", "paused", "archived"].includes(patch.status)) invalid("INVALID_WATCHLIST_STATUS", "Watchlist status is invalid.");
      item.status = patch.status;
      if (item.status === "active" && !item.nextCheckAt) item.nextCheckAt = this.clock().toISOString();
    }
    if (patch.intervalHours !== undefined && item.status === "active") {
      item.nextCheckAt = new Date(this.clock().getTime() + item.intervalHours * 3600000).toISOString();
    }
    item.updatedAt = this.clock().toISOString();
    this.#persist();
    return clone(item);
  }

  deleteWatchlist(workspaceId, watchId) {
    const entry = [...this.watchlists.entries()].find(([, item]) => item.id === watchId && item.workspaceId === workspaceId);
    const deleted = entry ? this.watchlists.delete(entry[0]) : false;
    if (deleted) this.#persist();
    return deleted;
  }

  runMonitoringTick({ now = this.clock(), limit = 25, workspaceId = null, enqueue } = {}) {
    if (typeof enqueue !== "function") invalid("MONITOR_ENQUEUE_REQUIRED", "A monitoring enqueue callback is required.");
    const nowDate = new Date(now);
    const due = [...this.watchlists.values()]
      .filter((item) => (!workspaceId || item.workspaceId === workspaceId)
        && item.status === "active"
        && item.nextCheckAt
        && new Date(item.nextCheckAt).getTime() <= nowDate.getTime())
      .sort((a, b) => String(a.nextCheckAt).localeCompare(String(b.nextCheckAt)))
      .slice(0, Math.max(1, Number(limit) || 25));
    const results = [];
    for (const item of due) {
      const tickKey = `${item.id}:${item.nextCheckAt}`;
      if (this.inFlightWatchChecks.has(tickKey)) continue;
      this.inFlightWatchChecks.add(tickKey);
      item.lastCheckAt = nowDate.toISOString();
      item.nextCheckAt = new Date(nowDate.getTime() + item.intervalHours * 3600000).toISOString();
      item.lastRunKey = tickKey;
      try {
        const job = enqueue({
          workspaceId: item.workspaceId,
          actorId: item.actorId,
          networkId: item.networkId,
          address: item.address,
          watchlistId: item.id,
          monitorTickKey: tickKey,
        });
        item.lastJobId = job?.id || job?.jobId || null;
        item.lastRunStatus = "QUEUED";
        results.push({ watchlistId: item.id, tickKey, job: clone(job) });
      } catch (error) {
        item.lastRunStatus = "FAILED";
        item.lastRunError = error.code || error.message;
        results.push({ watchlistId: item.id, tickKey, error: { code: error.code || "MONITOR_ENQUEUE_FAILED", message: error.message } });
      } finally {
        this.inFlightWatchChecks.delete(tickKey);
      }
    }
    if (due.length) this.#persist();
    return { checkedAt: nowDate.toISOString(), processed: results.length, results };
  }

  recordMonitoringJobStatus(jobId, status, error = null) {
    const item = [...this.watchlists.values()].find((candidate) => candidate.lastJobId === jobId);
    if (!item) return null;
    item.lastRunStatus = status;
    if (error) item.lastRunError = error.code || error.message || "MONITOR_FAILED";
    item.lastRunCompletedAt = this.clock().toISOString();
    this.#persist();
    return clone(item);
  }

  createAlertRule({ workspaceId, actorId, networkId, address, type, threshold = 5, delivery = "in_app" }) {
    if (!ALERT_TYPES.includes(type)) invalid("INVALID_ALERT_TYPE", "Alert type is not supported.");
    if (!["in_app", "webhook", "email"].includes(delivery)) invalid("INVALID_ALERT_DELIVERY", "Alert delivery is not supported.");
    const normalizedThreshold = Number(threshold);
    if (type === "risk_increase" && (!Number.isFinite(normalizedThreshold) || normalizedThreshold <= 0 || normalizedThreshold > 100)) {
      invalid("INVALID_ALERT_THRESHOLD", "Risk threshold must be between 0 and 100.");
    }
    const rule = {
      id: id("rule"),
      workspaceId,
      actorId,
      ...publicContract(networkId, address),
      type,
      threshold: normalizedThreshold,
      delivery,
      enabled: true,
      createdAt: this.clock().toISOString(),
    };
    this.alertRules.set(rule.id, rule);
    this.#persist();
    return clone(rule);
  }

  listAlertRules(workspaceId) {
    return [...this.alertRules.values()].filter((rule) => rule.workspaceId === workspaceId).map(clone);
  }

  updateAlertRule(workspaceId, ruleId, patch) {
    const rule = this.alertRules.get(ruleId);
    if (!rule || rule.workspaceId !== workspaceId) return null;
    if (patch.enabled !== undefined) rule.enabled = Boolean(patch.enabled);
    if (patch.threshold !== undefined) {
      const threshold = Number(patch.threshold);
      if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) invalid("INVALID_ALERT_THRESHOLD", "Risk threshold must be between 0 and 100.");
      rule.threshold = threshold;
    }
    if (patch.delivery !== undefined) {
      if (!["in_app", "webhook", "email"].includes(patch.delivery)) invalid("INVALID_ALERT_DELIVERY", "Alert delivery is not supported.");
      rule.delivery = patch.delivery;
    }
    this.#persist();
    return clone(rule);
  }

  listAlerts(workspaceId, { status = null } = {}) {
    return [...this.alertEvents.values()]
      .filter((event) => event.workspaceId === workspaceId && (!status || event.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone);
  }

  acknowledgeAlert(workspaceId, alertId, actorId) {
    return this.transitionAlert({ workspaceId, alertId, status: "ACKNOWLEDGED", actorId });
  }

  transitionAlert({ workspaceId, alertId, status, actorId, reason = "", snoozedUntil = null }) {
    const event = [...this.alertEvents.values()].find((candidate) =>
      candidate.id === alertId && candidate.workspaceId === workspaceId);
    if (!event) return null;
    if (!ALERT_STATUSES.has(status)) invalid("INVALID_ALERT_STATUS", "Alert status is invalid.");
    if (!ALERT_TRANSITIONS[event.status]?.has(status)) {
      invalid("INVALID_ALERT_TRANSITION", `Cannot move alert from ${event.status} to ${status}.`);
    }
    if (status === "SNOOZED" && (!snoozedUntil || !Number.isFinite(Date.parse(snoozedUntil)) || Date.parse(snoozedUntil) <= this.clock().getTime())) {
      invalid("INVALID_ALERT_SNOOZE", "A future snooze time is required.");
    }
    const now = this.clock().toISOString();
    const previousStatus = event.status;
    event.status = status;
    event.updatedAt = now;
    if (status === "ACKNOWLEDGED") {
      event.acknowledgedAt = now;
      event.acknowledgedBy = actorId || null;
    }
    if (status === "SNOOZED") event.snoozedUntil = new Date(snoozedUntil).toISOString();
    if (status !== "SNOOZED") event.snoozedUntil = null;
    event.timeline = Array.isArray(event.timeline) ? event.timeline : [];
    event.timeline.push({ type: status === "OPEN" ? "REOPENED" : status, at: now, actorId: actorId || null, reason: String(reason).slice(0, 500) || null, previousStatus });
    this.#persist();
    return clone(event);
  }

  getGraph(workspaceId, networkId, address) {
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport) return null;
    const snapshot = passport.snapshots.at(-1);
    const nodes = [{ id: "contract", type: "contract", label: `${address.slice(0, 6)}...${address.slice(-4)}`, status: "valid" }];
    const edges = [];
    const addEvidenceNode = (type, point, relation) => {
      const value = valueOf(point);
      if (value === null || value === undefined || value === "") return;
      const nodeId = `${type}:${String(value)}`;
      if (!nodes.some((node) => node.id === nodeId)) nodes.push({ id: nodeId, type, label: String(value), status: pointStatus(point) });
      edges.push({ source: "contract", target: nodeId, relation, evidenceStatus: pointStatus(point) });
    };
    // changePoints preserve the evidence point status/value pair. The
    // flattened `changes` object is intentionally value-only for comparison.
    addEvidenceNode("owner", snapshot.changePoints?.owner, "owned_by");
    addEvidenceNode("proxy", snapshot.changePoints?.proxy, "delegates_to");
    addEvidenceNode("pair", snapshot.changePoints?.pair, "trades_on");
    addEvidenceNode("holder_cluster", snapshot.changePoints?.holderConcentration, "holder_concentration");
    return { networkId, address: address.toLowerCase(), snapshotId: snapshot.id, nodes, edges, generatedAt: snapshot.capturedAt };
  }

  compare(workspaceId, contracts) {
    if (!Array.isArray(contracts) || contracts.length < 2 || contracts.length > 5) invalid("INVALID_COMPARE_REQUEST", "Compare between two and five contracts.");
    return contracts.map((contract) => {
      const passport = this.#passport(workspaceId, contract.networkId, contract.address);
      const current = passport?.snapshots.at(-1);
      return {
        ...publicContract(contract.networkId, contract.address),
        found: Boolean(current),
        ...(current ? {
          risk: current.risk,
          reliabilityScore: current.reliabilityScore,
          findingCount: current.findings.length,
          evidenceHash: current.evidenceHash,
          capturedAt: current.capturedAt,
        } : {}),
      };
    });
  }

  upsertResearcherProfile({ workspaceId, actorId, displayName, bio = "", specialties = [] }) {
    if (!workspaceId || !actorId || !String(displayName || "").trim()) invalid("PROFILE_INVALID", "A researcher display name is required.");
    const key = `${workspaceId}:${actorId}`;
    const existing = this.researcherProfiles.get(key);
    const profile = existing || { id: id("researcher"), workspaceId, actorId, createdAt: this.clock().toISOString() };
    profile.displayName = String(displayName).trim().slice(0, 120);
    profile.bio = String(bio || "").trim().slice(0, 500);
    profile.specialties = [...new Set((Array.isArray(specialties) ? specialties : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
    profile.updatedAt = this.clock().toISOString();
    this.researcherProfiles.set(key, profile); this.#persist();
    return this.getResearcherProfile(workspaceId, actorId);
  }

  getResearcherProfile(workspaceId, actorId) {
    const profile = this.researcherProfiles.get(`${workspaceId}:${actorId}`);
    if (!profile) return null;
    const reputation = this.researcherReputation(workspaceId, actorId);
    return { ...clone(profile), reputation };
  }

  listResearcherProfiles(workspaceId) {
    return [...this.researcherProfiles.values()].filter((item) => item.workspaceId === workspaceId)
      .map((item) => this.getResearcherProfile(workspaceId, item.actorId));
  }

  createAnnotation({ workspaceId, actorId, networkId, address, title, body, evidenceRefs = [], tags = [] }) {
    if (!workspaceId || !actorId || !networkId || !validateAddress(address) || !String(title || "").trim() || !String(body || "").trim()) {
      invalid("ANNOTATION_INVALID", "Annotation requires a contract, title, and body.");
    }
    if (!Array.isArray(evidenceRefs) || evidenceRefs.length < 1 || evidenceRefs.length > 20 || evidenceRefs.some((ref) => typeof ref !== "string" || !ref.trim())) {
      invalid("EVIDENCE_REQUIRED", "An annotation must cite one to twenty evidence references.");
    }
    const annotation = {
      id: id("annotation"), workspaceId, actorId, ...publicContract(networkId, address),
      title: String(title).trim().slice(0, 160), body: String(body).trim().slice(0, 4000),
      evidenceRefs: [...new Set(evidenceRefs.map((ref) => ref.trim()))],
      tags: [...new Set((Array.isArray(tags) ? tags : []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 12),
      status: "PUBLISHED", moderation: "PENDING", createdAt: this.clock().toISOString(), history: [],
    };
    this.communityAnnotations.set(annotation.id, annotation); this.#persist();
    return clone(annotation);
  }

  listAnnotations(workspaceId, { networkId = null, address = null, status = "PUBLISHED" } = {}) {
    return [...this.communityAnnotations.values()].filter((item) =>
      item.workspaceId === workspaceId && (!networkId || item.networkId === networkId)
      && (!address || item.address === String(address).toLowerCase()) && (!status || item.status === status))
      .map((item) => ({ ...clone(item), peerReviews: this.listPeerReviews(workspaceId, item.id), reputation: this.researcherReputation(workspaceId, item.actorId) }));
  }

  reviewAnnotation({ workspaceId, actorId, annotationId, decision, rationale = "" }) {
    const annotation = this.communityAnnotations.get(annotationId);
    if (!annotation || annotation.workspaceId !== workspaceId) return null;
    if (annotation.actorId === actorId) invalid("SELF_REVIEW_FORBIDDEN", "Researchers cannot review their own annotation.");
    if (!["ACCEPT", "REJECT"].includes(decision)) invalid("PEER_DECISION_INVALID", "Peer decision must be ACCEPT or REJECT.");
    const duplicate = [...this.peerReviews.values()].find((item) => item.workspaceId === workspaceId && item.annotationId === annotationId && item.actorId === actorId);
    if (duplicate) invalid("PEER_REVIEW_DUPLICATE", "A researcher may review an annotation once.");
    const review = { id: id("peer_review"), workspaceId, annotationId, actorId, decision, rationale: String(rationale).trim().slice(0, 1000), createdAt: this.clock().toISOString() };
    this.peerReviews.set(review.id, review); this.#persist(); return clone(review);
  }

  listPeerReviews(workspaceId, annotationId) {
    return [...this.peerReviews.values()].filter((item) => item.workspaceId === workspaceId && item.annotationId === annotationId).map(clone);
  }

  createDispute({ workspaceId, actorId, annotationId, reason, evidenceRefs = [] }) {
    const annotation = this.communityAnnotations.get(annotationId);
    if (!annotation || annotation.workspaceId !== workspaceId) return null;
    if (annotation.actorId === actorId) invalid("SELF_DISPUTE_FORBIDDEN", "Researchers cannot dispute their own annotation.");
    if (!String(reason || "").trim() || !Array.isArray(evidenceRefs) || evidenceRefs.length < 1) invalid("DISPUTE_EVIDENCE_REQUIRED", "A dispute requires a reason and evidence reference.");
    const dispute = { id: id("dispute"), workspaceId, annotationId, actorId, reason: String(reason).trim().slice(0, 2000), evidenceRefs: [...new Set(evidenceRefs.map(String))], status: "OPEN", createdAt: this.clock().toISOString(), resolution: null };
    this.disputes.set(dispute.id, dispute); this.#persist(); return clone(dispute);
  }

  listDisputes(workspaceId, { status = null } = {}) {
    return [...this.disputes.values()]
      .filter((item) => item.workspaceId === workspaceId && (!status || item.status === status))
      .map((item) => ({ ...clone(item), annotation: clone(this.communityAnnotations.get(item.annotationId) || null) }));
  }

  moderateCommunity({ workspaceId, actorId, targetType, targetId, decision, rationale }) {
    if (!["annotation", "dispute"].includes(targetType) || !["APPROVE", "HIDE", "RESOLVE", "DISMISS"].includes(decision)) invalid("MODERATION_INVALID", "Moderation decision is invalid.");
    const collection = targetType === "annotation" ? this.communityAnnotations : this.disputes;
    const target = collection.get(targetId);
    if (!target || target.workspaceId !== workspaceId) return null;
    target.history.push({ actorId, decision, rationale: String(rationale || "").trim().slice(0, 1000), createdAt: this.clock().toISOString() });
    if (targetType === "annotation") { target.moderation = decision === "HIDE" ? "HIDDEN" : decision === "APPROVE" ? "APPROVED" : target.moderation; }
    else if (["RESOLVE", "DISMISS"].includes(decision)) { target.status = decision === "RESOLVE" ? "RESOLVED" : "DISMISSED"; target.resolution = target.history.at(-1); }
    this.#persist(); return clone(target);
  }

  researcherReputation(workspaceId, actorId) {
    const authored = [...this.communityAnnotations.values()].filter((item) => item.workspaceId === workspaceId && item.actorId === actorId);
    const reviews = [...this.peerReviews.values()].filter((item) => item.workspaceId === workspaceId && item.actorId === actorId);
    const disputes = [...this.disputes.values()].filter((item) => item.workspaceId === workspaceId && item.actorId === actorId);
    const accepted = authored.reduce((sum, item) => sum + this.listPeerReviews(workspaceId, item.id).filter((review) => review.decision === "ACCEPT").length, 0);
    const rejected = authored.reduce((sum, item) => sum + this.listPeerReviews(workspaceId, item.id).filter((review) => review.decision === "REJECT").length, 0);
    const qualityScore = Math.round(Math.max(0, Math.min(100, 50 + accepted * 10 - rejected * 12 + reviews.length * 2 - disputes.length * 3)));
    return { qualityScore, label: qualityScore >= 75 ? "HIGH_QUALITY" : qualityScore >= 50 ? "DEVELOPING" : "REVIEW_NEEDED", authoredAnnotations: authored.length, peerReviews: reviews.length, disputesRaised: disputes.length, basis: "Evidence citations, peer-review outcomes, and dispute activity; popularity is excluded." };
  }

  networkIntelligence(workspaceId, { networkId = null } = {}) {
    const observations = [...this.deployerObservations.values()].filter((item) => item.workspaceId === workspaceId && (!networkId || item.networkId === networkId));
    const clusters = [];
    const seen = new Set();
    for (const observation of observations) {
      const cluster = buildCluster({ observation, observations });
      if (!seen.has(cluster.id)) { seen.add(cluster.id); clusters.push(cluster); }
    }
    const repeatedBehavior = observations
      .filter((item) => item.suspicious)
      .reduce((map, item) => {
        const key = item.deployerAddress;
        const current = map.get(key) || { deployerAddress: key, status: "OBSERVED", observedCount: 0, suspiciousCount: 0, networks: new Set(), contracts: [] };
        current.observedCount += 1; current.suspiciousCount += 1; current.networks.add(item.networkId);
        current.contracts.push({ networkId: item.networkId, address: item.contractAddress, capturedAt: item.capturedAt });
        map.set(key, current); return map;
      }, new Map());
    return {
      generatedAt: this.clock().toISOString(),
      observations: observations.map((item) => ({ ...complianceClone(item), label: item.suspicious ? "OBSERVED" : "OBSERVED" })),
      clusters: clusters.map((cluster) => publicFingerprint(cluster, observations.find((item) => item.deployerAddress === cluster.deployerAddress))),
      repeatedBehavior: [...repeatedBehavior.values()].map((item) => ({ ...item, networks: [...item.networks].sort(), label: item.suspiciousCount >= 2 ? "INFERRED" : "OBSERVED" })),
      crossNetworkHypotheses: buildNetworkHypotheses(observations),
      labels: { OBSERVED: "Direct provider/scan observation", INFERRED: "Derived relationship that requires review", VERIFIED: "Independently confirmed by multiple evidence sources" },
    };
  }

  simulate(workspaceId, { networkId, address, adjustments = {} }) {
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport) return null;
    const current = passport.snapshots.at(-1);
    const base = Number(current.risk.score);
    const delta = Number(adjustments.riskDelta || 0);
    const score = Number.isFinite(base) ? Math.min(100, Math.max(0, base + delta)) : null;
    return {
      simulation: true,
      disclaimer: "Simulation only. This is not a prediction, guarantee, or financial advice.",
      ...publicContract(networkId, address),
      basedOnSnapshotId: current.id,
      basedOnCapturedAt: current.capturedAt,
      inputs: clone(adjustments),
      result: { riskScore: score, riskDelta: Number.isFinite(score) && Number.isFinite(base) ? score - base : null },
    };
  }

  createReport({ workspaceId, actorId, networkId, address, expiresAt, visibility = "private" }) {
    if (!VISIBILITIES.has(visibility)) invalid("INVALID_REPORT_VISIBILITY", "Report visibility is invalid.");
    const passport = this.#passport(workspaceId, networkId, address);
    if (!passport?.snapshots.length) invalid("PASSPORT_NOT_FOUND", "A completed passport is required.");
    const snapshot = passport.snapshots.at(-1);
    const report = {
      id: id("report"),
      workspaceId,
      actorId,
      ...publicContract(networkId, address),
      snapshotId: snapshot.id,
      engineVersion: snapshot.engineVersion,
      evidenceHash: snapshot.evidenceHash,
      issuedAt: this.clock().toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
      visibility,
      immutable: true,
      status: "VERIFIED",
    };
    this.reports.set(report.id, report);
    this.#persist();
    return clone(report);
  }

  listReports(workspaceId) {
    return [...this.reports.values()].filter((report) => report.workspaceId === workspaceId).map(clone);
  }

  getReport(reportId, workspaceId = null) {
    const report = this.reports.get(reportId);
    if (!report || (workspaceId && report.workspaceId !== workspaceId) || (!workspaceId && report.visibility !== "public")) return null;
    const passport = this.#passport(report.workspaceId, report.networkId, report.address);
    const current = passport?.snapshots.find((snapshot) => snapshot.id === report.snapshotId);
    const expired = new Date(report.expiresAt).getTime() <= this.clock().getTime();
    const outdated = !current || passport.currentSnapshotId !== report.snapshotId;
    return { ...clone(report), status: expired ? "EXPIRED" : outdated ? "OUTDATED" : "VERIFIED", snapshot: clone(current || null) };
  }

  updateReportVisibility(workspaceId, reportId, visibility) {
    const report = this.reports.get(reportId);
    if (!report || report.workspaceId !== workspaceId) return null;
    if (!VISIBILITIES.has(visibility)) invalid("INVALID_REPORT_VISIBILITY", "Report visibility is invalid.");
    report.visibility = visibility;
    this.#persist();
    return clone(report);
  }

  addComment({ workspaceId, actorId, networkId, address, findingId, body }) {
    if (!String(body || "").trim() || String(body).length > 2000) invalid("INVALID_COMMENT", "Comment must be between 1 and 2000 characters.");
    const comment = { id: id("comment"), workspaceId, actorId, ...publicContract(networkId, address), findingId: findingId || null, body: String(body).trim(), createdAt: this.clock().toISOString() };
    this.comments.set(comment.id, comment);
    this.#persist();
    return clone(comment);
  }

  createCase({ workspaceId, actorId, title, priority = "NORMAL", contracts = [] }) {
    if (!String(title || "").trim() || String(title).length > 160) invalid("INVALID_CASE", "Case title must be between 1 and 160 characters.");
    if (!["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) invalid("INVALID_CASE_PRIORITY", "Case priority is invalid.");
    if (!Array.isArray(contracts) || contracts.length < 1 || contracts.length > 20) invalid("INVALID_CASE_CONTRACTS", "A case must contain between 1 and 20 contracts.");
    const normalized = contracts.map((contract) => {
      if (!contract?.networkId || !validateAddress(contract.address)) invalid("INVALID_CASE_CONTRACT", "Each case contract needs a supported network and EVM address.");
      return publicContract(contract.networkId, contract.address);
    });
    const now = this.clock().toISOString();
    const item = {
      id: id("case"), workspaceId, title: String(title).trim(), priority, status: "OPEN",
      contracts: normalized, assigneeId: null, createdBy: actorId, createdAt: now, updatedAt: now,
      decision: null, reportIds: [], evidenceRequests: [], timeline: [{ id: id("case_event"), type: "CASE_CREATED", actorId, at: now, metadata: { title: String(title).trim() } }],
    };
    this.cases.set(item.id, item);
    this.#persist();
    return clone(item);
  }

  listCases(workspaceId, { status = null } = {}) {
    return [...this.cases.values()].filter((item) => item.workspaceId === workspaceId && (!status || item.status === status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(clone);
  }

  getCase(workspaceId, caseId) {
    const item = this.cases.get(caseId);
    return item && item.workspaceId === workspaceId ? clone(item) : null;
  }

  listPolicies(workspaceId) {
    return [...this.policies.values()].filter((policy) => !policy.workspaceId || policy.workspaceId === workspaceId)
      .sort((a, b) => String(a.name).localeCompare(String(b.name))).map(complianceClone);
  }

  createPolicy({ workspaceId, actorId, ...input }) {
    const policy = normalizePolicy(input);
    policy.workspaceId = workspaceId;
    policy.createdBy = actorId;
    policy.createdAt = this.clock().toISOString();
    this.policies.set(`${workspaceId}:${policy.id}`, policy);
    this.#persist();
    return complianceClone(policy);
  }

  getPolicy(workspaceId, policyId) {
    return complianceClone(this.policies.get(`${workspaceId}:${policyId}`) || this.policies.get(policyId) || null);
  }

  updatePolicy({ workspaceId, policyId, ...input }) {
    const existing = this.policies.get(`${workspaceId}:${policyId}`) || this.policies.get(policyId);
    if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) return null;
    if (existing.status === "ACTIVE") complianceInvalid("POLICY_VERSION_IMMUTABLE", "Active policies are immutable; create a new version.");
    const next = normalizePolicy({ ...existing, ...input }, { id: existing.id, version: existing.version });
    next.workspaceId = existing.workspaceId;
    this.policies.set(existing.workspaceId ? `${workspaceId}:${policyId}` : policyId, next);
    this.#persist();
    return complianceClone(next);
  }

  startCaseReview({ workspaceId, actorId, caseId, policyId = DEFAULT_POLICY.id, scan, manualResults = {} }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    const policy = this.getPolicy(workspaceId, policyId);
    if (!policy) complianceInvalid("POLICY_NOT_FOUND", "Policy not found.");
    const now = this.clock().toISOString();
    const evaluation = evaluatePolicy(policy, scan || {}, manualResults);
    const review = {
      id: complianceId("review"), workspaceId, caseId, policyId: policy.id, policyVersion: policy.version,
      reviewerId: actorId, status: "IN_REVIEW", outcome: null, evaluation, scanSnapshot: complianceClone(scan || null),
      approvals: [], evidenceRegister: (scan?.evidence || []).map((evidence, index) => ({
        id: evidence.id || `evidence-${index + 1}`, status: "RECORDED", source: evidence.source || evidence.provider || "provider",
        retrievedAt: evidence.retrievedAt || scan.timestamp || now, hash: evidence.hash || null,
      })), createdAt: now, updatedAt: now, expiresAt: null, decision: null,
    };
    this.reviews.set(review.id, review);
    item.status = "IN_REVIEW";
    item.updatedAt = now;
    item.timeline.push({ id: complianceId("case_event"), type: "COMPLIANCE_REVIEW_STARTED", actorId, at: now, metadata: { reviewId: review.id, policyId: policy.id, policyVersion: policy.version } });
    this.#persist();
    return complianceClone(review);
  }

  getCaseReview(workspaceId, caseId) {
    const review = [...this.reviews.values()].filter((item) => item.workspaceId === workspaceId && item.caseId === caseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!review) return null;
    if (review.expiresAt && new Date(review.expiresAt).getTime() <= this.clock().getTime() && review.status !== "EXPIRED") {
      review.status = "EXPIRED";
    }
    return complianceClone(review);
  }

  addReviewEvidence({ workspaceId, actorId, caseId, evidence }) {
    const review = [...this.reviews.values()].find((item) => item.workspaceId === workspaceId && item.caseId === caseId && item.status === "IN_REVIEW");
    if (!review || !evidence || !String(evidence.id || "").trim()) complianceInvalid("REVIEW_NOT_FOUND", "An active review and evidence id are required.");
    const record = { id: String(evidence.id).slice(0, 160), status: "RECORDED", source: String(evidence.source || "manual").slice(0, 160), retrievedAt: evidence.retrievedAt || this.clock().toISOString(), hash: evidence.hash || null, addedBy: actorId };
    review.evidenceRegister.push(record);
    review.updatedAt = this.clock().toISOString();
    this.#persist();
    return complianceClone(review);
  }

  approveCaseReview({ workspaceId, actorId, caseId, decision, rationale, conditions = [] }) {
    const review = [...this.reviews.values()].find((item) => item.workspaceId === workspaceId && item.caseId === caseId && item.status === "IN_REVIEW");
    if (!review) complianceInvalid("REVIEW_NOT_FOUND", "No active compliance review found.");
    if (!DECISIONS.includes(decision)) complianceInvalid("INVALID_APPROVAL_DECISION", "Decision must be APPROVE, CONDITIONAL, or REJECT.");
    if (!String(rationale || "").trim()) complianceInvalid("APPROVAL_RATIONALE_REQUIRED", "Approval rationale is required.");
    if (review.reviewerId === actorId) complianceInvalid("FOUR_EYES_REQUIRED", "The reviewer cannot approve their own review.");
    if (review.approvals.some((approval) => approval.actorId === actorId)) complianceInvalid("FOUR_EYES_REQUIRED", "A second independent approver is required.");
    const outcome = decisionOutcome(decision, review.evaluation);
    const now = this.clock().toISOString();
    review.approvals.push({ id: complianceId("approval"), actorId, decision, rationale: String(rationale).trim().slice(0, 4000), conditions: Array.isArray(conditions) ? conditions.map((v) => String(v).slice(0, 500)).slice(0, 20) : [], createdAt: now });
    review.decision = review.approvals.at(-1);
    review.outcome = outcome;
    review.status = outcome;
    review.expiresAt = outcome === "APPROVED" || outcome === "CONDITIONAL"
      ? new Date(this.clock().getTime() + (this.getPolicy(workspaceId, review.policyId)?.reviewValidityDays || 30) * 86400000).toISOString() : null;
    review.updatedAt = now;
    const item = this.cases.get(caseId);
    item.status = "DECIDED";
    item.decision = { decision: outcome, rationale: review.decision.rationale, decidedBy: actorId, decidedAt: now, reviewId: review.id };
    item.updatedAt = now;
    item.timeline.push({ id: complianceId("case_event"), type: "COMPLIANCE_APPROVED", actorId, at: now, metadata: { reviewId: review.id, outcome, expiresAt: review.expiresAt } });
    this.#persist();
    return complianceClone(review);
  }

  complianceReport(workspaceId, caseId) {
    const review = this.getCaseReview(workspaceId, caseId);
    return review ? { review, report: bilingualReport(review) } : null;
  }

  getGovernance(workspaceId) {
    return complianceClone(this.governance.get(workspaceId) || {
      workspaceId, requireFourEyes: true, allowedReviewerRoles: ["Workspace Owner", "Workspace Member"],
      allowedApproverRoles: ["Workspace Owner"], defaultPolicyId: DEFAULT_POLICY.id, retentionDays: 365,
    });
  }

  updateGovernance({ workspaceId, actorId, ...input }) {
    const current = this.getGovernance(workspaceId);
    const next = {
      ...current,
      requireFourEyes: input.requireFourEyes === undefined ? current.requireFourEyes : Boolean(input.requireFourEyes),
      allowedReviewerRoles: Array.isArray(input.allowedReviewerRoles) ? input.allowedReviewerRoles.slice(0, 10) : current.allowedReviewerRoles,
      allowedApproverRoles: Array.isArray(input.allowedApproverRoles) ? input.allowedApproverRoles.slice(0, 10) : current.allowedApproverRoles,
      defaultPolicyId: String(input.defaultPolicyId || current.defaultPolicyId),
      retentionDays: Number.isInteger(Number(input.retentionDays)) ? Math.min(3650, Math.max(30, Number(input.retentionDays))) : current.retentionDays,
      updatedBy: actorId, updatedAt: this.clock().toISOString(),
    };
    this.governance.set(workspaceId, next);
    this.#persist();
    return complianceClone(next);
  }

  updateCase({ workspaceId, actorId, caseId, status, assigneeId, priority }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    if (status !== undefined && !["OPEN", "IN_REVIEW", "DECIDED", "CLOSED"].includes(status)) invalid("INVALID_CASE_STATUS", "Case status is invalid.");
    if (priority !== undefined && !["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) invalid("INVALID_CASE_PRIORITY", "Case priority is invalid.");
    const changes = {};
    if (status !== undefined && status !== item.status) { item.status = status; changes.status = status; }
    if (priority !== undefined && priority !== item.priority) { item.priority = priority; changes.priority = priority; }
    if (assigneeId !== undefined && assigneeId !== item.assigneeId) { item.assigneeId = assigneeId || null; changes.assigneeId = item.assigneeId; }
    if (Object.keys(changes).length) {
      item.updatedAt = this.clock().toISOString();
      item.timeline.push({ id: id("case_event"), type: "CASE_UPDATED", actorId, at: item.updatedAt, metadata: changes });
      this.#persist();
    }
    return clone(item);
  }

  addCaseEvidenceRequest({ workspaceId, actorId, caseId, prompt, findingId = null }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    if (!String(prompt || "").trim() || String(prompt).length > 1000) invalid("INVALID_EVIDENCE_REQUEST", "Evidence request must be between 1 and 1000 characters.");
    const now = this.clock().toISOString();
    const request = { id: id("evidence_request"), prompt: String(prompt).trim(), findingId, status: "OPEN", requestedBy: actorId, createdAt: now, resolvedAt: null };
    item.evidenceRequests.push(request);
    item.updatedAt = now;
    item.timeline.push({ id: id("case_event"), type: "EVIDENCE_REQUESTED", actorId, at: now, metadata: { requestId: request.id, findingId } });
    this.#persist();
    return clone(item);
  }

  updateCaseEvidenceRequest({ workspaceId, actorId, caseId, requestId, status }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    if (!["OPEN", "FULFILLED", "CANCELLED"].includes(status)) invalid("INVALID_EVIDENCE_REQUEST_STATUS", "Evidence request status is invalid.");
    const request = item.evidenceRequests.find((candidate) => candidate.id === requestId);
    if (!request) return null;
    const now = this.clock().toISOString();
    request.status = status;
    request.resolvedAt = status === "OPEN" ? null : now;
    item.updatedAt = now;
    item.timeline.push({ id: id("case_event"), type: "EVIDENCE_REQUEST_UPDATED", actorId, at: now, metadata: { requestId, status } });
    this.#persist();
    return clone(item);
  }

  addCaseComment({ workspaceId, actorId, caseId, body }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    if (!String(body || "").trim() || String(body).length > 2000) invalid("INVALID_CASE_COMMENT", "Case comment must be between 1 and 2000 characters.");
    const now = this.clock().toISOString();
    item.updatedAt = now;
    item.timeline.push({ id: id("case_event"), type: "COMMENT_ADDED", actorId, at: now, metadata: { body: String(body).trim().slice(0, 2000) } });
    this.#persist();
    return clone(item);
  }

  decideCase({ workspaceId, actorId, caseId, decision, rationale }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    if (!["APPROVE", "REJECT", "HOLD"].includes(decision) || !String(rationale || "").trim()) invalid("INVALID_CASE_DECISION", "Decision and rationale are required.");
    const now = this.clock().toISOString();
    item.decision = { decision, rationale: String(rationale).trim().slice(0, 4000), decidedBy: actorId, decidedAt: now };
    item.status = "DECIDED";
    item.updatedAt = now;
    item.timeline.push({ id: id("case_event"), type: "DECISION_RECORDED", actorId, at: now, metadata: { decision } });
    this.#persist();
    return clone(item);
  }

  generateCaseReports({ workspaceId, actorId, caseId }) {
    const item = this.cases.get(caseId);
    if (!item || item.workspaceId !== workspaceId) return null;
    const reports = item.contracts.map((contract) => this.createReport({
      workspaceId, actorId, networkId: contract.networkId, address: contract.address, visibility: "private",
    }));
    const now = this.clock().toISOString();
    item.reportIds.push(...reports.map((report) => report.id));
    item.updatedAt = now;
    item.timeline.push({ id: id("case_event"), type: "REPORT_GENERATED", actorId, at: now, metadata: { reportIds: reports.map((report) => report.id) } });
    this.#persist();
    return { case: clone(item), reports };
  }

  listComments(workspaceId, networkId, address) {
    return [...this.comments.values()].filter((comment) => comment.workspaceId === workspaceId && comment.networkId === networkId && comment.address === address.toLowerCase()).map(clone);
  }

  updateFindingStatus({ workspaceId, findingId, status, assigneeId = null }) {
    if (!FINDING_STATUSES.has(status)) invalid("INVALID_FINDING_STATUS", "Finding status is invalid.");
    const passports = [...this.passports.values()].filter((passport) => passport.workspaceId === workspaceId);
    for (const passport of passports) {
      const snapshot = passport.snapshots.at(-1);
      const finding = snapshot?.findings.find((item) => item.id === findingId);
      if (finding) {
        finding.status = status;
        finding.assigneeId = assigneeId;
        this.#persist();
        return clone(finding);
      }
    }
    return null;
  }
}

module.exports = {
  ALERT_TYPES,
  FINDING_STATUSES,
  IntelligenceStore,
  WATCH_INTERVALS,
  snapshotFromScan,
};