# CA X-RAY

CA X-RAY is an evidence-based crypto contract forensic analyzer. It accepts an EVM contract address, validates the selected supported network, and produces either a clearly labeled deterministic demo report or a LIVE report assembled from GoPlus Security and DexScreener data.

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
- GoPlus Security is the active capability/ownership provider; DexScreener is the active market-pair provider. DexScreener does not provide holders, decimals, ABI/source verification, or ownership. GoPlus capability positives without independent verified ABI confirmation are `UNVERIFIED_SIGNAL` with LOW interpretation confidence.
- `pairCreatedAt` is displayed as Pair Age, never Contract Age. Missing decimals/holders/capabilities use explicit unavailable/not-checked semantics rather than guessed defaults.
- Phase 0 targets 100,000 MAU, 2,000 concurrent users, 300 scans/minute, RPO 15 minutes, RTO 1 hour, and 99.9% availability.
- Live scans use an asynchronous job contract; the development queue is local only and production requires a shared durable queue.
- Clerk is provisioned for authentication. Stripe is the planned billing provider, but paid checkout remains disabled until its connection is authorized.
- Phase 1 security contract is documented in `DOC/PHASE-1-SECURITY.md`. Workspace scope is assigned server-side, never accepted from request bodies.
- Phase 4 authentication and tenant isolation are implemented in `src/auth/service.js`: opaque signed/revocable sessions, password hashing, one-time recovery and workspace invites, server-side membership authorization, ownership transfer, audit events, and encrypted TOTP MFA for superadmins. Development uses the memory auth store; PostgreSQL auth uses the Phase 4 migration.
- Phase 4 status and release sign-off checklist are documented in `DOC/PHASE-4-CONFIRMATION.md`: the current implementation is a tested foundation, while production readiness still requires identity, email, durable queue, abuse-resistance, lifecycle, and operations gates.
- Phase 4 private routes fail closed across workspace boundaries. Superadmins are platform-scoped and cannot select or access a workspace through workspace routes.
- Scan requests enforce bounded request size, multi-dimensional rate protection, monthly plan quota, concurrent-scan limits, idempotency, and append-only audit events.
- Provider calls use a server-controlled HTTPS allowlist, strict adapter response validation, timeout/retry budgets, and circuit breakers. LIVE data is never replaced with DEMO data.
- Phase 2 uses a provider-agnostic pipeline: chain validation → replaceable adapter → canonical normalized evidence → evidence validation → forensic/risk/report engines. Provider result states are `valid`, `unknown`, `unavailable`, and `provider_error`.
- Live evidence keeps internal provenance (provider ID, adapter/schema/engine versions, retrieval time, confidence, and evidence reference), while public reports redact provider identity. Risk score, reliability score, and data status remain separate.
- Provider conflicts are explicit and excluded from silent scoring; missing, null, malformed, unavailable, and provider-error values never become zero, false, or a safe status.
- Production startup rejects in-memory queue and data-store drivers; configure PostgreSQL via `DATA_STORE_DRIVER` and a shared queue via `SCAN_QUEUE_DRIVER` before deployment.
- Phase 3 persistence is implemented through `src/persistence/index.js`: memory and PostgreSQL adapters share scan idempotency, usage, tenant-scoped job reads, webhook deduplication, outbox, and lifecycle metadata contracts.
- PostgreSQL schema and rollback are versioned in `migrations/001_phase3_persistence.sql` and `migrations/001_phase3_persistence.down.sql`; run `npm run db:migrate` with `DATABASE_URL` before using the PostgreSQL adapter.
- Phase 3 operations and backup/restore drill are documented in `DOC/PHASE-3-OPERATIONS.md`.
- Public/private route boundary: `/` is the public contract-entry page; `/login` and `/register` are authentication entry points; `/dashboard` and `/dashboard/scans/:scanId` are authenticated, workspace-scoped routes. A visitor's scan intent is held through authentication and is resumed without re-entering the form.
- Private scan history is available at `/api/scans` and only returns jobs for the authenticated workspace. Scan job reads require the same server-side workspace scope.
- The platform-scoped superadmin control plane is available at `/admin`: it provides live provider/network posture, runtime health, feature-flag drafts and publishing, four-eyes approvals, user/workspace inventory search, subscription/webhook signals, and an append-only audit view. All privileged reads and writes require a fresh MFA step-up and server-side platform RBAC.

## User preferences

- Precision and evidence take priority over feature count.
- Keep the experience minimal, professional, forensic, and readable.