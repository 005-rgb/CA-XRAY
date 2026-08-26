# JOBEN NETWORK — Arbitrum Immune System

## Implementation Roadmap — Prioritized, Reproducible, and Competition-Ready

**Status:** Planning baseline; no implementation performed by this document  
**Source of truth:** `doc/ARBITRUM-IMMUNE-SYSTEM-ROADMAP.md`  
**Primary execution environment:** Arbitrum  
**Initial deployment target:** Arbitrum Sepolia (`421614`), subject to official eligibility confirmation  
**Fallback deployment target:** Arbitrum One (`42161`) if the official rules require it  
**Primary product:** JOBEN Arbitrum Immune System  
**Technical MVP:** JOBEN Transaction Intent Firewall  
**Planning date:** 2026-08-26  

---

## 0. Purpose and Operating Rule

This document converts the approved PRD into an implementation plan that can be
executed and evaluated without relying on roadmap language alone.

The implementation must prove one complete path:

```text
declared agent intent
  -> unsigned transaction
  -> calldata and permission analysis
  -> Arbitrum evidence and provenance
  -> deterministic policy decision
  -> ALLOW / REVIEW_REQUIRED / BLOCK
  -> evidence attestation
  -> on-chain registry and admission gate
  -> dependency change
  -> invalidation
  -> rejected or escalated follow-up admission
```

The product must not be released as a generic multichain scanner, a provider
aggregation dashboard, or a demo that only stores a hash off-chain.

### 0.1 Product positioning

```text
Arbitrum
  = execution, admission, policy, and attestation plane

Other networks
  = supporting intelligence:
    origin, bridge, deployer history, funding, comparison, and provenance
```

Other network support remains intact. It is not the critical path unless it
provides evidence for an Arbitrum decision.

### 0.2 Non-negotiable engineering rules

1. Unknown, unavailable, unverified, partial, conflict, and stale evidence must
   remain explicit.
2. Missing evidence must never silently produce `ALLOW`.
3. The machine decision is deterministic and cannot be changed by AI-generated
   prose.
4. Every decision is bound to a chain, subject, policy version, and evidence
   snapshot.
5. Arbitrum One and Arbitrum Sepolia are separate network profiles and separate
   deployment records.
6. Wallet connection and transaction submission are not MVP blockers.
7. No private key, seed phrase, API key, or raw secret may enter the repository,
   logs, screenshots, reports, or public bundles.
8. Existing evidence, trust, persistence, authentication, and Watchtower
   boundaries must be reused rather than forked.
9. A configured or simulated fixture must be labeled as a fixture; it must not
   be presented as live chain evidence.
10. No production or competition claim is valid until it maps to an observable
    behavior, transaction, public record, or reproducible test.

---

## 1. Current Baseline

The imported application already provides a substantial evidence platform.
Implementation planning must extend it rather than recreate it.

### 1.1 Existing capabilities to reuse

| Existing capability | Current value for this roadmap | Reuse boundary |
|---|---|---|
| `src/engine.js` | Normalized evidence, risk scoring, reliability, findings, report shape | Keep responsible for forensic/risk semantics |
| `src/contracts/trust.js` | Evidence states, freshness vocabulary, trust events | Remain the semantic authority |
| `src/providers/registry.js` | Provider validation, quotas, concurrency, health | Add adapters through the existing contract |
| `src/providers/default-adapters.js` | GoPlus, DexScreener, Blockscout, RPC evidence | Consume as evidence; do not treat a provider as the product |
| `src/providers/evm-evidence.js` | EVM deployment/history evidence | Reuse for Arbitrum target evidence |
| `src/intelligence/store.js` | Passport, snapshots, trajectory, graph, review, cases | Extend for decision and invalidation linkage |
| `src/watchtower/` | Monitoring, materiality, retries, outbox, replay | Connect dependency change to invalidation |
| `src/api/developer.js` | API key, signed report, usage, uncertainty contract | Reuse for intent-check API access |
| `src/persistence/` | Memory/PostgreSQL persistence boundary | Add decision persistence without replacing PostgreSQL direction |
| `src/auth/` and `src/security/` | Session, workspace, authorization, quotas, audit | Keep workspace and policy controls authoritative |
| `public/` | Existing bilingual product shell and private workspace UI | Add focused surfaces; do not replace the application shell |

### 1.2 Existing Arbitrum support

The current scanner has Arbitrum One support with:

- chain ID `42161`;
- public RPC configuration;
- Blockscout evidence;
- bytecode existence verification;
- explorer links;
- market evidence through DexScreener;
- provider capability matrix.

This is useful evidence infrastructure, but it does not yet constitute the
Arbitrum Immune System product.

### 1.3 Known gaps before this roadmap

The following are not considered implemented merely because similar words exist
in documents or unrelated admin/compliance code:

- declared transaction intent;
- unsigned transaction resource;
- calldata decoder;
- ERC-20 allowance analysis;
- permit and operator approval analysis;
- intent mismatch decision;
- `AI_AGENT_CONSERVATIVE` policy;
- bridge/origin provenance adapter;
- Arbitrum Sepolia profile;
- Solidity or Stylus contract;
- on-chain attestation registry;
- admission gate;
- on-chain expiry/invalidation;
- dependency-to-attestation invalidation;
- integration blast-radius enforcement;
- dedicated Agent Simulator;
- transaction Decision Review;
- Permission Exposure panel;
- on-chain Passport verification.

