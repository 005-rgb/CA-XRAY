// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IJobenAttestationRegistry {
    struct Attestation {
        uint256 subjectChainId;
        address subject;
        bytes32 evidenceHash;
        bytes32 policyHash;
        uint64 issuedAt;
        uint64 expiresAt;
        bytes32 decision;
        bool invalidated;
    }
    function getAttestation(bytes32 passportId) external view returns (Attestation memory);
    function ALLOW() external view returns (bytes32);
}

/// @notice A read-only admission consumer. It never custody funds.
contract JobenAdmissionGate {
    IJobenAttestationRegistry public immutable registry;

    error AdmissionRejected(bytes32 passportId, bytes32 reason);
    event AdmissionAttempt(
        bytes32 indexed passportId,
        uint256 indexed subjectChainId,
        address indexed subject,
        bool accepted,
        bytes32 reason
    );

    constructor(address registryAddress) {
        registry = IJobenAttestationRegistry(registryAddress);
    }

    function admit(bytes32 passportId, uint256 expectedChainId, address expectedSubject) external returns (bool) {
        IJobenAttestationRegistry.Attestation memory record = registry.getAttestation(passportId);
        bytes32 reason;
        bool accepted = true;
        if (record.issuedAt == 0) { accepted = false; reason = keccak256("MISSING_PASSPORT"); }
        else if (record.decision != registry.ALLOW()) { accepted = false; reason = keccak256("DECISION_NOT_ALLOW"); }
        else if (record.expiresAt <= block.timestamp) { accepted = false; reason = keccak256("ATTESTATION_EXPIRED"); }
        else if (record.invalidated) { accepted = false; reason = keccak256("ATTESTATION_INVALIDATED"); }
        else if (record.subjectChainId != expectedChainId || record.subject != expectedSubject) {
            accepted = false; reason = keccak256("SUBJECT_CHAIN_MISMATCH");
        }
        emit AdmissionAttempt(passportId, record.subjectChainId, record.subject, accepted, reason);
        if (!accepted) revert AdmissionRejected(passportId, reason);
        return true;
    }
}