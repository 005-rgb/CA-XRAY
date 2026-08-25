# Phase 1 Operations

## Runtime modes

Development intentionally uses:

- `DATA_STORE_DRIVER=memory`
- `SCAN_QUEUE_DRIVER=memory`

Production must use:

- `DATA_STORE_DRIVER=postgresql`
- `SCAN_QUEUE_DRIVER=postgresql`
- `DATABASE_URL`
- a configured production identity and email provider

The application fails closed during production startup if a development-only
driver is selected.

## Database rollout

1. Provision PostgreSQL and configure `DATABASE_URL` through the workspace
   environment/secrets flow.
2. Run `npm run db:migrate`.
3. Confirm `/readyz` reports `status=ready`, `storage=postgresql`, and
   `queue=postgresql`.
4. Keep the previous migration version available for rollback. The durable
   queue migration adds payload, lease, and dead-letter fields without
   rewriting existing scan reports.

## Durable queue behavior

The PostgreSQL queue uses row locking with `FOR UPDATE SKIP LOCKED`, a worker
lease, bounded attempts, timeout cancellation, and terminal dead-letter
records. An expired lease can be reclaimed by another worker. API replicas do
not need to share process memory.

## Health and telemetry

- `/healthz` is a lightweight process liveness check.
- `/readyz` verifies persistence, intelligence state loading, and queue startup.
- `/metrics` exposes JSON operational counters for the current service process.
- `/api/admin/overview` combines queue, scan, provider, and platform telemetry
  for an authenticated platform operator.

The current JSON metrics endpoint is intentionally dependency-free. Exporting
to an external metrics backend belongs to the deployment integration step.

## Shutdown and recovery

SIGTERM/SIGINT stops new HTTP work, stops the watchtower timer, aborts local
worker controllers, closes the queue/database pool, and exits after a bounded
grace period. A worker that dies before releasing its lease is recoverable
after `lease_until` expires.

## Release gate

Before a B2B pilot, run a restore drill, verify queue replay from a dead-letter
record, exercise a provider timeout, and confirm that a report remains
tenant-scoped after restart.