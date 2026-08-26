const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const REGISTRY_ABI = [
  "function issue(bytes32 passportId,uint256 subjectChainId,address subject,bytes32 evidenceHash,bytes32 policyHash,bytes32 decision,uint64 issuedAt,uint64 expiresAt)",
  "function invalidate(bytes32 passportId,bytes32 reason)",
  "function getAttestation(bytes32 passportId) view returns (uint256 subjectChainId,address subject,bytes32 evidenceHash,bytes32 policyHash,uint64 issuedAt,uint64 expiresAt,bytes32 decision,bool invalidated)",
  "function ALLOW() view returns (bytes32)",
];

const GATE_ABI = [
  "function registry() view returns (address)",
  "function admit(bytes32 passportId,uint256 expectedChainId,address expectedSubject) returns (bool)",
  "error AdmissionRejected(bytes32 passportId,bytes32 reason)",
];

const REASON_BY_HASH = new Map([
  [ethers.keccak256(ethers.toUtf8Bytes("MISSING_PASSPORT")), "ATTESTATION_EXPIRED"],
  [ethers.keccak256(ethers.toUtf8Bytes("DECISION_NOT_ALLOW")), "HUMAN_REVIEW_REQUIRED"],
  [ethers.keccak256(ethers.toUtf8Bytes("ATTESTATION_EXPIRED")), "ATTESTATION_EXPIRED"],
  [ethers.keccak256(ethers.toUtf8Bytes("ATTESTATION_INVALIDATED")), "ATTESTATION_INVALIDATED"],
  [ethers.keccak256(ethers.toUtf8Bytes("SUBJECT_CHAIN_MISMATCH")), "TARGET_CHAIN_MISMATCH"],
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function parseTimestamp(value, field) {
  const seconds = Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw Object.assign(new TypeError(`${field} must be a valid timestamp.`), { code: "INVALID_ATTESTATION_TIMESTAMP" });
  }
  return seconds;
}

function normalizeRecord(passport, metadata) {
  return {
    passportId: passport.passportId,
    subjectChainId: Number(passport.subjectChainId),
    subject: String(passport.subject).toLowerCase(),
    evidenceHash: passport.evidenceHash,
    policyHash: passport.policyHash,
    issuedAt: new Date(Number(passport.issuedAt) * 1000).toISOString(),
    expiresAt: new Date(Number(passport.expiresAt) * 1000).toISOString(),
    decision: passport.decision,
    invalidated: Boolean(passport.invalidated),
    mode: "ONCHAIN",
    registryAddress: metadata.registryAddress,
    gateAddress: metadata.gateAddress,
    chainId: metadata.chainId,
  };
}

class OnChainImmuneClient {
  constructor({ rpcUrl, privateKey, metadata, provider, signer } = {}) {
    if (!rpcUrl || !metadata?.registryAddress || !metadata?.gateAddress) {
      throw new TypeError("On-chain client requires RPC and deployment metadata.");
    }
    this.metadata = Object.freeze({ ...metadata });
    this.provider = provider || new ethers.JsonRpcProvider(rpcUrl);
    this.signer = signer || (privateKey ? new ethers.Wallet(privateKey, this.provider) : null);
    this.registry = new ethers.Contract(metadata.registryAddress, REGISTRY_ABI, this.signer || this.provider);
    this.gate = new ethers.Contract(metadata.gateAddress, GATE_ABI, this.signer || this.provider);
  }

  async assertChain() {
    const network = await this.provider.getNetwork();
    if (network.chainId !== BigInt(this.metadata.chainId)) {
      throw Object.assign(new Error("DEPLOYMENT_CHAIN_MISMATCH"), { code: "DEPLOYMENT_CHAIN_MISMATCH" });
    }
  }

  async getPassport(passportId) {
    const raw = await this.registry.getAttestation(passportId);
    if (raw.issuedAt === 0n) return null;
    const decision = raw.decision === await this.registry.ALLOW() ? "ALLOW" : "UNKNOWN";
    return normalizeRecord({
      passportId,
      subjectChainId: raw.subjectChainId,
      subject: raw.subject,
      evidenceHash: raw.evidenceHash,
      policyHash: raw.policyHash,
      issuedAt: raw.issuedAt,
      expiresAt: raw.expiresAt,
      decision,
      invalidated: raw.invalidated,
    }, this.metadata);
  }

  async issue(passport) {
    if (!this.signer) throw Object.assign(new Error("ONCHAIN_SIGNER_REQUIRED"), { code: "ONCHAIN_SIGNER_REQUIRED" });
    await this.assertChain();
    const tx = await this.registry.issue(
      passport.passportId,
      passport.subjectChainId,
      passport.subject,
      passport.evidenceHash,
      passport.policyHash,
      ethers.id(passport.decision),
      parseTimestamp(passport.issuedAt, "issuedAt"),
      parseTimestamp(passport.expiresAt, "expiresAt"),
    );
    const receipt = await tx.wait();
    return {
      ...clone(passport),
      mode: "ONCHAIN",
      registryAddress: this.metadata.registryAddress,
      gateAddress: this.metadata.gateAddress,
      chainId: this.metadata.chainId,
      attestationTransaction: receipt.hash,
    };
  }

  async invalidate(passportId, reasonCode) {
    if (!this.signer) throw Object.assign(new Error("ONCHAIN_SIGNER_REQUIRED"), { code: "ONCHAIN_SIGNER_REQUIRED" });
    await this.assertChain();
    const tx = await this.registry.invalidate(passportId, ethers.id(reasonCode));
    const receipt = await tx.wait();
    return { passportId, reasonCode, invalidationTransaction: receipt.hash };
  }

  async admit({ passportId, subjectChainId, subject }) {
    await this.assertChain();
    const passport = await this.getPassport(passportId);
    if (!passport) {
      return { usable: false, status: "NOT_FOUND", reasonCodes: ["ATTESTATION_EXPIRED"], passport: null };
    }
    try {
      await this.gate.admit.staticCall(passportId, subjectChainId ?? passport.subjectChainId, subject ?? passport.subject);
    } catch (error) {
      const decoded = error?.data ? this.gate.interface.parseError(error.data) : null;
      const reasonCode = REASON_BY_HASH.get(decoded?.args?.[1]) || "ATTESTATION_INVALIDATED";
      return { usable: false, status: "REJECTED", reasonCodes: [reasonCode], passport };
    }
    if (!this.signer) {
      return { usable: true, status: "ACCEPTED", reasonCodes: [], passport, transactionHash: null };
    }
    const tx = await this.gate.admit(passportId, subjectChainId ?? passport.subjectChainId, subject ?? passport.subject);
    const receipt = await tx.wait();
    return { usable: true, status: "ACCEPTED", reasonCodes: [], passport, transactionHash: receipt.hash };
  }
}

function loadDeploymentMetadata(metadataPath = path.join(process.cwd(), "deployments", "arbitrum-sepolia.json")) {
  try {
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function createOnChainClientFromEnv({
  metadataPath = process.env.IMMUNE_SYSTEM_DEPLOYMENT_METADATA,
  rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL,
  privateKey = process.env.ARBITRUM_SEPOLIA_PRIVATE_KEY,
} = {}) {
  const requested = String(process.env.IMMUNE_SYSTEM_ATTESTATION_MODE || "").toLowerCase() === "onchain";
  if (!requested) return null;
  const metadata = loadDeploymentMetadata(metadataPath);
  if (!metadata) throw Object.assign(new Error("ONCHAIN_DEPLOYMENT_METADATA_REQUIRED"), { code: "ONCHAIN_DEPLOYMENT_METADATA_REQUIRED" });
  if (!rpcUrl) throw Object.assign(new Error("ARBITRUM_SEPOLIA_RPC_URL_REQUIRED"), { code: "ARBITRUM_SEPOLIA_RPC_URL_REQUIRED" });
  return new OnChainImmuneClient({ rpcUrl, privateKey: privateKey || null, metadata });
}

module.exports = {
  OnChainImmuneClient,
  createOnChainClientFromEnv,
  loadDeploymentMetadata,
};