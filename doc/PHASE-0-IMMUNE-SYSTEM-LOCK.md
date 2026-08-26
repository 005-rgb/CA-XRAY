# JOBEN NETWORK — Phase 0 Product and Evidence Lock

**Status:** Complete  
**Contract version:** `1.0.0`  
**Locked:** 2026-08-26  
**Implementation contract:** `src/immune-system/phase0.js`  
**Threat model:** `doc/PHASE-0-THREAT-MODEL.md`  
**Evidence checklist:** `doc/PHASE-0-EVIDENCE-CHECKLIST.md`

## Scope

Phase 0 freezes the product and evidence contracts required by the Arbitrum
Immune System path. It does not claim that transaction decoding, an on-chain
registry, or Watchtower invalidation is already implemented. Those are later
phases and must consume these contracts rather than redefine them.

The one deterministic scenario is:

> Deposit 500 USDC into the selected Arbitrum vault.

The dangerous path is an ERC-20 `approve` for `MAX_UINT256` to an upgradeable or
unknown spender. Its expected result is `BLOCK`, with
`APPROVAL_EXCEEDS_INTENT` and `UNLIMITED_APPROVAL` visible. The compliant path is
an approval of `500000000` USDC base units to the expected spender and can reach
`ALLOW` only after all required evidence checks pass.

The scenario is a `DEMO FIXTURE`. It is not live chain evidence and cannot be
mixed into a live report.

## Network and eligibility decision

| Profile | Chain ID | Role | Status |
|---|---:|---|---|
| Arbitrum Sepolia | `421614` | Primary development/demo and eligible target | `SEPOLIA_ACCEPTED` |
| Arbitrum One | `42161` | Fallback submission/production target | Separate deployment record required |

**Official source checked:** 2026-08-26  
**Source:** [Arbitrum Open House Singapore Buildathon](https://arbitrum-singapore.hackquest.io/buildathons/Arbitrum-Open-House-Singapore-Online-Buildathon)

The source states that a project must be deployed on an Arbitrum chain to
qualify and explicitly lists Arbitrum Sepolia, Arbitrum One, and Robinhood
Chain as examples. This locks Sepolia as the primary target for development and
demo. It does not complete participant registration, team confirmation, or
submission-deadline verification; those remain release evidence items.

## Supported operation matrix

| Selector | Operation | Decoded arguments | Permission | Constraint |
|---|---|---|---|---|
| `0xa9059cbb` | `ERC20_TRANSFER` | `recipient`, `amount` | `VALUE_TRANSFER` | ERC-20 target evidence |
| `0x095ea7b3` | `ERC20_APPROVE` | `spender`, `amount` | `ERC20_ALLOWANCE` | Allowance compared with declared cap |
| `0x23b872dd` | `ERC20_TRANSFER_FROM` | `owner`, `recipient`, `amount` | `ERC20_ALLOWANCE` | Owner/recipient/amount compared |
| `0xd505accf` | `EIP2612_PERMIT` | `owner`, `spender`, `value`, `deadline`, `v`, `r`, `s` | `ERC20_ALLOWANCE` | Deadline is required |
| `0xa22cb465` | `ERC721_SET_APPROVAL_FOR_ALL` or `ERC1155_SET_APPROVAL_FOR_ALL` | `operator`, `approved` | `OPERATOR_APPROVAL` | Same selector; verified target-standard evidence required |

Any unknown or malformed selector is `INTENT_DECODE_UNAVAILABLE` and must not
be treated as an optimistic operation. Arbitrary contract execution is outside
the MVP matrix and requires explicit review/unavailable handling.

## Decision semantics

| Status | Meaning |
|---|---|
| `ALLOW` | All required policy checks passed against the bound evidence snapshot |
| `REVIEW_REQUIRED` | A human decision is required before proceeding |
| `BLOCK` | A hard policy rule was violated |
| `STALE_EVIDENCE` | Required evidence is outside its policy freshness window |
| `UNAVAILABLE` | A required operation or evidence source cannot be evaluated |
| `CONFLICT` | Providers disagree on a material field |

The original evidence status remains visible alongside the enforcement status.
AI-generated explanation can describe a decision but cannot alter the machine
decision.

## Policy contracts

The stable policy IDs and versions are:

- `AI_AGENT_CONSERVATIVE@1.0.0`: fail-closed autonomous-agent admission;
- `LENDING_ASSET_ADMISSION@1.0.0`: asset admission for lending integrations;
- `DEMO_PERMISSIVE@1.0.0`: bounded demo policy, never a production safety policy.

The machine-readable required checks, missing-evidence behavior, conflict
behavior, and hard exclusions are exported by `src/immune-system/phase0.js`.
Callers must select a policy ID/version from this catalog; callers may not
submit a policy definition, workspace override, role override, plan override,
or entitlement override.

## Stable reason code registry

The following reason codes are API/report contracts:

```text
TARGET_NOT_DEPLOYED
TARGET_CHAIN_MISMATCH
INTENT_DECODE_UNAVAILABLE
INTENT_ACTION_MISMATCH
APPROVAL_EXCEEDS_INTENT
UNLIMITED_APPROVAL
UNKNOWN_SPENDER
UPGRADEABLE_SPENDER
PRIVILEGED_FUNCTION_CALL
ORIGIN_UNKNOWN
BRIDGE_UNVERIFIED
BRIDGE_ADMIN_ACTIVE
ORIGIN_MINT_AUTHORITY_UNRESOLVED
PROVIDER_CONFLICT
CRITICAL_EVIDENCE_STALE
ATTESTATION_EXPIRED
ATTESTATION_INVALIDATED
DEPENDENCY_CHANGED
BLAST_RADIUS_INCOMPLETE
HUMAN_REVIEW_REQUIRED
```

`UPGRADEABLE_OR_UNKNOWN` in the frozen demo description is a scenario label.
The machine-readable expected reason list uses only the stable codes
`UPGRADEABLE_SPENDER` and `UNKNOWN_SPENDER`.

## Bounded provenance

The only Phase 0 provenance path is:

```text
origin contract -> configured canonical bridge -> Arbitrum representation
```

Only configured, directly observed, or explicitly labeled inferred edges may be
emitted. Address similarity, ticker/name similarity, shared deployer alone, and
shared funder alone cannot establish provenance. Unknown relationships remain
`UNKNOWN`.

## Phase 0 exit decision

All Phase 0 product/evidence locks are represented in code and documentation:

- deterministic demo scenario frozen;
- selector and permission matrix explicit;
- decision statuses and meanings stable;
- policy IDs and versions defined;
- reason code registry stable;
- Sepolia/One decision recorded with a dated official source;
- provenance scope bounded;
- fixture/live boundary documented;
- threat model and evidence checklist present.

No Phase 1, Phase 3, or Phase 4 capability is implied by this document.