---

## 2. Priority Model

### P0 — Product and eligibility lock

**Purpose:** Eliminate ambiguity before implementation.  
**Release impact:** Stop-ship if incomplete.

### P1 — Transaction Intent Firewall

**Purpose:** Prove that JOBEN understands and evaluates the exact transaction.  
**Release impact:** Core product cannot exist without it.

### P2 — Arbitrum evidence and provenance

**Purpose:** Make Arbitrum meaningful and preserve supporting multichain value.  
**Release impact:** Differentiation and policy credibility.

### P3 — On-chain registry and admission gate

**Purpose:** Prove that a decision is verifiable and consumable on Arbitrum.  
**Release impact:** Required for on-chain competition proof.

### P4 — Watchtower immune response

**Purpose:** Prove that a previously accepted decision can be invalidated.  
**Release impact:** Required for the “immune system” claim.

### P5 — Product surface and competition polish

**Purpose:** Make the complete technical path understandable and reproducible.  
**Release impact:** Required for evaluator and user comprehension.

### P6 — Submission hardening

**Purpose:** Make the project secure, documented, reproducible, and eligible.  
**Release impact:** Final release gate.

---

## 3. Critical Path and Schedule

The source PRD defines these windows:

| Phase | PRD window | Priority | Dependency |
|---|---|---:|---|
| Phase 0 | 2026-08-25 — 2026-08-28 | P0 | None |
| Phase 1 | 2026-08-29 — 2026-09-04 | P1 | P0 |
| Phase 2 | 2026-09-05 — 2026-09-10 | P2 | P0, P1 domain contracts |
| Phase 3 | 2026-09-11 — 2026-09-16 | P3 | P1, P2 chain/evidence contracts |
| Phase 4 | 2026-09-17 — 2026-09-22 | P4 | P3 attestation lifecycle |
| Phase 5 | 2026-09-23 — 2026-09-27 | P5 | P1–P4 behavior |
| Phase 6 | 2026-09-28 — 2026-10-04 | P6 | All release gates |

### 3.1 Schedule risk and hard checkpoint

The PRD competition window begins on 2026-09-14 while Phase 3 ends on
2026-09-16. Therefore the on-chain path cannot be treated as a late polishing
task.

Required internal checkpoint:

```text
Before 2026-09-11:
  contract source, tests, deployment scripts, and network decision ready

2026-09-11 — 2026-09-13:
  deploy, read back, attest, invalidate, verify gate behavior

2026-09-14:
  minimum Arbitrum on-chain path demonstrable
```

If the final rule requires Arbitrum One, the same reviewed source must be
deployed separately to Arbitrum One before the submission gate.

### 3.2 Dependency graph

```text
P0 product/eligibility lock
  ├── P1 intent and permission
  ├── P2 provenance and Arbitrum evidence
  └── P3 contract design

P1 + P2
  -> P3 registry, attestation, and gate

P3
  -> P4 invalidation and admission re-check

P1–P4
  -> P5 simulator, review, verification, and Judge Mode

P1–P5
  -> P6 testing, evidence package, and submission
```

---

## 4. P0 — Product and Evidence Lock

**Window:** 2026-08-25 — 2026-08-28  
**Priority:** Critical  
**Owner role:** Product owner + technical owner  
**Depends on:** None

### P0.1 Freeze the demo scenario

Use one deterministic scenario:

```text
Instruction:
  Deposit 500 USDC into the selected Arbitrum vault.
```

Dangerous transaction:

```text
  ERC-20 approve
  amount = MAX_UINT256
  spender = upgradeable or unknown spender
```

Expected result:

```text
  BLOCK
  APPROVAL_EXCEEDS_INTENT
  UNLIMITED_APPROVAL
  UPGRADEABLE_SPENDER or UNKNOWN_SPENDER
```

Compliant transaction:

```text
  ERC-20 approve
  amount = 500 USDC in base units
  spender = expected spender
  target and evidence satisfy policy
```

Expected result:

```text
  ALLOW
```

Immune response:

```text
  monitored dependency changes
  -> prior passport/attestation invalidated
  -> next admission becomes REVIEW_REQUIRED or BLOCK
```

### P0.2 Freeze supported operation matrix

| Operation | MVP support | Required behavior |
|---|---:|---|
| ERC-20 `transfer` | Yes | Decode recipient and amount |
| ERC-20 `approve` | Yes | Decode spender and allowance |
| ERC-20 `transferFrom` | Yes | Decode owner, recipient, amount |
| EIP-2612 `permit` | Yes when payload supplied | Decode owner, spender, value, deadline |
| ERC-721 `setApprovalForAll` | Yes | Decode operator and boolean approval |
| ERC-1155 `setApprovalForAll` | Yes | Decode operator and boolean approval |
| Arbitrary unknown selector | No | `INTENT_DECODE_UNAVAILABLE`; never optimistic |
| Arbitrary contract execution | No | Out of scope; require explicit review/unavailable |

The exact ABI decoding implementation may be selected during P1, but the
semantic output must not change.

### P0.3 Freeze decision semantics

Decision output must distinguish:

