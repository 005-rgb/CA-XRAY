const crypto = require("node:crypto");
const { isComparableEvidenceStatus } = require("../contracts/trust");

const MATERIALITY = Object.freeze(["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const FIELD_REGISTRY = Object.freeze({
  riskScore: { unit: "points", kind: "number", absolute: 5, relative: 10, direction: "higher-risk", explanationKey: "pulse.riskScore.changed" },
  owner: { unit: null, kind: "address", direction: "changed", explanationKey: "pulse.owner.changed" },
  privilege: { unit: null, kind: "boolean", direction: "changed", explanationKey: "pulse.privilege.changed" },
  proxy: { unit: null, kind: "boolean", direction: "changed", explanationKey: "pulse.proxy.changed" },
  buyTax: { unit: "%", kind: "percent", absolute: 1, relative: 20, direction: "higher-risk", explanationKey: "pulse.buyTax.changed" },
  sellTax: { unit: "%", kind: "percent", absolute: 1, relative: 20, direction: "higher-risk", explanationKey: "pulse.sellTax.changed" },
  transferTax: { unit: "%", kind: "percent", absolute: 1, relative: 20, direction: "higher-risk", explanationKey: "pulse.transferTax.changed" },
  liquidityUsd: { unit: "USD", kind: "currency", absolute: 1000, relative: 20, direction: "lower-risk", explanationKey: "pulse.liquidity.changed" },
  holderConcentration: { unit: "%", kind: "percent", absolute: 2, relative: 10, direction: "higher-risk", explanationKey: "pulse.holderConcentration.changed" },
  providerDisagreement: { unit: null, kind: "status", direction: "changed", explanationKey: "pulse.providerDisagreement.changed" },
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function unwrap(point) {
  if (point && typeof point === "object" && Object.prototype.hasOwnProperty.call(point, "value")) return point.value;
  return point ?? null;
}

function status(point) {
  if (point === null || point === undefined) return "UNKNOWN";
  if (typeof point !== "object") return "VERIFIED";
  return String(point?.status || point?.evidenceStatus || "UNKNOWN").toUpperCase();
}

function point(snapshot, field) {
  if (field === "riskScore") return snapshot?.risk?.score ?? snapshot?.riskScore ?? null;
  if (field === "providerDisagreement") return snapshot?.consensus || snapshot?.providerConsensus || null;
  return snapshot?.changePoints?.[field] ?? snapshot?.changes?.[field] ?? null;
}

function evidenceRefs(snapshot, field) {
  const item = point(snapshot, field);
  const refs = [];
  if (item?.evidenceId) refs.push(item.evidenceId);
  if (item?.evidenceRef) refs.push(item.evidenceRef);
  for (const evidence of snapshot?.evidence || []) {
    const text = JSON.stringify(evidence).toLowerCase();
    if (text.includes(field.toLowerCase()) && (evidence.id || evidence.evidenceId)) refs.push(evidence.id || evidence.evidenceId);
  }
  return [...new Set(refs)];
}

function materialityFor({ field, delta, relativeDelta, changed, comparable }) {
  if (!changed || !comparable) return "NONE";
  const definition = FIELD_REGISTRY[field] || {};
  if (field === "providerDisagreement") return "NONE";
  if (definition.kind !== "number") return "MEDIUM";
  const absolute = Math.abs(delta);
  const relative = Math.abs(relativeDelta ?? 0);
  if ((definition.absolute && absolute >= definition.absolute * 4) || (definition.relative && relative >= definition.relative * 4)) return "CRITICAL";
  if ((definition.absolute && absolute >= definition.absolute * 2) || (definition.relative && relative >= definition.relative * 2)) return "HIGH";
  if ((definition.absolute && absolute >= definition.absolute) || (definition.relative && relative >= definition.relative)) return "MEDIUM";
  return "LOW";
}

function compareSnapshots(before, after, { minimumConfidence = 0, minimumFreshness = null } = {}) {
  if (!after) throw Object.assign(new Error("AFTER_SNAPSHOT_REQUIRED"), { code: "AFTER_SNAPSHOT_REQUIRED" });
  const fields = Object.keys(FIELD_REGISTRY);
  const changes = [];
  for (const field of fields) {
    const beforePoint = point(before, field);
    const afterPoint = point(after, field);
    const beforeStatus = status(beforePoint);
    const afterStatus = status(afterPoint);
    const beforeValue = unwrap(beforePoint);
    const afterValue = unwrap(afterPoint);
    const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue)
      || beforeStatus !== afterStatus;
    if (!changed) continue;
    const comparable = before && after && isComparableEvidenceStatus(beforeStatus) && isComparableEvidenceStatus(afterStatus)
      && beforeValue !== null && afterValue !== null && beforeValue !== undefined && afterValue !== undefined;
    const numeric = comparable && typeof beforeValue === "number" && typeof afterValue === "number"
      && Number.isFinite(beforeValue) && Number.isFinite(afterValue);
    const delta = numeric ? Number((afterValue - beforeValue).toFixed(6)) : null;
    const relativeDelta = numeric && beforeValue !== 0 ? Number((((afterValue - beforeValue) / Math.abs(beforeValue)) * 100).toFixed(2)) : null;
    const confidence = afterPoint?.confidence ?? after?.confidence ?? null;
    const reliability = afterPoint?.reliability ?? after?.reliabilityScore ?? null;
    const freshness = afterPoint?.freshness ?? null;
    const confidenceNumber = typeof confidence === "number" ? confidence : ({ HIGH: 90, MEDIUM: 65, LOW: 35 }[String(confidence).toUpperCase()] || null);
    const belowQuality = (confidenceNumber !== null && confidenceNumber < minimumConfidence) || (minimumFreshness && freshness && freshness !== minimumFreshness);
    const materiality = belowQuality ? "NONE" : materialityFor({ field, delta, relativeDelta, changed, comparable });
    changes.push({
      field, unit: FIELD_REGISTRY[field].unit, kind: FIELD_REGISTRY[field].kind,
      before: clone(beforeValue), after: clone(afterValue), beforeStatus, afterStatus,
      delta, relativeDelta, direction: numeric ? (delta > 0 ? "increase" : delta < 0 ? "decrease" : "unchanged") : "changed",
      comparability: comparable ? "COMPARABLE" : "NOT_COMPARABLE",
      materiality, confidence, reliability, freshness, evidenceRefs: evidenceRefs(after, field),
      explanationKey: FIELD_REGISTRY[field].explanationKey,
      reason: comparable ? (belowQuality ? "MINIMUM_DATA_QUALITY_NOT_MET" : null) : "EVIDENCE_STATUS_NOT_COMPARABLE",
    });
  }
  const material = changes.filter((change) => change.materiality !== "NONE");
  const overallMateriality = material.length
    ? MATERIALITY[Math.max(...material.map((item) => MATERIALITY.indexOf(item.materiality)))]
    : "NONE";
  const result = {
    version: "watchtower-pulse-v1", beforeSnapshotId: before?.id || null, afterSnapshotId: after.id || null,
    changes, overallMateriality, materialChange: material.length > 0,
    evidenceHash: after.evidenceHash || null, generatedAt: after.capturedAt || null,
  };
  return { ...result, changeHash: stableHash(result) };
}

module.exports = { FIELD_REGISTRY, MATERIALITY, compareSnapshots, stableHash };