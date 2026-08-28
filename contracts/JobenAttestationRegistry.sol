// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal, non-upgradeable registry. It stores attestations only;
/// evidence and risk scoring remain off-chain and are bound by their hashes.
contract JobenAttestationRegistry {
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

    bytes32 public constant ALLOW = keccak256("ALLOW");
    mapping(bytes32 => Attestation) private attestations;
    mapping(address => bool) public isIssuer;

    error Unauthorized();
    error ZeroPassportId();
    error DuplicatePassport();
    error InvalidExpiry();
    error MissingPassport();
    error AlreadyInvalidated();
    error InvalidSubject();

    event AttestationIssued(
        bytes32 indexed passportId,
        uint256 indexed subjectChainId,
        address indexed subject,
        bytes32 evidenceHash,
        bytes32 policyHash,
        bytes32 decision,
        uint64 issuedAt,
        uint64 expiresAt,
        address issuer
    );
    event AttestationInvalidated(bytes32 indexed passportId, bytes32 reason, address issuer);
    event IssuerUpdated(address indexed issuer, bool enabled);

    constructor(address initialIssuer) {
        if (initialIssuer == address(0)) revert Unauthorized();
        isIssuer[initialIssuer] = true;
        emit IssuerUpdated(initialIssuer, true);
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert Unauthorized();
        _;
    }

    function setIssuer(address issuer, bool enabled) external onlyIssuer {
        if (issuer == address(0)) revert Unauthorized();
        isIssuer[issuer] = enabled;
        emit IssuerUpdated(issuer, enabled);
    }

    function issue(
        bytes32 passportId,
        uint256 subjectChainId,
        address subject,
        bytes32 evidenceHash,
        bytes32 policyHash,
        bytes32 decision,
        uint64 issuedAt,
        uint64 expiresAt
    ) external onlyIssuer {
        if (passportId == bytes32(0)) revert ZeroPassportId();
        if (attestations[passportId].issuedAt != 0) revert DuplicatePassport();
        if (subject == address(0) || subjectChainId == 0) revert InvalidSubject();
        if (expiresAt <= issuedAt) revert InvalidExpiry();
        attestations[passportId] = Attestation(
            subjectChainId, subject, evidenceHash, policyHash,
            issuedAt, expiresAt, decision, false
        );
        emit AttestationIssued(
            passportId, subjectChainId, subject, evidenceHash, policyHash,
            decision, issuedAt, expiresAt, msg.sender
        );
    }

    function invalidate(bytes32 passportId, bytes32 reason) external onlyIssuer {
        Attestation storage record = attestations[passportId];
        if (record.issuedAt == 0) revert MissingPassport();
        if (record.invalidated) revert AlreadyInvalidated();
        record.invalidated = true;
        emit AttestationInvalidated(passportId, reason, msg.sender);
    }

    function getAttestation(bytes32 passportId) external view returns (Attestation memory) {
        return attestations[passportId];
    }
}