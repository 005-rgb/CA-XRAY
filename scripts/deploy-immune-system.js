#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const { NETWORK_PROFILES } = require("../src/immune-system/phase0");
const { deploymentMetadata, validateDeploymentConfig } = require("../src/immune-system/deployment");

const NETWORK_ID = "arbitrum-sepolia";
const PROFILE = NETWORK_PROFILES[NETWORK_ID];
const COMPILER_VERSION = "0.8.24";
const ROOT = path.join(__dirname, "..");
const DEPLOYMENTS_DIR = path.join(ROOT, "deployments");
const METADATA_PATH = path.join(DEPLOYMENTS_DIR, "arbitrum-sepolia.json");

function requiredSecret(name) {
  const value = process.env[name];
  if (!value || typeof value !== "string") {
    throw new Error(`${name}_REQUIRED: configure it through the workspace secret manager.`);
  }
  return value;
}

async function readSources() {
  const [registry, gate] = await Promise.all([
    fs.readFile(path.join(ROOT, "contracts", "JobenAttestationRegistry.sol"), "utf8"),
    fs.readFile(path.join(ROOT, "contracts", "JobenAdmissionGate.sol"), "utf8"),
  ]);
  return {
    "JobenAttestationRegistry.sol": { content: registry },
    "JobenAdmissionGate.sol": { content: gate },
  };
}

function compile(sources) {
  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) throw new Error(`SOLIDITY_COMPILE_FAILED: ${errors.map((item) => item.formattedMessage).join("\n")}`);
  const registry = output.contracts?.["JobenAttestationRegistry.sol"]?.JobenAttestationRegistry;
  const gate = output.contracts?.["JobenAdmissionGate.sol"]?.JobenAdmissionGate;
  if (!registry?.abi || !registry.evm?.bytecode?.object || !gate?.abi || !gate.evm?.bytecode?.object) {
    throw new Error("SOLIDITY_ARTIFACT_MISSING");
  }
  return { registry, gate };
}

async function sendRevertingAdmission(wallet, gate, passportId, subject) {
  const tx = await wallet.sendTransaction({
    to: await gate.getAddress(),
    data: gate.interface.encodeFunctionData("admit", [passportId, PROFILE.chainId, subject]),
    gasLimit: 250_000n,
  });
  try {
    const receipt = await tx.wait();
    if (receipt?.status !== 0) throw new Error("INVALIDATION_PROOF_DID_NOT_REVERT");
    return tx.hash;
  } catch (error) {
    const receiptHash = error.receipt?.hash || error.receipt?.transactionHash;
    return receiptHash || tx.hash;
  }
}

async function main() {
  if (NETWORK_ID !== "arbitrum-sepolia" || PROFILE.chainId !== 421614) {
    throw new Error("DEPLOYMENT_PROFILE_INVALID");
  }
  const rpcUrl = requiredSecret("ARBITRUM_SEPOLIA_RPC_URL");
  const privateKey = requiredSecret("ARBITRUM_SEPOLIA_PRIVATE_KEY");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const chain = await provider.getNetwork();
  if (chain.chainId !== BigInt(PROFILE.chainId)) throw new Error("DEPLOYMENT_CHAIN_MISMATCH");
  const wallet = new ethers.Wallet(privateKey, provider);
  const sources = await readSources();
  const artifacts = compile(sources);

  const registryFactory = new ethers.ContractFactory(artifacts.registry.abi, artifacts.registry.evm.bytecode.object, wallet);
  const registry = await registryFactory.deploy(wallet.address);
  const registryReceipt = await registry.deploymentTransaction().wait();

  const gateFactory = new ethers.ContractFactory(artifacts.gate.abi, artifacts.gate.evm.bytecode.object, wallet);
  const gate = await gateFactory.deploy(await registry.getAddress());
  const gateReceipt = await gate.deploymentTransaction().wait();

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600;
  const passportId = ethers.id(`joben-demo:${wallet.address}:${now}`);
  const subject = process.env.JOBEN_DEMO_SUBJECT || "0x0000000000000000000000000000000000000101";
  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(`joben:evidence:${passportId}`));
  const policyHash = ethers.keccak256(ethers.toUtf8Bytes("AI_AGENT_CONSERVATIVE:1.0.0"));
  const decision = ethers.id("ALLOW");

  const issueTx = await registry.issue(
    passportId,
    PROFILE.chainId,
    subject,
    evidenceHash,
    policyHash,
    decision,
    now,
    expiresAt,
  );
  const issueReceipt = await issueTx.wait();
  const attestation = await registry.getAttestation(passportId);
  if (attestation.subjectChainId !== BigInt(PROFILE.chainId) || attestation.subject.toLowerCase() !== subject.toLowerCase()) {
    throw new Error("REGISTRY_READBACK_MISMATCH");
  }

  const admissionTx = await gate.admit(passportId, PROFILE.chainId, subject);
  const admissionReceipt = await admissionTx.wait();
  if (admissionReceipt.status !== 1) throw new Error("ADMISSION_ACCEPTANCE_FAILED");

  const invalidateTx = await registry.invalidate(passportId, ethers.id("DEPENDENCY_CHANGED"));
  const invalidateReceipt = await invalidateTx.wait();
  const invalidated = await registry.getAttestation(passportId);
  if (!invalidated.invalidated) throw new Error("INVALIDATION_READBACK_FAILED");
  const rejectedAdmissionTx = await sendRevertingAdmission(wallet, gate, passportId, subject);

  const deployedAt = new Date().toISOString();
  const metadata = deploymentMetadata({
    networkId: NETWORK_ID,
    chainId: PROFILE.chainId,
    registryAddress: await registry.getAddress(),
    registryDeploymentTx: registryReceipt.hash,
    gateAddress: await gate.getAddress(),
    gateDeploymentTx: gateReceipt.hash,
    deployerAddress: wallet.address,
    compilerVersion: COMPILER_VERSION,
    sourceVerification: "UNVERIFIED",
    deployedAt,
  });
  const document = {
    ...metadata,
    proof: {
      passportId,
      evidenceHash,
      policyHash,
      decision: "ALLOW",
      attestationTransaction: issueReceipt.hash,
      admissionAcceptedTransaction: admissionReceipt.hash,
      invalidationTransaction: invalidateReceipt.hash,
      admissionRejectedTransaction: rejectedAdmissionTx,
      readback: {
        subjectChainId: Number(invalidated.subjectChainId),
        subject: invalidated.subject,
        invalidated: invalidated.invalidated,
      },
    },
  };
  validateDeploymentConfig({
    networkId: NETWORK_ID,
    chainId: PROFILE.chainId,
    environment: PROFILE.environment,
    registryAddress: metadata.registryAddress,
    gateAddress: metadata.gateAddress,
    rpcUrl: "configured",
    deployerAddress: metadata.deployerAddress,
    deploymentMetadata: document,
  });
  await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });
  await fs.writeFile(METADATA_PATH, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    network: NETWORK_ID,
    chainId: PROFILE.chainId,
    registryAddress: metadata.registryAddress,
    gateAddress: metadata.gateAddress,
    deployerAddress: metadata.deployerAddress,
    registryDeploymentTx: metadata.registryDeploymentTx,
    gateDeploymentTx: metadata.gateDeploymentTx,
    attestationTransaction: issueReceipt.hash,
    admissionAcceptedTransaction: admissionReceipt.hash,
    invalidationTransaction: invalidateReceipt.hash,
    admissionRejectedTransaction: rejectedAdmissionTx,
    metadataPath: path.relative(ROOT, METADATA_PATH),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});