# JOBEN NETWORK

JOBEN NETWORK is an evidence-based crypto contract forensic analyzer. It accepts an EVM contract address or a Solana public key, validates the selected supported network, and produces either a clearly labeled deterministic demo report or a LIVE report assembled from protocol-appropriate evidence.

## Run

```bash
npm run dev
```

The app listens on port 5000 and targets Node.js 20 LTS (the Replit runtime). Run the deterministic engine and architecture checks with:

```bash
npm test
```

## Product boundaries

- No wallet connection, private keys, signatures, transactions, trading, or financial recommendations.
- Unknown, unavailable, and provider-error values remain explicitly labeled and are never converted to zero.
- Demo fixtures never mix with live provider data.
- Risk score and reliability score are separate calculations.
- Risk scoring never redistributes unknown category weight. Reports expose `score_range` and `unscored_weight_pct`; available-data risk is separated from coverage.
- GoPlus Security is the active capability provider, DexScreener is the active market-pair provider, and Blockscout plus public JSON-RPC provide shared ABI, ownership, creator, deployment, and holder evidence when available. DexScreener does not provide holders, decimals, ABI/source verification, or ownership. GoPlus capability positives without independent verified ABI confirmation are `UNVERIFIED_SIGNAL` with LOW interpretation confidence.
- `pairCreatedAt` is displayed as Pair Age, never Contract Age. Missing decimals/holders/capabilities use explicit unavailable/not-checked semantics rather than guessed defaults.
- Phase 0 targets 100,000 MAU, 2,000 concurrent users, 300 scans/minute, RPO 15 minutes, RTO 1 hour, and 99.9% availability.
- Live scans use an asynchronous job contract; development uses a local queue while production supports the PostgreSQL durable queue with leases, bounded retries, and dead-letter records.
- Clerk is provisioned for authentication. Stripe is the planned billing provider, but paid checkout remains disabled until its connection is authorized.
- Phase 1 security contract is documented in `DOC/PHASE-1-SECURITY.md`. Workspace scope is assigned server-side, never accepted from request bodies.
- Phase 4 authentication and tenant isolation are implemented in `src/auth/service.js`: opaque signed/revocable sessions, password hashing, one-time recovery and workspace invites, server-side membership authorization, ownership transfer, audit events, and encrypted TOTP MFA for superadmins. Development uses the memory auth store; PostgreSQL auth uses the Phase 4 migration.
- Phase 4 status and release sign-off checklist are documented in `DOC/PHASE-4-CONFIRMATION.md`: the current implementation is a tested foundation, while production readiness still requires identity, email, durable queue, abuse-resistance, lifecycle, and operations gates.
- Phase 4 private routes fail closed across workspace boundaries. Superadmins are platform-scoped and cannot select or access a workspace through workspace routes.
- Scan requests enforce bounded request size, multi-dimensional rate protection, monthly plan quota, concurrent-scan limits, idempotency, and append-only audit events.
- Provider calls use a server-controlled HTTPS allowlist, strict adapter response validation, timeout/retry budgets, and circuit breakers. LIVE data is never replaced with DEMO data.
- The catalog contains 53 networks. EVM entries with a verified public RPC use the `rpc-contract` adapter to prove bytecode exists on the selected chain; unsupported or unverified networks remain explicitly `unavailable`.
- Native adapters cover Solana, TON, Tron, XRPL, Starknet, Cosmos-based Sei/Injective/Celestia/Dymension/Kava, and Cardano. They validate chain-specific address encodings/checksums, verify account or contract state through the protocol's read-only public endpoint, attach protocol-specific evidence and explorer links, fail closed on not-found/provider errors, and state coverage limitations explicitly. Solana additionally reports mint and holder evidence; DexScreener remains market-only for native networks.
- Phase 2 uses a provider-agnostic pipeline: chain validation → replaceable adapter → canonical normalized evidence → evidence validation → forensic/risk/report engines. Provider result states are `valid`, `unknown`, `unavailable`, and `provider_error`.
- Live evidence keeps internal provenance (provider ID, adapter/schema/engine versions, retrieval time, confidence, and evidence reference), while public reports redact provider identity. Risk score, reliability score, and data status remain separate.
- Provider conflicts are explicit and excluded from silent scoring; missing, null, malformed, unavailable, and provider-error values never become zero, false, or a safe status.
- Production startup rejects in-memory queue and data-store drivers; configure PostgreSQL via `DATA_STORE_DRIVER=postgresql`, `SCAN_QUEUE_DRIVER=postgresql`, and `DATABASE_URL` before deployment. Operational details are in `doc/PHASE-1-OPERATIONS.md`.
- `/healthz` is liveness, `/readyz` verifies persistence/intelligence/queue readiness, and `/metrics` exposes JSON service telemetry.
- Phase 3 persistence is implemented through `src/persistence/index.js`: memory and PostgreSQL adapters share scan idempotency, usage, tenant-scoped job reads, webhook deduplication, outbox, and lifecycle metadata contracts.
- PostgreSQL schema and rollback are versioned in `migrations/001_phase3_persistence.sql` and `migrations/001_phase3_persistence.down.sql`; run `npm run db:migrate` with `DATABASE_URL` before using the PostgreSQL adapter.
- Phase 3 operations and backup/restore drill are documented in `DOC/PHASE-3-OPERATIONS.md`.
- Public/private route boundary: `/` is the public contract-entry page; `/login` and `/register` are authentication entry points; `/dashboard` and `/dashboard/scans/:scanId` are authenticated, workspace-scoped routes. A visitor's scan intent is held through authentication and is resumed without re-entering the form.
- Private scan history is available at `/api/scans` and only returns jobs for the authenticated workspace. Scan job reads require the same server-side workspace scope.
- The platform-scoped superadmin control plane is available at `/admin`: it provides live provider/network posture, runtime health, feature-flag drafts and publishing, four-eyes approvals, user/workspace inventory search, subscription/webhook signals, and an append-only audit view. All privileged reads and writes require a fresh MFA step-up and server-side platform RBAC.
- Phase 5 listing/compliance controls are available through tenant-scoped `/api/policies`, `/api/governance`, and `/api/cases/:caseId/compliance-review` routes. Policies are versioned and evidence checks preserve PASS/FAIL/UNKNOWN; reviews record an evidence register, require an independent approver, support APPROVE/CONDITIONAL/REJECT outcomes with expiry, and expose English plus Bahasa Indonesia report text. Active policies cannot be edited in place.
- Phase 6 Evidence API v1 is available at `/api/v1`: authenticated workspace owners can issue and revoke scoped API keys (the raw key is returned once), create/poll asynchronous scans, retrieve uncertainty-safe evidence bundles, request HMAC-SHA256 signed reports, and inspect usage metering. The dependency-free client is served from `/sdk.js`; bundles preserve UNKNOWN, UNAVAILABLE, UNVERIFIED, CONFLICT, and VERIFIED states rather than inferring safety.
- Phase 7 network intelligence is available at `/api/network-intelligence`: completed LIVE snapshots record deployer and funding observations, build workspace-scoped funding clusters, compare observed contract behavior, identify repeated suspicious behavior, and surface cross-network deployer reuse as `INFERRED` hypotheses. Direct observations are labeled `OBSERVED`; no graph result claims common ownership or malicious intent without independent verification.

## User preferences

- Precision and evidence take priority over feature count.
- Keep the experience minimal, professional, forensic, and readable.

## Localization contract

- The supported product locales are English (`en`) and Bahasa Indonesia (`id`).
- Every new user-facing module must ship with both locales; do not add
  user-facing copy directly in a feature module without a locale key.
- Keep evidence IDs, status values, severity, confidence, API fields, and
  scoring language-neutral. Translate presentation copy at the UI/report layer.
- Preserve the exact distinction between unknown, unavailable, unverified,
  conflict, and verified states in every translation.
- Use standard technical terms consistently, adding the English term in
  parentheses when the Indonesian equivalent could be ambiguous.
- New locale support must extend the locale pack and shared formatters rather
  than branching product logic.