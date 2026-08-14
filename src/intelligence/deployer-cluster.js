const crypto = require("node:crypto");

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function valueOf(point) {
  if (point && typeof point === "object" && Object.prototype.hasOwnProperty.call(point, "value")) {
    return point.value;
  }
  return point ?? null;
}

function address(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(normalized) ? normalized : null;
}

function fingerprintKey(workspaceId, networkId, deployerAddress) {
  return `${workspaceId}:${networkId}:${deployerAddress}`;
}

function clusterId(workspaceId, networkId, members) {
  return crypto.createHash("sha256")
    .update(`${workspaceId}:${networkId}:${[...members].sort().join(",")}`)
    .digest("hex")
    .slice(0, 24);
}

function transactionWallets(deployer) {
  const transactions = deployer?.fundingTransactions?.items;
  return Array.isArray(transactions)
    ? transactions.flatMap((transaction) => [address(transaction.from), address(transaction.to)]).filter(Boolean)
    : [];
}

function suspiciousSignals(scan) {
  const deployer = scan?.deployer || {};
  const risk = Number(scan?.risk?.finalScore ?? scan?.riskScore);
  return {
    suspiciousBehavior: valueOf(deployer.suspiciousBehavior) === true,
    maliciousAssociation: valueOf(deployer.maliciousAssociation) === true,
    highRiskReport: Number.isFinite(risk) && risk >= 65,
  };
}

function extractDeployerObservation({ workspaceId, scan, jobId = null, capturedAt = null }) {
  const deployer = scan?.deployer || {};
  const deployerAddress = address(valueOf(deployer.address));
  if (!workspaceId || !scan?.network?.id || !scan?.contract?.address || !deployerAddress) return null;
  const fundingSource = address(valueOf(deployer.fundingSource));
  const signals = suspiciousSignals(scan);
  return {
    id: `deployer_observation_${crypto.randomUUID()}`,
    workspaceId,
    networkId: scan.network.id,
    contractAddress: String(scan.contract.address).toLowerCase(),
    deployerAddress,
    fundingSource,
    fundingTransactions: clone(deployer.fundingTransactions?.items || []),
    signals,
    suspicious: Object.values(signals).some(Boolean),
    jobId,
    capturedAt: capturedAt || scan.timestamp || new Date().toISOString(),
  };
}

function buildCluster({ observation, observations }) {
  const relevant = observations.filter((item) =>
    item.workspaceId === observation.workspaceId && item.networkId === observation.networkId);
  const graph = new Map();
  const connect = (left, right) => {
    if (!left || !right) return;
    if (!graph.has(left)) graph.set(left, new Set([left]));
    if (!graph.has(right)) graph.set(right, new Set([right]));
    const merged = new Set([...graph.get(left), ...graph.get(right)]);
    for (const member of merged) graph.set(member, merged);
  };
  for (const item of relevant) {
    connect(item.deployerAddress, item.fundingSource);
    for (const wallet of transactionWallets(item)) connect(item.deployerAddress, wallet);
  }
  const members = graph.get(observation.deployerAddress) || new Set([observation.deployerAddress]);
  const relatedObservations = relevant.filter((item) =>
    members.has(item.deployerAddress) || (item.fundingSource && members.has(item.fundingSource)));
  const tokenAddresses = [...new Set(relatedObservations.map((item) => item.contractAddress))];
  const suspiciousObservationCount = relatedObservations.filter((item) => item.suspicious).length;
  const knownSuspicious = suspiciousObservationCount > 0;
  const repeatedSuspicious = suspiciousObservationCount >= 2;
  const confidence = relatedObservations.length >= 3 && repeatedSuspicious
    ? "HIGH"
    : relatedObservations.length >= 2
      ? "MEDIUM"
      : "LOW";
  const id = clusterId(observation.workspaceId, observation.networkId, members);
  return {
    id: `cluster_${id}`,
    networkId: observation.networkId,
    deployerAddress: observation.deployerAddress,
    fundingSources: [...new Set(relatedObservations.map((item) => item.fundingSource).filter(Boolean))],
    members: [...members].sort(),
    tokenAddresses,
    observedTokenCount: tokenAddresses.length,
    observationCount: relatedObservations.length,
    suspiciousObservationCount,
    knownSuspicious,
    repeatedSuspicious,
    confidence,
    basis: [
      "shared funding source or funding transaction relationship",
      "CA X-RAY scan history within this workspace",
    ],
    lastObservedAt: relatedObservations
      .map((item) => item.capturedAt)
      .sort()
      .at(-1) || observation.capturedAt,
  };
}

function publicFingerprint(cluster, observation) {
  if (!cluster) return null;
  return {
    clusterId: cluster.id,
    status: cluster.knownSuspicious ? "KNOWN_SUSPICIOUS" : "OBSERVED",
    confidence: cluster.confidence,
    deployerAddress: observation.deployerAddress,
    fundingSource: observation.fundingSource,
    fundingSources: cluster.fundingSources,
    relatedWalletCount: Math.max(0, cluster.members.length - 1),
    observedTokenCount: cluster.observedTokenCount,
    observationCount: cluster.observationCount,
    suspiciousObservationCount: cluster.suspiciousObservationCount,
    repeatedSuspicious: cluster.repeatedSuspicious,
    basis: cluster.basis,
    lastObservedAt: cluster.lastObservedAt,
  };
}

module.exports = {
  address,
  buildCluster,
  extractDeployerObservation,
  fingerprintKey,
  publicFingerprint,
};