```text
ALLOW
REVIEW_REQUIRED
BLOCK
STALE_EVIDENCE
UNAVAILABLE
CONFLICT
```

The original evidence state remains visible even when policy maps it to an
enforcement result.

### P0.4 Freeze reason code registry

Initial stable reason codes:

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

Reason codes are API/report contracts. Removing or changing their meaning
requires a schema/version decision.

### P0.5 Freeze policy contracts

#### `AI_AGENT_CONSERVATIVE`

Must require:

- target bytecode on selected chain;
- declared and decoded action match;
- approval does not exceed declared amount;
- target and spender are not unknown;
- critical evidence is fresh;
- unresolved provider conflict is not allowed;
- critical proxy/admin change is absent;
- provenance is verified or explicitly allowed;
- value is under policy limit;
- sensitive selectors require human review.

#### `LENDING_ASSET_ADMISSION`

Must require:

- asset deployed on Arbitrum;
- source or bytecode evidence;
- risk below configured threshold;
- reliability above configured threshold;
- owner/control evidence fresh;
- bridge/origin not unknown for bridged assets;
- critical mint/blacklist/pause findings resolved;
- liquidity minimum where applicable.

#### `DEMO_PERMISSIVE`

May tolerate lower-severity unknowns, but must never allow:

- invalid target;
- missing bytecode;
- value-transfer intent mismatch;
- unlimited approval where a cap is declared;
- known critical change;
- invalid or expired attestation.

### P0.6 Resolve eligibility decision

Record an official source and date for:

- accepted network;
- accepted contract language;
- deployment requirements;
- participant/team requirements;
- feedback/workshop requirements;
- submission deadline.

Until resolved, status must be one of:

```text
SEPOLIA_ACCEPTED
ARBITRUM_ONE_REQUIRED
AWAITING_OFFICIAL_CLARIFICATION
```

“Probably accepted” is not a release status.

### P0.7 Freeze provenance scope

Select one bounded path:

```text
origin contract
  -> configured canonical bridge
  -> Arbitrum representation
```

Do not implement automatic discovery of every bridge or infer ownership from
address similarity.

### P0.8 Produce the threat model

Threat model must cover:

- intent spoofing;
- malicious or ambiguous calldata;
- replayed decision;
- stale evidence;
- provider conflict;
- issuer compromise;
- forged attestation;
- chain/subject mismatch;
- false provenance inference;
- AI text influencing machine decision;
- public verification data leakage.

### P0 exit criteria

P0 is complete only when:

- one demo scenario is frozen;
- schemas and status meanings are approved;
- selector support is explicit;
- policy IDs and versions are defined;
- reason codes are stable;
- Sepolia/One decision has a recorded status;
- bridge scope is bounded;
- fixture/live boundaries are documented;
- threat model and evidence checklist exist.

---

## 5. P1 — Transaction Intent Firewall

**Window:** 2026-08-29 — 2026-09-04  
**Priority:** Critical  
**Owner role:** Backend/domain owner  
**Depends on:** P0

### P1.1 Normalize declared intent

Input must validate:

- `intentId`;
- `actorType`;
- `actorId`;
- `chainId`;
- `sender`;
- `declaredAction`;
- `asset`;
- `amount` as integer string;
- `destination`;
- `expectedSpender`;
- `maxApproval`;
- `policyId`;
- `policyVersion`.

The caller must not be able to supply:

- workspace override;
- role override;
- plan override;
- policy definition;
- entitlement override.

### P1.2 Normalize unsigned transaction

Input must validate:

- `transactionId`;
- chain ID;
- `from`;
- `to`;
- `value` as integer string;
- `data`;
- gas limit;
- nonce if present;
- captured timestamp;
- bounded payload size.

Raw calldata remains private by default and is redacted from public output when
not required for verification.

### P1.3 Decode supported calldata

Normalized decoder result:

```json
{
  "selector": "0x095ea7b3",
  "operation": "ERC20_APPROVE",
  "target": "0x...",
  "asset": "0x...",
  "spender": "0x...",
  "amount": "500000000",
  "status": "VERIFIED",
  "evidenceRefs": []
}
```

Unknown or malformed calldata must produce an explicit unavailable/review
result, not a guessed operation.

### P1.4 Analyze permission exposure

For each supported operation, calculate:

- permission type;
- requested amount;
- declared amount;
- exposure delta;
- spender/operator;
- spender known/unknown state;
- upgradeability;
- expiry/deadline when present;
- evidence references;
- confidence and limitation.

Example:

```json
{
  "permissionType": "ERC20_ALLOWANCE",
  "requestedAmount": "MAX_UINT256",
  "declaredMaximum": "500000000",
  "exposure": "UNLIMITED",
  "status": "VERIFIED",
  "reasonCodes": [
    "UNLIMITED_APPROVAL",
    "APPROVAL_EXCEEDS_INTENT"
  ]
}
```

### P1.5 Compare intent and actual operation

Compare:

- action;
- chain;
- sender;
- target;
- asset;
- amount;
- recipient;
- spender;
- operator;
- value;
- approval limit;
- policy constraints.

The comparison must be deterministic and replayable.

### P1.6 Evaluate policy

Policy evaluation must return:

- decision;
- decision status;
- reason code list;
- evidence references;
- policy ID/version;
- evidence snapshot;
- limitations;
- decision hash;
- expiry;
- evaluator version.

