# CA X-RAY — Phase 1 security contract

The uploaded Phase 1 decisions are approved and locked. This document is the
implementation/acceptance record for those decisions.

## Trust boundaries

1. The browser is an untrusted client. `workspace_id`, role, plan, provider
   URL, and authorization claims from request bodies are never used as authority.
2. The HTTP boundary validates network and EVM address format before a scan job
   is created. The address is data only; it is never used to construct an
   arbitrary URL.
3. Provider APIs are external untrusted inputs. The provider registry validates
   adapter contracts and every response is schema-validated before `apply`
   reaches the deterministic engine.
4. The analyzer boundary remains
   provider data → normalized evidence → risk rules → score → report.
   Authentication, billing, and workspace policy are outside the engine.
5. The queue is a job boundary. A job carries a server-created workspace scope
   and its status can only be read through the matching scope.

## Tenant and permission rules

- Private and restricted records require an exact `workspace_id` match on every
  read/write/update/delete/export/history operation.
- A visitor receives a server-created, signed ephemeral workspace for public
  scan isolation. A future Clerk-authenticated user maps to a server-created
  personal workspace; the client cannot choose that mapping.
- Personal workspaces allow Free/Pro. Team workspaces allow Team/Enterprise.
- Workspace owners manage membership and billing; members can scan/read/export.
- Superadmin is a platform role and is deliberately not granted workspace
  permissions. Platform actions need a separate audited path.
- Support Admin and Read-only Auditor permissions are read/audit-oriented and
  do not grant mutation rights.

The complete role/action matrix is implemented in `src/security/policy.js`.

## Provider failure policy

- Provider URLs are fixed server-side allowlisted HTTPS origins.
- Calls have a bounded timeout, at most two retries, and a circuit breaker.
- Malformed, unavailable, timeout, and rate-limited provider data remain explicit
  errors/limitations. LIVE data is never replaced with DEMO data.
- DexScreener `pairs: null` is a valid “no pair” response; it is handled as
  unavailable pair evidence, not as malformed provider data.

## Runtime controls

The scan boundary enforces:

- request-size limit;
- IP, user, workspace, and API-client rate dimensions;
- plan monthly quota and workspace concurrent-scan limit;
- deterministic duplicate suppression plus `Idempotency-Key` support;
- append-only audit events for scan creation;
- queue capacity protection.

The in-process stores are development adapters only. Production must provide
PostgreSQL as the primary source of truth (`DATA_STORE_DRIVER`), a durable
shared queue (`SCAN_QUEUE_DRIVER`), and the Clerk integration before enabling
authenticated private workspaces. No API/provider secret is persisted in the
database or browser.

## Data classification

- **Public:** network registry, plan metadata, fixed demo fixtures.
- **Private:** workspace membership, scan history, saved reports, billing
  references and exports; always scoped by workspace.
- **Restricted:** audit events, support access records, provider configuration,
  security incidents; append-only or separately authorized.
- **Secret:** Clerk/Stripe/provider credentials, session signing material, and
  private keys; environment/secret management only, never application records.

## Security acceptance criteria

- [x] The six Phase 1 gate decisions are explicit and locked.
- [x] Workspace scope is required and mismatches are rejected server-side.
- [x] Superadmin is outside normal workspace authorization.
- [x] Provider response validation and controlled URL checks run before analysis.
- [x] Timeout, bounded retry, circuit-breaker, rate, quota, queue, and
  idempotency controls are implemented.
- [x] Live provider failures remain UNAVAILABLE/PARTIAL/INSUFFICIENT DATA.
- [x] Address validation is chain/network-bound and never becomes executable input.
- [x] Normal application code cannot mutate the audit log.
- [ ] PostgreSQL persistence, Clerk claims verification, durable queue,
  encrypted backup/restore, deletion/export workers, and payment webhook
  idempotency require their production adapters/integrations; this import has
  no authorized external integration and therefore does not invent them.

## Recovery and retention procedure contract

Production operations must configure PostgreSQL point-in-time backups meeting
the 15-minute RPO, a tested restore and queue-replay runbook meeting the
1-hour RTO, encrypted backups, and explicit retention/deletion jobs. Account
deletion and workspace deletion must tombstone access first, export only
workspace-scoped records, then delete according to the configured retention
policy. These operations must emit restricted audit events.