# Watchtower recovery runbook

This runbook keeps evidence and alert idempotency intact while recovering the
worker, provider, queue, or notification channels.

## Invariants

- Never delete a snapshot, alert, delivery attempt, or dead-letter to recover.
- Reclaim only after the lease has expired. A retry uses the same `runId`,
  `windowKey`, pulse correlation, and evidence hash.
- A dead-letter is replayed explicitly after its cause is understood.
- Provider `UNAVAILABLE`, `UNKNOWN`, `CONFLICT`, and `UNVERIFIED` remain visible;
  they are not converted to no-change or zero.

## Drill matrix

| Failure | Operator action | Success signal |
|---|---|---|
| Worker crash | Restart the worker and wait for lease expiry | One run is reclaimed; no second pulse/alert |
| Provider timeout/outage | Check provider policy, keep run retryable, then replay if needed | Health is degraded; run retains structured error |
| Queue backlog | Reduce intake or increase bounded workers; do not bypass claims | Queue depth falls and due lag is measurable |
| Duplicate tick | Run the tick again | Existing `targetId + windowKey` returns the same run |
| Clock skew | Correct worker clock and inspect due lag | Future windows are not claimed early |
| Retry exhaustion | Inspect the dead-letter reason, repair cause, replay explicitly | Run leaves DLQ once; alert remains deduplicated |
| Database restart | Restart the application after the database is healthy | Queued and leased work is recovered from durable state |
| Email failure | Keep in-app alert; fix consent/provider and replay delivery | Delivery state changes independently of alert state |
| Webhook 4xx | Do not auto-retry permanent 4xx; repair endpoint, then replay | No retry storm; signing remains verifiable |
| Webhook 5xx | Allow bounded exponential retry | Terminal DLQ after max attempts |
| DNS/IP change | Revalidate HTTPS endpoint and private-address policy | No SSRF exposure; failed attempt is auditable |

## Operational measurements

Record due-to-run p95, run latency p95, stale rate, retry rate, dead-letter
rate, delivery success by channel, and recovery time. Review false-confidence
cases separately from risk score and never use a healthy queue as evidence that a
contract is safe.