AI-generated text can explain a result but cannot alter this result.

### P1.7 Add intent-check API

Required semantics:

```text
POST /api/v1/intent-checks
GET  /api/v1/intent-checks/{decisionId}
GET  /api/v1/policies
```

API invariants:

- authenticated workspace context comes from session/API key;
- idempotency key is required or deterministically derived;
- repeated request does not create duplicate decisions;
- decision output is versioned;
- provider failure becomes explicit degraded state;
- no false `ALLOW` from missing evidence;
- public output excludes private workspace metadata.

### P1.8 Persist decisions

Decision record must preserve:

- workspace and actor;
- intent;
- unsigned transaction;
- decoded operation;
- permission exposure;
- policy version;
- evidence snapshot ID;
- evidence hash;
- status;
- reason codes;
- issued/expiry timestamps;
- invalidation state;
- idempotency key;
- audit event references.

Memory storage remains suitable for development. PostgreSQL remains the
production persistence direction.

### P1.9 P1 tests

Required:

1. Capped approval matching deposit reaches policy evaluation.
2. Unlimited approval returns `BLOCK`.
3. Approval above declared intent returns `BLOCK`.
4. Wrong recipient returns `BLOCK`.
5. Unknown selector returns explicit unavailable/review.
6. Invalid address fails closed.
7. Wrong chain ID fails closed.
8. Unknown spender cannot silently pass conservative policy.
9. Replayed idempotency key returns the original decision.
10. Workspace A cannot read Workspace B’s decision.
11. Permit deadline is not treated as unlimited freshness.
12. Operator approval is represented separately from ERC-20 allowance.

### P1 exit criteria

P1 is complete when the following works without a real wallet:

```text
declared intent
  -> unsigned transaction
  -> decoded operation
  -> permission exposure
  -> deterministic policy
  -> decision with reason codes and evidence
```

---

## 6. P2 — Arbitrum Evidence and Provenance

**Window:** 2026-09-05 — 2026-09-10  
**Priority:** High  
**Owner role:** Evidence/provider owner  
**Depends on:** P0 and P1 domain contracts

### P2.1 Add separate Arbitrum profiles

Required profiles:

```text
arbitrum-one
  chainId: 42161

arbitrum-sepolia
  chainId: 421614
```

Each profile must define separately:

- RPC;
- explorer;
- provider support;
- Blockscout host where available;
- environment label;
- deployment metadata location;
- demo/mainnet restrictions.

No address or provider result may be reused across profiles without chain
validation.

### P2.2 Validate target deployment

Before policy evaluation:

- verify address syntax;
- verify selected network;
- verify chain ID;
- query bytecode;
- capture block reference;
- capture retrieval time;
- record provider result state;
- fail closed when target is not deployed.

Required reason codes:

```text
TARGET_NOT_DEPLOYED
TARGET_CHAIN_MISMATCH
```

### P2.3 Reuse existing provider evidence

Use existing adapters for:

- security capability evidence;
- market/liquidity evidence;
- verified ABI/source;
- ownership/admin;
- bytecode;
- holder and deployment evidence.

Do not change scoring semantics solely to support the new decision path.

### P2.4 Implement bounded provenance

Canonical provenance output:

```json
{
  "edgeId": "edge_opaque",
  "from": {
    "networkId": "arbitrum-one",
    "address": "0x..."
  },
  "to": {
    "networkId": "ethereum",
    "address": "0x..."
  },
  "relationship": "BRIDGED_REPRESENTATION",
  "status": "VERIFIED",
  "source": "configured_canonical_bridge_adapter",
  "observedAt": "2026-09-20T10:30:00.000Z",
  "limitation": null
}
```

Supported status:

```text
VERIFIED
PARTIAL
UNKNOWN
CONFLICT
```

Unknown relationships must not be fabricated from:

- address similarity;
- ticker/name similarity;
- shared deployer alone;
- shared funder alone.

### P2.5 Analyze authority and bridge state

Where evidence is available, capture:

- origin contract;
- origin chain;
- bridge identity;
- bridge admin;
- bridge implementation;
- origin mint authority;
- pause capability;
- proxy/upgradeability;
- retrieval block and timestamp.

### P2.6 Freshness and conflict projection

Use evidence family-specific freshness. At minimum:

| Family | Default freshness |
|---|---:|
| Market | 6 hours |
| Liquidity | 24 hours |
| Control/owner | 168 hours |
| Deployer | 720 hours |
| Contract | 720 hours |
| Bridge/origin | Explicitly configured by policy |

Provider conflict must preserve:

- field;
- values;
- provider evidence references;
- conflict status;
- policy impact;
- limitation.

### P2.7 Bounded blast radius

Graph output must contain only:

- configured edges;
- directly observed edges;
- explicitly labeled inferred edges.

Minimum projection:

```text
changed dependency
  -> directly affected asset
  -> directly affected demo integration
```

Every edge must include:

- evidence basis;
- status;
- confidence;
- limitation;
- observed/inferred/configured classification.

### P2.8 P2 fixtures

Create clearly labeled fixtures for:

1. verified provenance;
2. partial provenance;
3. unknown provenance;
4. provider conflict;
5. bridge/admin change;
6. target deployed on the wrong chain;
7. stale control evidence.

