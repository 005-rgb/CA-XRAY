const test = require("node:test");
const assert = require("node:assert/strict");
const { IntelligenceStore } = require("../src/intelligence/store");

const deployer = "0x1111111111111111111111111111111111111111";
const funder = "0x2222222222222222222222222222222222222222";
const contract = (value) => `0x${value.repeat(40)}`;

function scan(networkId, address, suspicious = true) {
  return {
    timestamp: "2026-08-25T00:00:00.000Z",
    network: { id: networkId },
    contract: { address },
    deployer: {
      address: { value: deployer, status: "VERIFIED" },
      fundingSource: { value: funder, status: "VERIFIED" },
      suspiciousBehavior: { value: suspicious, status: "VERIFIED" },
      fundingTransactions: { items: [{ from: funder, to: deployer }] },
    },
    risk: { finalScore: suspicious ? 80 : 20 },
    evidence: [{ id: `${networkId}-${address}`, status: "VERIFIED" }],
  };
}

test("Phase 7 builds funding clusters and marks cross-network reuse as inference", () => {
  const store = new IntelligenceStore();
  store.recordSnapshot({ workspaceId: "workspace-a", scan: scan("ethereum", contract("a")), capturedAt: "2026-08-25T00:00:00.000Z" });
  store.recordSnapshot({ workspaceId: "workspace-a", scan: scan("base", contract("b")), capturedAt: "2026-08-25T00:01:00.000Z" });
  store.recordSnapshot({ workspaceId: "workspace-b", scan: scan("base", contract("c")), capturedAt: "2026-08-25T00:02:00.000Z" });
  const result = store.networkIntelligence("workspace-a");
  assert.equal(result.observations.length, 2);
  assert.ok(result.clusters.some((item) => item.observedTokenCount === 1 && item.status === "KNOWN_SUSPICIOUS"));
  assert.equal(result.crossNetworkHypotheses.length, 1);
  assert.equal(result.crossNetworkHypotheses[0].status, "INFERRED");
  assert.match(result.crossNetworkHypotheses[0].limitation, /not proof/i);
  assert.equal(store.networkIntelligence("workspace-b").observations.length, 1);
});

test("Phase 7 does not create deployer observations from missing deployer evidence", () => {
  const store = new IntelligenceStore();
  const value = scan("ethereum", contract("d")).deployer;
  delete value.address;
  store.recordSnapshot({ workspaceId: "workspace-a", scan: { ...scan("ethereum", contract("d")), deployer: value } });
  assert.deepEqual(store.networkIntelligence("workspace-a").observations, []);
});