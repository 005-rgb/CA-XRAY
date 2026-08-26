# JOBEN NETWORK — Phase 0 Threat Model

This threat model covers the product/evidence boundary before transaction
decoding, attestation, and admission-gate implementation. Each control is a
design obligation for the phase that implements the affected capability.

| Threat | Failure mode | Required control |
|---|---|---|
| Intent spoofing | Caller changes actor, workspace, policy, or declared intent to make a transaction appear compliant | Derive workspace/authorization server-side; validate and bind intent identity, actor, chain, policy ID/version, and idempotency key |
| Malicious or ambiguous calldata | Unknown selector or shared selector is guessed as a safe operation | Use the explicit selector matrix; return `INTENT_DECODE_UNAVAILABLE` or human review; require target-standard evidence for `setApprovalForAll` |
| Replayed decision | An old decision is reused for a new transaction or chain | Bind the decision to chain, subject, policy, evidence snapshot, issue/expiry, and transaction identity; make replay/idempotency behavior explicit |
| Stale evidence | A previously valid control or market fact is used after its freshness window | Preserve retrieval time and family-specific freshness; map required stale evidence to `STALE_EVIDENCE`, never `ALLOW` |
| Provider conflict | Providers disagree on a material field and the disagreement is hidden by aggregation | Preserve field, values, provider references, conflict status, policy impact, and limitation; unresolved conflict cannot silently allow |
| Issuer compromise | Unauthorized actor creates or invalidates trust records | Isolate issuer authorization, audit all writes, use workspace/role controls, and keep deployment credentials outside the repository |
| Forged attestation | A client fabricates an evidence or policy hash | Canonicalize server-side, bind chain/subject/policy/snapshot, and verify registry issuer and lifecycle state on-chain |
| Chain/subject mismatch | Evidence or attestation from another network/address is accepted | Validate chain ID, subject, bytecode, and snapshot binding at every boundary; keep One and Sepolia records separate |
| False provenance inference | Similar addresses or shared deployers are presented as a bridge relationship | Only use configured/directly observed/explicitly inferred edges with basis and limitation; otherwise return `UNKNOWN` |
| AI text influences machine decision | Generated explanation overrides deterministic policy result | Keep explanation as a presentation field; machine decision is computed only from normalized inputs, evidence, and policy |
| Public verification data leakage | Public report exposes workspace metadata, raw calldata, or credentials | Redact private workspace metadata and secrets; expose only the minimum public verification fields; never log keys or seed phrases |

## Security invariants

1. Missing, unknown, unavailable, unverified, partial, stale, or conflicting
   evidence is never silently converted into `ALLOW`.
2. A fixture is always labeled `DEMO FIXTURE` and never mixed with a `LIVE`
   evidence bundle.
3. Arbitrum One and Arbitrum Sepolia are separate network profiles and
   deployment records.
4. The policy catalog is server-controlled; callers cannot provide policy
   definitions or privilege overrides.
5. No private key, seed phrase, API key, raw secret, or sensitive credential is
   allowed in the repository, logs, screenshots, reports, or public bundles.