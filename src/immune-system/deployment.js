const { NETWORK_PROFILES } = require("./phase0");
const { normalizeAddress, normalizeChainId } = require("./intent");

const DEPLOYMENT_ENVIRONMENTS = new Set(["testnet", "mainnet"]);

function deploymentError(code, message) {
  return Object.assign(new Error(message || code), { code });
}

function validateDeploymentConfig({
  networkId,
  chainId,
  environment,
  registryAddress = null,
  gateAddress = null,
  rpcUrl = null,
  deployerAddress = null,
  deploymentMetadata = null,
} = {}) {
  const profile = NETWORK_PROFILES[networkId];
  if (!profile) throw deploymentError("DEPLOYMENT_NETWORK_NOT_ALLOWED", "The selected network is not an approved Arbitrum profile.");
  if (normalizeChainId(chainId) !== profile.chainId) throw deploymentError("DEPLOYMENT_CHAIN_MISMATCH", "Deployment chain ID does not match the selected network.");
  if (!DEPLOYMENT_ENVIRONMENTS.has(environment)) throw deploymentError("DEPLOYMENT_ENVIRONMENT_INVALID", "Deployment environment must be testnet or mainnet.");
  if (!rpcUrl || typeof rpcUrl !== "string") throw deploymentError("DEPLOYMENT_RPC_REQUIRED", "A deployment RPC must be configured through the secret manager.");
  if (!deployerAddress) throw deploymentError("DEPLOYER_REQUIRED", "A deployer address/credential is required for deployment.");
  const normalized = {
    network: networkId,
    chainId: profile.chainId,
    environment,
    registryAddress: registryAddress ? normalizeAddress(registryAddress, "registryAddress") : null,
    gateAddress: gateAddress ? normalizeAddress(gateAddress, "gateAddress") : null,
    rpcConfigured: true,
    deployerConfigured: true,
    deploymentMetadata: deploymentMetadata || null,
  };
  if (!normalized.deploymentMetadata) throw deploymentError("DEPLOYMENT_METADATA_REQUIRED", "Deployment metadata must be recorded before deployment is considered complete.");
  if (environment === "mainnet" && profile.demoWritePolicy === "NO_MAINNET_WRITE") {
    throw deploymentError("MAINNET_WRITE_NOT_ALLOWED", "Mainnet writes are not allowed by this deployment profile.");
  }
  return Object.freeze(normalized);
}

function deploymentMetadata({
  networkId,
  chainId,
  registryAddress,
  registryDeploymentTx,
  gateAddress,
  gateDeploymentTx,
  deployerAddress,
  compilerVersion = "0.8.24",
  sourceVerification = "UNVERIFIED",
  deployedAt,
} = {}) {
  const profile = NETWORK_PROFILES[networkId];
  if (!profile || profile.chainId !== normalizeChainId(chainId)) {
    throw deploymentError("DEPLOYMENT_CHAIN_MISMATCH", "Deployment metadata chain does not match the selected profile.");
  }
  return Object.freeze({
    network: networkId,
    chainId: profile.chainId,
    registryAddress: normalizeAddress(registryAddress, "registryAddress"),
    registryDeploymentTx: String(registryDeploymentTx || ""),
    gateAddress: normalizeAddress(gateAddress, "gateAddress"),
    gateDeploymentTx: String(gateDeploymentTx || ""),
    deployerAddress: normalizeAddress(deployerAddress, "deployerAddress"),
    compilerVersion: String(compilerVersion),
    sourceVerification: ["VERIFIED", "UNVERIFIED"].includes(sourceVerification) ? sourceVerification : "UNVERIFIED",
    deployedAt: new Date(deployedAt || Date.now()).toISOString(),
  });
}

module.exports = { validateDeploymentConfig, deploymentMetadata };