### P2 acceptance criteria

1. Arbitrum One and Sepolia evidence never mixes.
2. A valid address without bytecode on selected chain is rejected.
3. Verified origin differs from unknown origin in policy output.
4. Provider disagreement is visible and not silently allowed.
5. Unknown origin produces `REVIEW_REQUIRED` under conservative policy.
6. Every graph edge has evidence basis and limitation.
7. Other networks appear as provenance support, not competing execution paths.

### P2 exit criteria

JOBEN can answer, with evidence:

> “What asset is this on Arbitrum, where did it come from, through which
> configured path, and how reliable is that relationship?”

---

## 7. P3 — On-chain Registry and Admission Gate

**Window:** 2026-09-11 — 2026-09-16  
**Priority:** Critical for eligibility  
**Owner role:** Smart-contract owner + backend owner  
**Depends on:** P1 and P2

### P3.1 Contract boundaries

The registry is not a score oracle and does not recompute provider evidence.

It provides:

- chain and subject binding;
- policy binding;
- evidence hash;
- decision status;
- issue/expiry timestamps;
- authorized issuer invalidation;
- lifecycle events;
- duplicate/replay protection;
- read path for the admission gate.

### P3.2 Registry data

Required semantic fields:

```solidity
passportId
subjectChainId
subject
evidenceHash
policyHash
issuedAt
expiresAt
decision
invalidated
```

### P3.3 Registry security

Required:

- explicit issuer role;
- unauthorized writes rejected;
- unauthorized invalidation rejected;
- no zero passport ID;
- no duplicate passport ID;
- `expiresAt > issuedAt`;
- no silent overwrite;
- no invalidation of missing record;
- repeated invalidation monotonic;
- subject and chain binding;
- event data sufficient for audit;
- no upgradeability unless separately reviewed and required.

### P3.4 Admission gate

The gate must:

- receive passport ID;
- read registry;
- reject missing passport;
- reject non-`ALLOW`;
- reject expired passport;
- reject invalidated passport;
- emit admission attempt;
- expose deterministic accept/reject behavior;
- not custody meaningful funds.

### P3.5 Contract development workflow

Required order:

1. pin compiler and dependency versions;
2. implement contract;
3. write unit and adversarial tests;
4. run local compile/test;
5. deploy registry to selected test network;
6. read back registry;
7. deploy gate linked to registry;
8. create `ALLOW` attestation;
9. verify gate accepts;
10. invalidate attestation;
11. verify gate rejects;
12. record public evidence;
13. repeat on Arbitrum One if required.

### P3.6 Server-side attestation

Backend must canonicalize and hash:

- subject;
- chain ID;
- decision;
- evidence hash;
- policy ID;
- policy version;
- issue time;
- expiry time;
- decision schema version.

Serialization must be deterministic and tested for stability.

### P3.7 Deployment controls

Deployment must fail when:

- RPC secret/configuration is missing;
- deployer credential is missing;
- chain ID does not match selected network;
- target is not explicitly allowed;
- demo mode attempts a mainnet write;
- deployment metadata cannot be recorded.

Credentials must be managed through the workspace secret manager, never through
repository files.

### P3.8 Deployment evidence

For each network:

```json
{
  "network": "arbitrum-sepolia",
  "chainId": 421614,
  "registryAddress": "0x...",
  "registryDeploymentTx": "0x...",
  "gateAddress": "0x...",
  "gateDeploymentTx": "0x...",
  "deployerAddress": "0x...",
  "compilerVersion": "...",
  "sourceVerification": "VERIFIED|UNVERIFIED",
  "deployedAt": "..."
}
```

### P3.9 Contract acceptance tests

1. Authorized attestation succeeds.
2. Unauthorized attestation fails.
3. Duplicate passport fails.
4. Invalid expiry fails.
5. Expired passport is not usable.
6. Non-`ALLOW` passport is not usable.
7. Invalidated passport is not usable.
8. Unauthorized invalidation fails.
9. Repeated invalidation is safe and monotonic.
10. Subject/chain mismatch fails.
11. Event payload is correct.
12. Gate accepts valid passport.
13. Gate rejects invalid passport.
14. Gate rejects expired passport.
15. Gate rejects replayed/duplicate lifecycle action.

### P3 exit criteria

This exact chain of proof exists:

```text
scan
  -> evidence hash
  -> attestation transaction
  -> registry read
  -> admission accepted
  -> invalidation transaction
  -> registry shows invalidated
  -> follow-up admission rejected
```

---

## 8. P4 — Watchtower Immune Response

**Window:** 2026-09-17 — 2026-09-22  
**Priority:** Critical for the immune-system claim  
**Owner role:** Watchtower/intelligence owner  
**Depends on:** P3

### P4.1 Select one monitored dependency

Choose one path in P0:

- target proxy implementation/admin;
- bridge implementation/admin;
- origin/mint authority.

The chosen path must be reproducible and supported by available evidence. A
deterministic configured fixture is acceptable for demonstration only when it is
clearly labeled.

### P4.2 Capture dependency baseline

Store:

- dependency identity;
- dependency type;
- subject;
- chain ID;
- before state;
- evidence hash;
- block/time;
- observed status;
- snapshot/attestation references.

### P4.3 Detect change

Change event must include:

