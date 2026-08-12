# CA X-RAY — Phase 0 architecture contract

Phase 0 establishes the boundaries required for a production deployment without
changing the forensic scoring rubric.

## Confirmed targets

- 100,000 monthly active users
- 2,000 concurrent users
- 300 scans/minute
- RPO 15 minutes / RTO 1 hour
- 99.9% availability SLO
- Node.js 24 LTS

The API contract is stateless: a request validates input and creates a scan job.
The scan processor runs outside the synchronous request path and returns a job
resource that the client polls. The current development queue is intentionally
in-memory so the imported project runs without inventing an external service.
Production must set `SCAN_QUEUE_DRIVER` to a shared durable queue adapter before
deployment; startup rejects the development-only queue in `NODE_ENV=production`.

## Boundaries

### Core engine

`src/engine.js` owns normalization, evidence semantics, risk scoring, reliability,
findings, and report shape. It does not know about users, workspaces, billing, or
HTTP job lifecycle.

### Provider adapters

`src/providers/registry.js` defines the adapter contract. GoPlus Security and
DexScreener are registered as the initial adapters. New providers must implement
`id`, `source`, `fetch(context)`, and `apply(scan, response, context)`; the scoring
engine should not be changed just to add a provider.

### Job boundary

`src/jobs/scan-queue.js` defines the job states `QUEUED`, `RUNNING`, `SUCCEEDED`,
and `FAILED`. The development adapter is process-local. A production adapter must
provide durable enqueue/get semantics, visibility timeout, retry policy, and
dead-letter handling so API replicas remain stateless.

### Identity, workspaces, and billing

Clerk is provisioned as the authentication provider. The policy contract supports
personal Free/Pro workspaces and paid Team/Enterprise workspaces. Stripe remains
the billing provider boundary, but paid checkout and webhook sync are disabled
until the Stripe connection is authorized; no placeholder price IDs or secrets
are used.

## Recovery and scale notes

- RPO 15 minutes requires durable database backups or point-in-time recovery.
- RTO 1 hour requires a documented restore/runbook and a tested queue replay path.
- 99.9% requires health/readiness checks, metrics, alerting, and rolling deploys.
- 300 scans/minute requires a shared queue plus independently scalable workers;
  worker concurrency is configurable and defaults to 64 in production.