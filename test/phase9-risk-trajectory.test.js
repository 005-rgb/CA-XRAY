const test = require("node:test");
const assert = require("node:assert/strict");
const { IntelligenceStore } = require("../src/intelligence/store");

const ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function evidencePoint(value, status = "VERIFIED") {
  return { value, status, evidenceStatus: status === "VERIFIED" ? "valid" : "unknown" };
}

function scan({
  timestamp,
  sellTax = 5,
  liquidityUsd = 100000,
  buyTax = 2,
  holderConcentration = 22,
  totalHolders = 1000,
  owner = "0x1111111111111111111111111111111111111111",
  upgradeable = false,
  riskScore = 35,
  evidenceId = timestamp,
} = {}) {
  return {
    mode: "LIVE",
    timestamp,
    scanId: `live-${evidenceId}`,
    engineVersion: "2.0.0",
    schemaVersion: "1.0.0",
    dataStatus: "valid",
    network: { id: "ethereum", name: "Ethereum" },
    contract: { address: ADDRESS },
    security: {
      ownerAddress: evidencePoint(owner),
      isUpgradeable: evidencePoint(upgradeable),
    },
    trading: {
      buyTax: evidencePoint(buyTax),
      sellTax: evidencePoint(sellTax),
      transferTax: evidencePoint(0),
    },
    liquidity: { liquidityUsd: evidencePoint(liquidityUsd) },
    holders: {
      totalHolders: evidencePoint(totalHolders),
      top10Percent: evidencePoint(holderConcentration),
    },
    risk: { finalScore: riskScore, level: riskScore >= 61 ? "HIGH" : "LOW" },
    reliability: { score: 82 },
    findings: [],
    evidence: [{ id: evidenceId, status: "VERIFIED" }],
  };
}

test("risk trajectory reports tax and liquidity deltas with elapsed time", () => {
  const store = new IntelligenceStore();
  const first = store.recordSnapshot({
    workspaceId: "workspace-a",
    scan: scan({ timestamp: "2026-08-14T08:00:00.000Z", evidenceId: "first" }),
    jobId: "scan-first",
    capturedAt: "2026-08-14T08:00:00.000Z",
  });
  assert.equal(first.snapshot.trajectory.status, "INITIAL");

  const second = store.recordSnapshot({
    workspaceId: "workspace-a",
    scan: scan({
      timestamp: "2026-08-14T10:00:00.000Z",
      sellTax: 99,
      liquidityUsd: 60000,
      evidenceId: "second",
    }),
    jobId: "scan-second",
    capturedAt: "2026-08-14T10:00:00.000Z",
  });

  assert.equal(second.timeline.trajectory.elapsedHours, 2);
  const sellTax = second.timeline.trajectory.changes.find((change) => change.field === "sellTax");
  assert.deepEqual(
    { before: sellTax.before, after: sellTax.after, delta: sellTax.delta, relativeDelta: sellTax.relativeDelta, tone: sellTax.tone },
    { before: 5, after: 99, delta: 94, relativeDelta: 1880, tone: "negative" },
  );
  const liquidity = second.timeline.trajectory.changes.find((change) => change.field === "liquidityUsd");
  assert.deepEqual(
    { before: liquidity.before, after: liquidity.after, delta: liquidity.delta, relativeDelta: liquidity.relativeDelta, tone: liquidity.tone },
    { before: 100000, after: 60000, delta: -40000, relativeDelta: -40, tone: "negative" },
  );
});

test("unknown evidence is excluded from risk trajectory deltas", () => {
  const store = new IntelligenceStore();
  store.recordSnapshot({
    workspaceId: "workspace-a",
    scan: scan({ timestamp: "2026-08-14T08:00:00.000Z", evidenceId: "first" }),
    capturedAt: "2026-08-14T08:00:00.000Z",
  });
  const secondScan = scan({
    timestamp: "2026-08-14T09:00:00.000Z",
    sellTax: null,
    liquidityUsd: null,
    evidenceId: "second-unknown",
  });
  secondScan.trading.sellTax = evidencePoint(null, "UNKNOWN");
  secondScan.liquidity.liquidityUsd = evidencePoint(null, "UNAVAILABLE");
  const result = store.recordSnapshot({
    workspaceId: "workspace-a",
    scan: secondScan,
    capturedAt: "2026-08-14T09:00:00.000Z",
  });

  assert.equal(result.timeline.trajectory.changes.some((change) => change.field === "sellTax"), false);
  assert.equal(result.timeline.trajectory.changes.some((change) => change.field === "liquidityUsd"), false);
});