- immutable event ID;
- correlation ID;
- causation ID;
- before/after state;
- change hash;
- materiality;
- evidence references;
- confidence;
- limitation.

Replaying the same change must not create another event.

### P4.4 Invalidate trust

Required state transition:

```text
passport CURRENT
  -> dependency change
  -> passport STALE or INVALIDATED
  -> attestation NOT_USABLE
```

Required reason codes:

```text
DEPENDENCY_CHANGED
ATTESTATION_INVALIDATED
CRITICAL_EVIDENCE_STALE
```

### P4.5 Re-evaluate admission

The same admission request after invalidation must return:

```text
REVIEW_REQUIRED
or
BLOCK
```

It must never remain `ALLOW` because an earlier result was cached.

### P4.6 Project blast radius

Show:

- changed dependency;
- directly affected asset;
- directly affected passport;
- directly affected integration;
- admission decisions affected;
- evidence basis;
- confidence;
- limitation.

Separate:

```text
DIRECTLY OBSERVED IMPACT
INFERRED IMPACT
```

### P4.7 Incident and delivery

Existing Watchtower delivery, retry, dead-letter, and replay boundaries should
be used. The event timeline must show:

```text
ALLOW attestation created
  -> dependency change observed
  -> evidence comparison completed
  -> passport invalidated
  -> next admission rejected/escalated
  -> integration marked for review
```

### P4 acceptance criteria

1. Demo begins with `ALLOW`.
2. A meaningful dependency change is detected.
3. A single immutable event is created.
4. Passport becomes stale or invalidated.
5. Attestation is no longer usable.
6. Follow-up admission is not `ALLOW`.
7. UI identifies the exact changed field/dependency.
8. Evidence basis and limitation are visible.
9. Replaying the same change does not duplicate the event.
10. Observed and inferred impact are visibly different.

### P4 exit criteria

JOBEN demonstrates containment, not only detection:

```text
accepted trust
  -> trust path changes
  -> old trust is revoked
  -> downstream action is blocked or escalated
```

---

## 9. P5 — Product Surface and Competition Polish

**Window:** 2026-09-23 — 2026-09-27  
**Priority:** High  
**Owner role:** Product/UI owner  
**Depends on:** P1–P4

### P5.1 Immune System overview

Display:

- current Arbitrum network;
- chain ID;
- environment label;
- current policy;
- latest decision;
- active/stale/invalidated passports;
- dependency changes;
- affected integrations;
- evidence freshness;
- provider degradation.

### P5.2 Agent Simulator

Input:

- instruction;
- actor type;
- asset;
- amount;
- destination;
- expected spender;
- unsigned transaction;
- policy.

Output:

- decoded selector and operation;
- permission exposure;
- evidence;
- provenance;
- decision;
- reason codes;
- policy version;
- freshness;
- limitation.

### P5.3 Decision Review

The evaluator must be able to compare:

```text
Declared:
  Deposit 500 USDC

Actual:
  Approve MAX_UINT256 to spender X

Policy:
  AI_AGENT_CONSERVATIVE v1.0.0

Decision:
  BLOCK

Reasons:
  APPROVAL_EXCEEDS_INTENT
  UNLIMITED_APPROVAL
  UPGRADEABLE_SPENDER
```

### P5.4 Permission Exposure

Show:

- declared amount;
- actual allowance;
- exposure delta;
- spender/operator;
- spender known/unknown;
- upgradeability;
- expiry;
- risk reason;
- evidence status.

### P5.5 Origin/Bridge graph

Show:

- origin chain;
- origin contract;
- bridge;
- Arbitrum representation;
- target integration;
- authority/admin;
- status per edge;
- evidence source;
- observed/inferred/configured label;
- limitation.

### P5.6 Passport verification

Display:

- passport ID;
- subject;
- chain ID;
- decision;
- policy/version;
- evidence hash;
- issued at;
- expiry;
- invalidation;
- registry address;
- transaction link;
- gate verification result.

### P5.7 Watchtower incident view

Display:

- baseline state;
- changed dependency;
- before/after evidence;
- invalidation status;
- affected assets;
- affected integrations;
- next admission result;
- observed/inferred distinction.

### P5.8 Judge Mode

Default flow:

```text
1. Instruction
2. Dangerous transaction
3. BLOCK
4. Compliant transaction
5. ALLOW
6. Dependency replay
7. INVALIDATED
8. Admission rejected
```

Targets:

- problem understood in 20 seconds;
- dangerous transaction blocked within 90 seconds;
- full demo in approximately 2 minutes;
- evidence traceable from decision to chain record.

### P5.9 UX and localization

Every new user-facing module must ship in English and Bahasa Indonesia.

Required states:

- loading;
- empty;
- partial;
- stale;
- unavailable;
- provider error;
- invalid chain;
- unsupported selector;
- fixture/demo;
- testnet;
- mainnet.

Do not show unsupported buttons or imply that a future capability already
exists.

### P5 exit criteria

- Desktop and mobile paths work.
- Dangerous and compliant paths are visually distinct.
- The Arbitrum role is immediately clear.
- Network support is presented as provenance context.
- No absolute safety claims appear.
- Evidence can be followed from decision to public chain record.

---

## 10. P6 — Submission Hardening

**Window:** 2026-09-28 — 2026-10-04  
**Priority:** Release-critical  
**Owner role:** Release owner  
**Depends on:** P1–P5

