const crypto = require("node:crypto");

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
        status: "QUEUED",
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
      if (!["active", "paused"].includes(patch.status)) invalid("INVALID_WATCHLIST_STATUS", "Watchlist status is invalid.");
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
    const event = [...this.alertEvents.values()].find((candidate) =>
      candidate.id === alertId && candidate.workspaceId === workspaceId);
    if (!event) return null;
    if (event.status !== "ACKNOWLEDGED") {
      event.status = "ACKNOWLEDGED";
      event.acknowledgedAt = this.clock().toISOString();
      event.acknowledgedBy = actorId || null;
      this.#persist();
    }
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
    addEvidenceNode("owner", snapshot.changes.owner, "owned_by");
    addEvidenceNode("proxy", snapshot.changes.proxy, "delegates_to");
    addEvidenceNode("pair", snapshot.changes.pair, "trades_on");
    addEvidenceNode("holder_cluster", snapshot.changes.holderConcentration, "holder_concentration");
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