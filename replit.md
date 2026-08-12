# CA X-RAY

CA X-RAY is an evidence-based crypto contract forensic analyzer. It accepts an EVM contract address, validates the selected supported network, and produces either a clearly labeled deterministic demo report or a LIVE report assembled from GoPlus Security and DexScreener data.

## Run

```bash
npm run dev
```

The app listens on port 5000 and targets Node.js 24 LTS. Run the deterministic engine and architecture checks with:

```bash
npm test
```

## Product boundaries

- No wallet connection, private keys, signatures, transactions, trading, or financial recommendations.
- Unknown, unavailable, and provider-error values remain explicitly labeled and are never converted to zero.
- Demo fixtures never mix with live provider data.
- Risk score and reliability score are separate calculations.
- Phase 0 targets 100,000 MAU, 2,000 concurrent users, 300 scans/minute, RPO 15 minutes, RTO 1 hour, and 99.9% availability.
- Live scans use an asynchronous job contract; the development queue is local only and production requires a shared durable queue.
- Clerk is provisioned for authentication. Stripe is the planned billing provider, but paid checkout remains disabled until its connection is authorized.
- Phase 1 security contract is documented in `DOC/PHASE-1-SECURITY.md`. Workspace scope is assigned server-side, never accepted from request bodies.
- Scan requests enforce bounded request size, multi-dimensional rate protection, monthly plan quota, concurrent-scan limits, idempotency, and append-only audit events.
- Provider calls use a server-controlled HTTPS allowlist, strict adapter response validation, timeout/retry budgets, and circuit breakers. LIVE data is never replaced with DEMO data.
- Production startup rejects in-memory queue and data-store drivers; configure PostgreSQL via `DATA_STORE_DRIVER` and a shared queue via `SCAN_QUEUE_DRIVER` before deployment.

## User preferences

- Precision and evidence take priority over feature count.
- Keep the experience minimal, professional, forensic, and readable.