### P6.1 Full verification suite

Run:

- existing unit and architecture tests;
- intent decoder tests;
- permission tests;
- policy boundary tests;
- provenance tests;
- contract tests;
- admission gate tests;
- invalidation tests;
- integration tests;
- localization completeness tests;
- visual tests;
- clean-install verification.

### P6.2 Required integration scenarios

The following scenarios must be reproducible from a fresh state:

1. Valid deposit with capped approval returns `ALLOW`.
2. Unlimited approval returns `BLOCK`.
3. Approval greater than intent returns `BLOCK`.
4. Wrong recipient returns `BLOCK`.
5. Unknown calldata returns explicit review/unavailable.
6. Unknown origin returns `REVIEW_REQUIRED` under conservative policy.
7. Provider conflict never returns silent `ALLOW`.
8. Expired attestation is rejected by the gate.
9. Dependency change invalidates the passport.
10. Repeated invalidation is idempotent.
11. Workspace isolation prevents cross-tenant access.
12. Provider outage degrades evidence without silently passing policy.

### P6.3 Security verification

Inspect:

- every authorization write path;
- workspace/tenant isolation;
- replay and idempotency;
- secret redaction;
- input size limits;
- graph inference limitations;
- AI output separation from machine decision;
- public verification redaction;
- issuer role and deployment controls;
- chain binding;
- testnet/mainnet separation.

### P6.4 Operational verification

Confirm:

- development memory queue is not used for production;
- PostgreSQL configuration is explicit for production;
- queue retry/dead-letter behavior is documented;
- provider outage behavior is observable;
- readiness and health behavior are documented;
- deployment can be repeated from a clean environment;
- failed external provider does not corrupt decision state;
- on-chain transaction links remain accessible.

### P6.5 Competition evidence package

Create a documented package containing:

1. official rule reference and check date;
2. participant/team confirmation;
3. selected network and chain ID;
4. contract source;
5. compiler and dependency versions;
6. registry deployment address and transaction;
7. admission gate address and transaction;
8. source verification status;
9. attestation transaction;
10. invalidation transaction;
11. admission success result;
12. admission rejection result;
13. explorer URLs;
14. screenshots or recording;
15. testnet/mainnet labels;
16. known limitations;
17. workshop/feedback participation log.

### P6.6 Demo recovery path

If an external provider is unavailable:

- use a frozen evidence fixture;
- label it `DEMO FIXTURE`;
- do not mix fixture fields into a live report;
- preserve the same decision semantics;
- show degraded provider status;
- document what is simulated and what is live.

### P6 exit criteria

P6 is complete when an evaluator unfamiliar with the repository can:

1. open the application;
2. select the agent scenario;
3. run the dangerous transaction simulation;
4. see why it is blocked;
5. run the compliant transaction;
6. see why it is allowed;
7. open the Passport;
8. open the Arbitrum transaction;
9. replay the dependency change;
10. see invalidation;
11. see affected integrations;
12. observe the next admission rejection/escalation.

---

## 11. API and Data Contract Summary

### 11.1 Required resource surface

```text
POST /api/v1/intent-checks
GET  /api/v1/intent-checks/{decisionId}
POST /api/v1/intent-checks/{decisionId}/attest
GET  /api/v1/passports/{passportId}
GET  /api/v1/passports/{passportId}/verify
GET  /api/v1/provenance/{chainId}/{address}
GET  /api/v1/blast-radius/{subjectId}
POST /api/v1/watchtower/replay-change
GET  /api/v1/policies
```

Route names may follow existing conventions, but resource semantics must remain
stable.

### 11.2 API invariants

- Workspace comes from authenticated context.
- Client cannot override workspace, role, plan, or policy definition.
- Intent checks are idempotent.
- Decision output is versioned.
- Provider failures are explicit.
- Missing evidence cannot silently produce `ALLOW`.
- Public verification never exposes private workspace metadata.
- Raw credentials never appear in URLs, reports, logs, or client bundles.

### 11.3 Versioning

Version independently:

- intent schema;
- transaction schema;
- decision schema;
- evidence schema;
- policy version;
- canonical hash version;
- contract version;
- UI copy where semantic meaning changes.

Changing a reason code meaning requires a version decision and migration plan.

---

## 12. Supporting Network Strategy

### 12.1 What other networks are allowed to do

Other networks may provide:

- origin contract evidence;
- bridge relationship evidence;
- deployer history;
- funding relationship;
- cross-network repeated behavior;
- comparison;
- provenance context.

### 12.2 What other networks should not do in the critical path

Do not make MVP completion depend on:

- full support parity for every network;
- new execution/admission deployments on other chains;
- full cross-chain graph indexing;
- automatic bridge discovery;
- multichain wallet routing;
- cross-chain transaction submission.

### 12.3 Product presentation

The UI should say:

```text
Decision executed for Arbitrum.
Supporting provenance observed across configured networks.
```

It should not present all networks as equally important execution targets in the
competition path.

---

## 13. Risk Register and Response Plan

