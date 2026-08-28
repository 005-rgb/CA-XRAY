# JOBEN NETWORK — P0–P3 Audit and Completion Record

**Audit date:** 2026-08-28  
**Scope:** P0 Product and Evidence Lock, P1 Transaction Intent Firewall, P2
Arbitrum Evidence and Provenance, and P3 On-chain Registry and Admission Gate.

## Result

| Phase | Result | Evidence |
|---|---|---|
| P0 | Complete | `src/immune-system/phase0.js`, the threat model, and the evidence checklist freeze the scenario, selectors, statuses, policies, reason codes, eligibility, provenance boundary, and fixture/live rules. |
| P1 | Complete | Intent and unsigned transaction normalization, five-selector decoder, permission exposure, deterministic policy evaluation, tenant-scoped idempotency, persistence, API v1, and calldata redaction are covered by the immune-system tests. |
| P2 | Complete | Arbitrum One/Sepolia profiles, bytecode/chain validation, contract freshness projection, bounded provenance, conflict preservation, and fail-closed missing evidence are implemented and tested. |
| P3 | Complete in local/reproducible path | Solidity registry and admission gate, server-side canonical attestation hashing, deployment preflight, local lifecycle simulation, deployment compiler check, and PostgreSQL persistence are implemented. |

## P0 lock

- Deterministic demo: deposit 500 USDC into the selected Arbitrum vault.
- Dangerous approval: `MAX_UINT256` to an unknown or upgradeable spender → `BLOCK`.
- Supported operations: ERC-20 transfer/approve/transferFrom, EIP-2612 permit,
  and ERC-721/1155 `setApprovalForAll`.
- Unknown or ambiguous calldata remains `INTENT_DECODE_UNAVAILABLE` or review.
- Eligibility is explicitly recorded as `SEPOLIA_ACCEPTED`, with Arbitrum One
  kept as a separate fallback profile.
- Fixture data is labeled `DEMO FIXTURE` and never substituted for live evidence.

## Hardening completed during this audit

1. Attestation payloads now use deterministic canonical serialization of subject,
   chain ID, decision, evidence hash, policy ID/version, issue/expiry, and
   decision schema version.
2. On-chain attestation IDs are valid `bytes32` values; evidence and policy hashes
   are normalized before the contract call.
3. Contract evidence carries the family-specific freshness result and stale
   evidence maps to `STALE_EVIDENCE`.
4. `PARTIAL` provenance, unavailable critical evidence, and same-status provenance
   disagreements cannot silently become `ALLOW`.
5. Public decision responses redact raw calldata while persistence retains it for
   private audit/replay.
6. Deployment metadata requires both deployment transaction hashes and the
   compiler is pinned to Solidity `0.8.24`.
7. Rollback now includes the immune-system and watchtower migrations.

## Verification

```text
npm test                         114 passing tests
npm run contracts:compile        registry and gate compile successfully
git diff --check                 clean
```

## Remaining external release evidence

The repository does not claim a public Arbitrum deployment without a real RPC,
deployer credential, transaction receipts, explorer records, and source
verification. The deployment script intentionally stops when those values are
not configured through the workspace secret manager. Once supplied, run
`npm run deploy:immune-system`; it performs registry read-back, accepted
admission, invalidation, rejected follow-up admission, and writes the deployment
evidence record.

The following cannot be truthfully completed from repository code alone:

- participant/team confirmation and workshop log;
- final deadline recheck;
- public deployment addresses and transaction hashes;
- explorer/source-verification links;
- same-chain screenshots or recording.