| Risk | Severity | Detection | Required response |
|---|---:|---|---|
| Scope expands beyond one vertical slice | Critical | New feature enters critical path without gate | Defer to post-MVP |
| Product looks like provider aggregation | High | Demo starts with provider/risk dashboard | Start with agent intent and actual calldata |
| Arbitrum relevance is cosmetic | Critical | No product call to deployed Arbitrum contract | Block release until registry/gate path works |
| Sepolia is not accepted | Critical | Official rule remains unclear | Deploy separately to Arbitrum One |
| Unknown becomes `ALLOW` | Critical | Policy tests pass missing data | Add explicit deny/review policy boundary |
| Provider outage breaks demo | High | Live evidence unavailable | Use labeled fixture and degraded-state path |
| Bridge provenance is inferred incorrectly | High | Edge lacks evidence basis | Return UNKNOWN/PARTIAL/CONFLICT |
| Smart contract becomes unnecessarily complex | Medium | Upgradeability or custody added | Remove from MVP and re-review |
| Issuer credential compromised | Critical | Unauthorized write/invalidation | Rotate key, invalidate affected records, use secret manager |
| Old attestation remains usable after change | Critical | Admission still accepts stale record | Fail release gate and repair invalidation linkage |
| UI overwhelms evaluator | Medium | Core path requires multiple unrelated pages | Use Judge Mode and progressive disclosure |
| AI changes machine decision | Critical | LLM output used in policy branch | Separate explanatory text from deterministic evaluator |
| Testnet data presented as production | High | Environment label missing | Show network/environment on every relevant surface |
| PostgreSQL/queue assumptions are false in production | High | Production uses memory driver | Reject production startup and document configuration |
| Cross-tenant decision leak | Critical | Workspace ID accepted from caller | Use server-side authorization and isolation tests |

---

## 14. Release Gates

### Gate A — Intent safety

- transaction is decoded;
- permission exposure is visible;
- declared intent can disagree with actual calldata;
- unsafe approval is blocked;
- unknown decode is explicit.

### Gate B — Evidence decision

- Arbitrum target validated;
- chain ID and block reference captured;
- evidence freshness visible;
- policy version visible;
- conflict/unavailable states preserved;
- decision deterministic and replayable.

### Gate C — On-chain proof

- registry deployed;
- attestation written;
- verification reads chain state;
- duplicate/expiry/invalidation/authorization tests pass;
- admission gate consumes registry state.

### Gate C1 — Eligibility

- official rule source and date recorded;
- participant/team registration complete;
- accepted network resolved;
- required chain has live product contract;
- deployment transaction public;
- product behavior calls deployed contract;
- no credentials exposed;
- evidence package complete.

### Gate D — Immune response

- monitored change detected;
- passport invalidated;
- blast radius produced;
- subsequent admission blocked/escalated;
- event append-only and replay-safe.

### Gate E — Submission

- clean run from documentation;
- responsive UI;
- English and Bahasa Indonesia;
- no secret leakage;
- two-minute demo;
- architecture and limitation documents;
- contract addresses and explorer links;
- workshop/feedback log;
- final rule check complete.

If a mandatory item is incomplete:

```text
Release status = NOT COMPLIANT
```

---

## 15. Explicit Non-Goals for This Roadmap

The following are not part of the competition MVP:

- real fund custody;
- transaction submission;
- automatic fund recovery;
- financial recommendations;
- full Arbitrum graph indexing;
- all bridges;
- fully autonomous AI agent;
- decentralized validator network;
- token/DAO/staking mechanics;
- arbitrary smart-contract execution;
- LLM-generated risk or policy outcome;
- wallet connection as release blocker;
- replacing the existing multichain engine;
- replacing PostgreSQL direction;
- deployment to every supported network.

---

## 16. Post-MVP Backlog

Only after Gates A–E are complete:

### Next

- real wallet adapter;
- agent platform SDK;
- additional Arbitrum bridge adapters;
- protocol-specific policy templates;
- webhook decision alerts;
- signed public decision packets;
- richer allowance and permit simulation.

### Later

- full dependency graph;
- transaction trace simulation;
- L1/L2 message and retryable-ticket context;
- cross-protocol blast-radius indexing;
- agent capability passports;
- Orbit deployment profile;
- independent attestation issuers;
- dispute workflow.

### Never infer without evidence

- common ownership;
- malicious intent;
- exploit certainty;
- financial outcome;
- safety guarantee.

---

## 17. Final Definition of Done

The roadmap is successfully implemented only when all of the following are
true:

```text
1. An agent declares:
   Deposit 500 USDC into an Arbitrum vault.

2. JOBEN receives an unsigned transaction.

3. JOBEN decodes the actual operation.

4. JOBEN measures permission exposure.

5. JOBEN validates Arbitrum target and evidence.

6. JOBEN evaluates a versioned policy.

7. Unlimited approval is returned as BLOCK.

8. Capped approval is returned as ALLOW.

9. The ALLOW decision is attested on Arbitrum.

10. Admission gate accepts the valid attestation.

11. A monitored dependency changes.

12. Watchtower creates a deduplicated change event.

13. The passport and attestation are invalidated.

14. The same admission request is rejected or escalated.

15. The UI shows the changed dependency and affected integration.

16. Evidence, chain ID, policy, freshness, and limitations are visible.

17. The full path is reproducible from a clean environment.

18. All mandatory eligibility evidence is public and complete.
```

The project must not be described as competition-ready until this definition of
done and Gates A–E are satisfied.
