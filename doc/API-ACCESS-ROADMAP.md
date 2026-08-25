# JOBEN NETWORK — API Access Core Module Roadmap

---

Version: 1.0  
Last updated: 2026-08-25  
Status: Draft for implementation planning  
Owner: Evidence Platform + Security  
Parent product: Core Scan / Risk Passport / Shared Report  
Primary surface: `/api/v1` and API Access workspace

---

## 1. Ringkasan eksekutif

API Access adalah boundary paling penting antara evidence JOBEN NETWORK dan
sistem eksternal. Ia bukan sekadar endpoint untuk membuat scan. Ia adalah
**Evidence Trust Boundary** yang memastikan setiap consumer:

- hanya dapat mengakses workspace dan resource yang sah;
- hanya dapat melakukan operasi sesuai scope;
- menerima evidence yang versioned, uncertainty-safe, dan provenance-aware;
- memahami perbedaan risk, reliability, coverage, freshness, dan confidence;
- dapat mengulang request tanpa duplicate scan atau duplicate charge;
- dapat memverifikasi report dan mendeteksi perubahan payload;
- dapat mengoperasikan integrasi secara aman selama bertahun-tahun.

**Ide brilian utama:** API Access menjadi **Evidence Contract Firewall**. Setiap
response bukan hanya data, tetapi contract yang memaksa consumer untuk menangani
`UNKNOWN`, `UNAVAILABLE`, `UNVERIFIED`, `CONFLICT`, dan `VERIFIED` secara eksplisit.
API tidak mengembalikan angka yang tampak mudah tetapi menyesatkan; ia
mengembalikan evidence, status, provenance, limitation, version, dan machine-
readable next action.

Dengan pendekatan ini, API dapat bertahan 10 tahun meskipun provider, network,
schema, scoring model, consumer language, dan deployment topology berubah.

## 2. Keputusan arsitektur

### 2.1 API adalah read/evidence platform, bukan shortcut ke internal server

API public tidak boleh mengekspos object internal, database row, workspace
session, atau provider response mentah. Semua response melewati:

```text
authentication
  -> key status
    -> workspace scope
      -> operation scope
        -> resource authorization
          -> input validation
            -> quota/rate policy
              -> async job/evidence projection
                -> versioned uncertainty-safe response
```

API tidak boleh melewati Core Scan evidence contract. Ia membaca canonical
evidence dan membuat projection yang stabil untuk consumer.

### 2.2 API key untuk v1, evolvable ke stronger client identity

API key tetap menjadi mekanisme awal yang sederhana untuk developer, tetapi
arsitektur harus menyediakan boundary untuk:

- key rotation;
- short-lived tokens;
- OAuth/OIDC client credentials;
- mTLS atau signed requests untuk enterprise;
- IP/origin policy;
- per-key environment separation;
- machine-to-machine identity.

Jangan memaksa semua consumer pindah sekaligus. Auth method dinegosiasikan pada
versioned contract, sementara authorization semantics tetap sama.

### 2.3 Async-first

Scan, bundle generation, signed report, export, dan operasi provider-heavy
menggunakan resource/job asynchronous. Synchronous endpoint hanya untuk
validation, metadata, lightweight retrieval, atau explicit cached result.

Consumer harus mendapatkan:

- stable job ID;
- status dan lifecycle;
- polling/backoff guidance;
- retry-after bila relevan;
- idempotency behavior;
- terminal error code;
- resource links sesuai scope.

## 3. Baseline nyata saat ini

Kemampuan yang sudah tersedia:

- `/api/v1` namespace;
- API key issue dan revoke melalui authenticated workspace owner;
- raw API key hanya dikembalikan saat issue;
- stored key memakai hash, bukan raw key;
- key expiry dan last-used metadata;
- scopes dasar `scan:create`, `scan:read`, `evidence:read`;
- asynchronous scan create/poll;
- evidence bundle uncertainty-safe;
- HMAC-SHA256 signed report;
- workspace usage counters untuk request, scan, bundle, signed report;
- `/sdk.js` dependency-free client;
- test dasar untuk key hashing, scope-ready record, metering, uncertainty
  contract, dan signature.

Kondisi yang belum lengkap untuk production-grade API Access:

- key store masih in-memory dan tidak cukup untuk multi-instance;
- belum ada key rotation, reveal/recovery policy, environment labels, atau
  per-key restrictions;
- default scope issuance dan scope validation belum menjadi policy registry
  yang kaya;
- rate limit, quota reservation, idempotency, replay, dan abuse controls belum
  menjadi contract API lengkap;
- usage belum menjadi durable, invoice-safe, per-key/per-operation metering;
- HMAC signing secret masih terlalu global untuk evolusi issuer/key rotation;
- belum ada JWKS/public verification atau signature key lifecycle;
- error envelope, pagination, version negotiation, deprecation, dan request ID
  belum diposisikan sebagai public contract;
- SDK masih minimal dan belum mengelola retry/backoff, polling, pagination,
  idempotency, redaction, atau typed uncertainty;
- UI API Access masih bersifat preview;
- public documentation, changelog, OpenAPI/contract artifact, sandbox, and
  operational status contract belum ditetapkan;
- security, tenant isolation, load, replay, and outage gates belum menjadi
  release gate API khusus.

## 4. Tujuan produk

### 4.1 User jobs

1. **When integrating JOBEN into a system**, I want predictable versioned
   responses, so my integration survives provider and UI changes.
2. **When consuming risk evidence**, I want explicit uncertainty states, so my
   software cannot silently treat missing data as safe.
3. **When submitting scans**, I want idempotent async jobs, so network retries do
   not create duplicate work or unexpected usage.
4. **When managing credentials**, I want scoped, expiring, revocable keys with
   clear last-use information, so compromise can be contained.
5. **When verifying a report**, I want stable hashes/signatures and provenance,
   so downstream decisions can be audited.
6. **When operating at scale**, I want quotas, rate limits, usage, errors, and
   provider health that are visible, so failures are actionable.

### 4.2 Product outcomes

- integrations fail explicitly rather than silently;
- API consumer can build a safe state machine from machine-readable statuses;
- key compromise has limited blast radius;
- API evolution does not break old clients unexpectedly;
- output can be used in due diligence, compliance, monitoring, and case review;
- no external consumer is encouraged to interpret JOBEN as financial advice.

## 5. Non-goals untuk v1

API Access v1 tidak mencakup:

- wallet connection, signatures from user wallets, transaction execution, trading,
  or financial recommendations;
- arbitrary SQL, provider proxy, raw RPC passthrough, or unrestricted data export;
- API access to another workspace through user-supplied workspace IDs;
- returning secrets, raw provider credentials, private notes, or internal auth
  tokens;
- synchronous guarantee for provider-heavy scan operations;
- silently retrying unsafe mutations;
- making “safe” or “not safe” a canonical API enum;
- using LLM output as evidence, score, severity, or authorization input;
- unlimited retention or unlimited bulk scan without explicit plan/policy;
- exposing live mutable state as if it were a signed historical report;
- breaking changes hidden behind the same `/api/v1` response shape.

## 6. Submodul API Access

| ID | Submodul | Tanggung jawab | Output wajib |
|---|---|---|---|
| A1 | Developer Identity & Key Lifecycle | Issue, list metadata, revoke, rotate, expire, recover safely | Durable key record |
| A2 | Authentication & Authorization Gateway | Key auth, scope, workspace, resource, role, environment | Fail-closed auth decision |
| A3 | Evidence API Contract | Versioned resources, envelopes, pagination, links, content types | Stable public schema |
| A4 | Async Scan Resource | Create, poll, cancel, retry, idempotency, lifecycle | Job resource |
| A5 | Evidence Bundle Projection | Uncertainty-safe evidence, findings, provenance, coverage | Machine-readable bundle |
| A6 | Signed Report & Verification | Canonical payload, signature, key rotation, verify metadata | Verifiable artifact |
| A7 | Quota, Rate & Abuse Control | Per-key/workspace/operation limits, reservation, protection | Enforced policy |
| A8 | Usage, Metering & Plan Boundary | Durable usage, attribution, quota, billing-ready events | Reconciled usage ledger |
| A9 | SDK & Developer Experience | Typed client, retry, polling, errors, examples, changelog | Safe integration path |
| A10 | Webhooks & Event Delivery | Optional async events, signature, retries, replay, DLQ | Delivery contract |
| A11 | API Access Control Plane | Key management UI, scopes, usage, audit, environment | Responsive secure console |
| A12 | Operations & Compatibility | Observability, incident, deprecation, schema registry, SLO | Long-lived platform contract |

## 7. Security invariants

These are non-negotiable:

1. Raw API keys are returned exactly once and never stored or logged.
2. Key hash comparison is constant-time where applicable and uses a strong
   cryptographic hash/KDF policy with key prefix/version metadata.
3. Every request resolves workspace from the authenticated key, never from a
   body/header supplied workspace ID.
4. Every operation checks both scope and resource authorization.
5. Default deny for unknown scope, unknown endpoint, expired/revoked key, and
   unsupported API version.
6. Keys are least-privilege, short-lived by default, named, attributable, and
   revocable.
7. Secrets never appear in source, URLs, logs, error messages, exports, or
   client-side public bundles.
8. Sensitive response caching is tenant/key/version safe or disabled.
9. Async retries are idempotent and cannot duplicate scan, evidence, signature,
   usage, or webhook side effects.
10. Error messages do not reveal private resource existence across workspaces.
11. Webhook endpoints are protected against SSRF, replay, redirect abuse, and
    unbounded response/body behavior.
12. Signed reports bind payload, schema, issuer, subject, snapshot, expiry, and
    algorithm/key version.
13. Unknown/unavailable/conflict evidence never becomes a safe/zero/false result.
14. Audit records are append-only and exclude raw credentials and unnecessary
    sensitive payloads.
15. Production startup refuses insecure development key/queue/storage modes.

## 8. Public API contract

### 8.1 Resource families

Initial public families:

```text
GET  /api/v1/capabilities
POST /api/v1/scans
GET  /api/v1/scans/{scanId}
POST /api/v1/scans/{scanId}/cancel
GET  /api/v1/scans/{scanId}/evidence-bundle
POST /api/v1/scans/{scanId}/signed-report
GET  /api/v1/usage
```

Planned families:

```text
GET  /api/v1/compare/{comparisonId}
POST /api/v1/comparisons
GET  /api/v1/reports/{reportId}
GET  /api/v1/watchtower/events/{eventId}
POST /api/v1/webhooks/endpoints
GET  /api/v1/events
```

Resource expansion must follow the same auth, version, idempotency, evidence,
and metering boundary.

### 8.2 Response envelope

Every response should have a predictable envelope:

```json
{
  "data": {},
  "meta": {
    "request_id": "req_opaque",
    "api_version": "v1",
    "schema_version": "1.0.0",
    "generated_at": "2026-08-25T00:00:00.000Z"
  },
  "links": {},
  "errors": []
}
```

Error:

```json
{
  "data": null,
  "meta": {
    "request_id": "req_opaque",
    "api_version": "v1"
  },
  "errors": [
    {
      "code": "EVIDENCE_UNAVAILABLE",
      "message": "Evidence is not available for this request.",
      "retryable": false,
      "category": "provider",
      "details": {}
    }
  ]
}
```

Rules:

- `code` stable and machine-readable;
- `message` localized/usable but not the integration key;
- `retryable` and `retry_after` explicit;
- no stack trace, SQL, secret, provider credential, or internal topology;
- errors distinguish validation, auth, scope, quota, provider, conflict, and
  platform failure;
- no foreign resource existence leak through detailed error wording.

### 8.3 Pagination and limits

- cursor-based pagination for future collections;
- maximum page size enforced server-side;
- opaque cursor bound to workspace, endpoint, filter, and schema version;
- cursor expiry and invalidation documented;
- deterministic ordering;
- bulk operations have explicit caps and async job path;
- response size and nested evidence depth bounded.

### 8.4 Headers and request metadata

Required/standard:

- `Authorization: Bearer <api-key>` preferred for new clients;
- `X-API-Key` supported only as documented compatibility path;
- `Idempotency-Key` for scan/create and side-effecting operations;
- `X-Request-Id` accepted only as trace correlation, never auth;
- `Accept-Version` or equivalent version negotiation;
- `Retry-After` for rate/temporary errors;
- `ETag`/conditional retrieval for immutable resources where safe.

Never accept workspace, actor, plan, role, or entitlement from caller headers.

## 9. Evidence-safe response contract

### 9.1 Evidence Bundle

Bundle must include:

- subject network/address and target validation status;
- scan/job status and captured time;
- evidence schema, report version, engine version;
- evidence points and findings;
- evidence status per point;
- reliability score separate from risk score;
- risk score/range/coverage fields without hidden redistribution;
- provenance references according to public API policy;
- uncertainty contract;
- limitations and unavailable capability list;
- evidence/report hash;
- links to related Passport/Compare/Report resources when authorized.

### 9.2 Consumer state machine

The contract must make these states explicit:

```text
REQUEST_ACCEPTED
  -> QUEUED
    -> RUNNING
      -> SUCCEEDED
      -> FAILED_RETRYABLE
      -> FAILED_TERMINAL
      -> CANCELLED
      -> EXPIRED
```

Evidence state is separate:

```text
VERIFIED
UNVERIFIED
UNKNOWN
UNAVAILABLE
CONFLICT
NOT_APPLICABLE
```

Job success does not imply every evidence field is verified.

### 9.3 Provenance and public redaction

API response must preserve enough provenance to audit:

- evidence reference;
- source category/provider class as policy allows;
- retrieval/capture time;
- adapter/schema/engine version;
- confidence and limitation.

Raw provider secret, internal URL, auth headers, and private workspace metadata
never enter the bundle.

## 10. Prioritas delivery

Roadmap memakai `Now / Next / Later`. Estimasi mencakup product, design,
engineering, QA, security, documentation, developer relations, dan operations.

### NOW — A0: API security and contract foundation

**Outcome:** API mempunyai boundary security dan public contract yang dapat
diimplementasikan tanpa ambiguity.

Scope:

- threat model API key, bearer leakage, replay, SSRF, enumeration, tenant
  escape, quota abuse, signature compromise;
- auth/scope/workspace/resource decision matrix;
- stable error envelope and request correlation;
- OpenAPI/contract artifact generated from reviewed schema;
- API version and deprecation policy;
- key prefix/version/environment convention;
- uncertainty/evidence contract;
- input/output size and timeout limits;
- audit event taxonomy;
- secure defaults and production fail-closed checks.

Acceptance:

- every route maps to an auth, scope, resource, quota, and audit decision;
- unknown/expired/revoked key fails closed;
- body workspace/actor/plan cannot override authenticated context;
- error responses never disclose cross-tenant resource existence;
- contract distinguishes job success from evidence verification;
- English and Bahasa Indonesia developer-facing error/copy keys exist where
  user-facing.

Estimasi: **M–L (3–6 minggu)**.  
Gate: Security + Evidence Platform + Product sign-off.

### NOW — A1: Durable least-privilege key management

**Outcome:** workspace owner dapat mengelola credentials dengan blast radius
terbatas dan audit lengkap.

Scope:

- PostgreSQL/durable key records;
- hashed secret storage with version/prefix;
- one-time reveal;
- scopes registry and safe defaults;
- expiry required/default policy;
- revoke, rotate, emergency revoke-all;
- environment label: test/live;
- optional IP/origin restriction design;
- last-used, created-by, revoked-by, expiry metadata;
- key list never returns secret or recoverable material;
- key audit events.

Acceptance:

- raw key is shown exactly once and cannot be recovered later;
- list/usage/audit never expose raw key or hash;
- revoked/expired keys stop access immediately or within documented bound;
- rotation creates new key without reviving old key;
- scope escalation requires owner authorization and is auditable;
- two workspaces cannot access each other’s key metadata;
- multi-instance requests see the same key lifecycle.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: A0, persistence, tenant/auth policy.

### NOW — A2: Secure async scan API

**Outcome:** external systems can create and poll scans safely under retry and
network failure.

Scope:

- POST scan input validation and chain target validation;
- stable job resource and lifecycle;
- idempotency key bound to workspace/key/request fingerprint;
- duplicate request response semantics;
- scan cancel/retry policy;
- polling guidance and Retry-After;
- per-key/per-workspace concurrency and monthly quota;
- request body, timeout, and address limits;
- no synchronous provider leakage;
- typed SDK methods.

Acceptance:

- same valid idempotency key and same request returns same logical job;
- same key with different request is rejected;
- concurrent duplicate creates do not duplicate scan usage;
- unauthorized job ID is indistinguishable from not found where policy requires;
- provider failure is represented as structured terminal/retryable state;
- no DEMO result silently replaces failed LIVE evidence;
- SDK supports polling with bounded backoff and abort/cancel.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: A0–A1, durable queue, persistence.

### NOW — A3: Uncertainty-safe evidence bundle and signed report

**Outcome:** consumer receives evidence that is useful for automation without
being allowed to misinterpret uncertainty.

Scope:

- stable evidence bundle schema;
- uncertainty contract;
- risk/reliability/coverage separation;
- provenance and limitation fields;
- canonical serialization;
- signature payload/version contract;
- signature key lifecycle and key ID;
- verification metadata and documented verifier;
- bundle/report access scope;
- ETag/hash and replay behavior.

Acceptance:

- all five core uncertainty states survive projection;
- bundle never turns unavailable/unknown into zero/false/safe;
- signed payload includes subject, snapshot/report hash, schema, issuer, expiry,
  algorithm, and key version;
- same canonical payload verifies deterministically;
- changed payload fails verification;
- rotated key can verify historical reports within retention policy;
- signed report is historical unless an explicit new generation is requested.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: A0, Core Scan/report contract, Shared Report trust model.

### NEXT — A4: Quota, rate, usage, and abuse platform

**Outcome:** API dapat dipakai secara adil dan operasional tanpa silent overuse
atau metering mismatch.

Scope:

- token bucket/sliding window by key, workspace, IP, endpoint, provider;
- concurrency limits and queue depth policy;
- quota reservation at request acceptance;
- refund/reconciliation for rejected/failed/cancelled jobs;
- durable usage ledger;
- per-key/per-operation/month/day aggregation;
- usage export and billing-ready events;
- abuse detection and emergency throttling;
- standard 429 response and Retry-After;
- cost/latency/provider attribution.

Acceptance:

- rate limits apply before expensive provider work;
- quota cannot be bypassed by rotating keys within one workspace;
- duplicate idempotent request does not double-charge;
- failed provider run follows explicit usage policy;
- usage dashboard matches durable ledger;
- rate-limit response is safe and actionable;
- emergency workspace/key/provider block is audited and reversible.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: A1–A2, plan/entitlement contract, durable persistence.

### NEXT — A5: Developer portal and SDK

**Outcome:** developer dapat integrate dengan path yang aman tanpa membaca
internal source code.

Scope:

- API Access UI for create/list/revoke/rotate keys;
- scope explanations and dangerous-action confirmation;
- test/live environment distinction;
- usage, quota, request errors, and key last-use;
- OpenAPI/reference docs;
- JavaScript/Node SDK upgrade;
- typed uncertainty/status enums;
- polling/backoff/idempotency helpers;
- code examples with secret-safe environment usage;
- changelog, version migration, deprecation notices;
- sandbox/demo mode clearly separated from LIVE.

Acceptance:

- UI never shows stored key after initial reveal;
- user can copy once with accessible confirmation and revoke immediately;
- SDK does not log API key, request body secrets, or evidence secrets;
- SDK throws typed errors with retryable/status/category fields;
- docs show how to handle every uncertainty state;
- sample code uses environment secret injection, not hardcoded credentials;
- desktop/mobile API Access console is usable.

Estimasi: **M–L (3–6 minggu)**.  
Dependency: A0–A4, documentation pipeline.

### NEXT — A6: Webhooks and event delivery

**Outcome:** consumer dapat menerima completion/update event tanpa aggressive
polling, dengan delivery yang dapat diverifikasi.

Scope:

- endpoint registration with ownership verification;
- HTTPS/SSRF/redirect/body/timeout policy;
- event types and versioned payload;
- HMAC/signature with timestamp and nonce;
- replay window and idempotency event ID;
- exponential retry and dead-letter;
- endpoint pause/disable on repeated failure;
- manual replay with scope/audit;
- delivery logs and per-endpoint health;
- no sensitive data beyond endpoint scope.

Acceptance:

- endpoint cannot be registered to unsafe/private destination;
- receiver can verify signature and reject replay;
- same event ID is delivered at most according to documented at-least-once
  semantics and is safe to deduplicate;
- permanent failure stops retries and exposes actionable status;
- replay requires authorized action and does not mutate evidence;
- payload status preserves uncertainty and snapshot references.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: A0, A1, durable outbox, operations/security.

### LATER — A7: Compare, Passport, Watchtower, and Case API

Directional after the evidence contract is trusted:

- versioned Compare API with immutable manifest;
- Passport snapshot/timeline reads;
- Watchtower event and health reads;
- Case evidence handoff and report references;
- scoped webhook events for new revisions/alerts;
- read-only API links with explicit resource authorization.

No resource is added merely because it exists in the dashboard. It must have
stable public semantics, retention, scope, pagination, and evidence limitations.

### LATER — A8: Enterprise identity and long-lived compatibility

Directional:

- OAuth/OIDC client credentials;
- mTLS and signed request option;
- JWKS/public verification;
- IP allowlists/private connectivity;
- organization-level policy templates;
- regional data residency controls;
- audit export/SIEM integration;
- schema compatibility test service;
- client migration assistant and deprecation telemetry;
- SLA/status page contract.

## 11. Versioning dan strategi adaptasi 10 tahun

### 11.1 Independent version axes

API harus memisahkan:

1. URL/API major version;
2. resource schema version;
3. evidence schema version;
4. engine/scoring version;
5. field registry/capability version;
6. signature algorithm/key version;
7. SDK version;
8. provider/network capability version.

Perubahan satu axis tidak boleh diam-diam mengubah semua axis.

### 11.2 Compatibility rules

- additive fields are backward-compatible only when consumer-safe;
- enum expansion requires unknown-enum handling guidance;
- removing/renaming fields requires deprecation window;
- changing field meaning creates a new field/schema version;
- old evidence bundles remain interpretable with recorded schema;
- old signed reports remain verifiable through key history/rotation policy;
- unsupported version returns structured error and migration link;
- no silent fallback from v2 to materially different v1 semantics;
- clients can request field projection, but cannot request removal of required
  uncertainty/status fields;
- contract tests run against representative old SDKs and fixtures.

### 11.3 Capability discovery

`GET /api/v1/capabilities` should describe:

- supported API/schema versions;
- network IDs and target validation support;
- provider/evidence capabilities;
- field availability;
- max subjects/bulk size;
- rate/quota hints;
- webhook/event types;
- deprecation dates;
- signed report algorithms/verification keys or key references;
- maintenance/degraded capabilities.

Capability output is advisory; authorization and policy remain server-side.

### 11.4 Migration principles

- read old, write current;
- preserve original evidence and report hashes;
- never mutate usage history during migration;
- migrate key records without exposing raw material;
- maintain old endpoint response until deprecation gate passes;
- publish changelog and machine-readable deprecation;
- replay old request only when idempotency/side-effect policy permits;
- expose fresh recomputation separately from historical retrieval.

## 12. Responsive API Access UX

### 12.1 Desktop console

1. **Overview**
   - API status, active keys, usage, quota, recent errors, provider/service
     capability;
   - clear separation of test/live environment.
2. **Keys**
   - name, environment, scopes, created, last used, expiry, status;
   - reveal-once flow, copy confirmation, revoke, rotate;
   - no key material in list.
3. **Usage**
   - requests/scans/bundles/signed reports;
   - quota remaining, rate-limit events, cost/plan boundary;
   - time range and key/operation filter.
4. **Docs**
   - endpoint, scope, request, response, errors, examples, SDK;
   - uncertainty contract always visible.
5. **Events/health**
   - webhook endpoint health, API errors, deprecated version, degraded provider.

### 12.2 Mobile

- stacked key cards with status/expiry/scope summary;
- reveal key in protected one-time modal;
- revoke/rotate behind explicit confirmation;
- usage summary first, detailed chart progressive disclosure;
- docs use collapsible endpoint sections and copy-safe snippets;
- error/status labels never rely on color only;
- touch targets minimum 44px;
- no horizontal scrolling required for critical key or usage information;
- loading, empty, quota exhausted, rate limited, revoked, expired, degraded,
  permission denied, and service unavailable states designed explicitly;
- sensitive values hidden by default and cleared from UI after navigation where
  appropriate.

### 12.3 Accessibility and localization

- English and Bahasa Indonesia at the same release;
- no user-facing hardcoded strings in API Access module;
- scope names have human explanation and machine enum;
- keyboard focus on reveal/copy/revoke actions;
- screen reader announces one-time reveal and irreversible revoke;
- tables have semantic headers and mobile card equivalent;
- dates, numbers, quota, and timezone use shared formatter;
- security warnings and uncertainty terms receive native review.

## 13. Threat model checklist

### Credential threats

- key in URL, referrer, browser history, source map, log, screenshot;
- bearer theft from CI logs or frontend bundle;
- weak hash/offline brute force;
- key reuse across test/live;
- overbroad scopes;
- stale key never revoked;
- rotation accidentally revives old key.

### Authorization threats

- workspace ID injection;
- resource ID enumeration;
- scope confusion;
- endpoint added without policy mapping;
- key metadata cross-tenant leak;
- plan/quota bypass via multiple keys;
- API key used against dashboard/session route.

### API/application threats

- replay/idempotency collision;
- oversized body/evidence/export;
- SSRF webhook endpoint;
- provider abuse/cost amplification;
- queue starvation;
- cache poisoning;
- timing/resource enumeration;
- error detail leakage;
- signature downgrade or canonicalization mismatch.

### Operations threats

- multi-instance key inconsistency;
- clock skew on expiry/signature/rate limit;
- durable usage drift;
- queue replay duplicate;
- provider outage mistaken as safe empty result;
- key compromise incident without global revoke;
- incomplete audit during failover.

Every threat must map to prevention, detection, response, test, and owner before
Production API release.

## 14. Quality strategy dan acceptance criteria

### 14.1 Test layers

1. **Crypto/key:** one-time reveal, hash storage, constant-time compare, expiry,
   revoke, rotation, key ID, signature/canonical payload.
2. **Authorization:** scope matrix, workspace isolation, role, resource,
   environment, foreign IDs, fail closed.
3. **API contract:** schema, errors, pagination, version, content type, headers,
   idempotency, retry-after, unknown enum.
4. **Evidence:** uncertainty preservation, provenance, report hash, snapshot
   immutability, LIVE/DEMO separation.
5. **Queue/usage:** duplicate create, retry, cancellation, quota reservation,
   refund/reconciliation, durable ledger.
6. **Abuse:** rate limits, body size, concurrency, enumeration, key rotation,
   provider amplification, webhook SSRF/replay.
7. **SDK:** polling, backoff, abort, typed error, redaction, no logging secret.
8. **Browser:** key management, usage, docs, reveal/revoke, desktop/mobile,
   accessibility.
9. **Operations:** multi-instance failover, clock skew, provider outage,
   queue recovery, incident revoke-all, backup/restore.
10. **Compatibility:** old clients, old bundles, old signatures, deprecated
    fields, capability negotiation.

### 14.2 Gherkin acceptance scenarios

#### One-time key reveal

```text
Given a workspace owner issues a live API key
When the issue request succeeds
Then the raw key is shown exactly once
And subsequent list/get requests return metadata without the raw key
And no log, audit event, or error contains the raw key
```

#### Least privilege

```text
Given an API key has only scan:read scope
When it calls the scan creation endpoint
Then the request is rejected with a stable scope error
And no scan, usage charge, or provider call is created
And the denial is auditable without exposing the key
```

#### Tenant isolation

```text
Given a key belongs to workspace A
When the caller submits workspace B in the body or queries a resource from B
Then the server uses workspace A as the only scope
And the foreign resource is not disclosed
And no foreign usage or evidence is returned
```

#### Idempotent scan

```text
Given a valid scan request has an Idempotency-Key
When the same request is retried due to a network timeout
Then the API returns the same logical job
And it does not create a second scan or double-count usage
And a changed payload with the same key is rejected
```

#### Uncertainty contract

```text
Given a completed scan contains UNKNOWN, UNAVAILABLE, UNVERIFIED, CONFLICT, and VERIFIED evidence
When the client retrieves the evidence bundle
Then all states remain distinct
And none is converted to zero, false, safe, or verified
And the bundle explains the limitation and schema version
```

#### Signed report integrity

```text
Given a signed report is generated for snapshot S1
When a verifier checks the canonical payload
Then the signature verifies against the recorded key/algorithm version
And changing any signed field causes verification to fail
And a newer snapshot does not silently alter the signed S1 report
```

#### Revoked credential

```text
Given an API key is revoked
When the same key calls any API endpoint
Then authentication fails closed
And no provider work, usage increment, or resource disclosure occurs
And the revoke event contains actor, time, key ID, and reason where supplied
```

#### Rate and quota

```text
Given a key reaches its per-minute rate limit
When it submits another request
Then the API returns 429 with a safe stable error and Retry-After
And the request does not consume provider capacity
And repeated key rotation cannot bypass the workspace policy
```

#### Provider outage

```text
Given a provider is unavailable during a LIVE scan
When the client polls the job and retrieves the bundle
Then the result is marked unavailable/degraded according to contract
And no DEMO evidence replaces the LIVE result
And retryability and limitation are explicit
```

#### Webhook replay

```text
Given a signed event has timestamp T and event ID E
When the receiver submits the same event outside the replay window
Then the consumer can reject it deterministically
And the platform does not create a duplicate downstream effect
And manual replay requires explicit authorized action
```

#### Mobile API console

```text
Given an owner opens API Access on a mobile viewport
When they inspect key status, reveal a new key, view usage, and revoke a key
Then critical actions are reachable without horizontal scrolling
And secrets are hidden by default
And irreversible actions require clear confirmation
```

## 15. Release gates

### Gate A — Secure API Boundary

- durable key metadata;
- one-time reveal, expiry, revoke, rotation;
- workspace/scope/resource authorization;
- stable error envelope;
- no secret leakage;
- threat model and security tests.

### Gate B — Trustable Evidence API

- async job/idempotency;
- uncertainty-safe bundle;
- provenance, limitations, versions;
- signed report canonicalization;
- LIVE/DEMO separation;
- schema/OpenAPI contract.

### Gate C — Operable API Platform

- rate/quota/concurrency;
- durable metering and reconciliation;
- SDK, docs, capability endpoint;
- audit and observability;
- provider/queue outage behavior;
- key incident/revoke-all drill.

### Gate D — Production API Access

- webhook/event delivery if enabled;
- compatibility/deprecation process;
- load and abuse tests at Phase 0 target;
- multi-instance/failover/recovery drill;
- privacy/legal review;
- responsive/accessibility acceptance;
- no critical/high defect in credential, authorization, evidence, or metering.

## 16. Success metrics

### Security

- raw key exposure incidents;
- unauthorized request block rate;
- cross-tenant access incidents;
- revoked-key acceptance rate;
- scope bypass incidents;
- mean time to revoke compromised key;
- rate-limit bypass incidents;
- webhook SSRF/replay incidents.

### Evidence trust

- percentage bundles with complete uncertainty/provenance metadata;
- evidence status preservation rate;
- signed report verification success/failure classification;
- duplicate scan rate;
- LIVE/DEMO contamination incidents;
- unsupported schema/error clarity rate;
- historical report verification rate.

### Reliability

- p50/p95 API latency by endpoint;
- scan acceptance-to-queue latency;
- job completion/error/retry rate;
- provider degraded response rate;
- 429 rate by cause;
- usage ledger reconciliation drift;
- webhook delivery success and terminal failure rate;
- SDK retry/recovery success.

### Developer experience

- time to first successful authenticated request;
- time to first completed scan;
- docs/SDK error recovery rate;
- API version migration completion;
- active keys by environment;
- API-to-case/Compare/Watchtower adoption.

Numeric targets must be set after baseline telemetry, plan policy, and capacity
tests exist. Do not convert unobserved guesses into SLO commitments.

## 17. Dependency map

```text
Core Scan evidence contract
  -> API security/uncertainty contract (A0)
    -> durable key lifecycle (A1)
      -> async scan/idempotency (A2)
        -> evidence bundle/signed report (A3)
          -> quota/usage/abuse (A4)
            -> SDK/docs/control plane (A5)
              -> webhooks/events (A6)
                -> Compare/Passport/Watchtower/Case API (A7)
                  -> enterprise identity/long-lived compatibility (A8)
```

Hard dependencies:

- A1 cannot ship production without durable persistence and tenant policy;
- A2 cannot ship without idempotency and queue lifecycle;
- A3 cannot ship without canonical evidence/status semantics;
- A4 cannot ship without durable usage and plan entitlement boundaries;
- A5 cannot ship without stable errors/version/capability contract;
- A6 cannot ship without outbox, signature, replay, and SSRF policy;
- A7 cannot ship just by wrapping existing dashboard endpoints;
- A8 cannot ship before key/signature/version rotation is operationally proven.

## 18. Definition of Done

API Access is **completed** only when:

1. developers can issue, use, list metadata for, rotate, expire, and revoke
   least-privilege keys safely;
2. raw secrets are shown once, never recoverable, and never logged;
3. every request is authenticated, workspace-scoped, scope-checked,
   resource-authorized, rate-limited, and audited;
4. async scans are idempotent, retry-safe, cancel-safe, quota-aware, and
   multi-instance safe;
5. evidence bundles preserve all uncertainty states, provenance, versions,
   coverage, limitation, and risk/reliability separation;
6. signed reports use canonical payloads with key/algorithm rotation and
   historical verification;
7. errors, pagination, headers, request IDs, retry behavior, and versioning are
   stable public contracts;
8. durable usage is attributable by workspace/key/operation and reconciles with
   quota/plan policy;
9. SDK and docs teach safe secret handling, polling, idempotency, errors, and
   every uncertainty state;
10. webhooks/events, if enabled, have endpoint safety, signature, replay,
    retry, dead-letter, and audit behavior;
11. API Access UI supports secure key lifecycle, usage, health, docs, and errors
    on desktop and mobile;
12. English and Bahasa Indonesia are complete for user-facing console/error
    presentation;
13. OpenAPI/contract, security, authorization, evidence, load, abuse, recovery,
    compatibility, and browser tests pass;
14. production runbooks cover key compromise, revoke-all, provider outage,
    queue failure, usage drift, signature rotation, and schema deprecation;
15. no critical/high defect remains in credential handling, tenant isolation,
    evidence interpretation, signing, or metering.

## 19. Keputusan yang harus dikunci sebelum A0

- Which API key prefix/environment convention is final?
- Is `Authorization: Bearer` the primary header, with `X-API-Key` compatibility?
- Which scopes exist in v1, and which are never combinable?
- Are expiry and rotation mandatory for all production keys?
- What is the exact plan for key incident response and revoke-all?
- What durable store and transaction boundary owns key/usage/idempotency data?
- Which errors are retryable, and which operations are safe to retry?
- What is the usage policy for failed, cancelled, duplicate, and retried scans?
- Which evidence/provider identity may be public in API bundles?
- What is the canonical serialization/signature format and key rotation policy?
- Which schema versions are supported simultaneously?
- What minimum capability endpoint is required before adding a new network/provider?
- Which webhook events are needed, and what is the retention/replay policy?
- What enterprise auth path is justified by validated customer demand?
- What production SLO/load target follows the Phase 0 300 scans/minute direction?

## 20. Prioritas final

Urutan yang tidak boleh dibalik:

1. **kunci security, tenant, scope, error, evidence, dan version contract;**
2. **buat durable least-privilege key lifecycle;**
3. **buat async scan idempotent dan uncertainty-safe;**
4. **buat bundle/signed report yang dapat diverifikasi;**
5. **buat quota, rate, abuse, dan usage ledger;**
6. **baru buka developer portal, SDK, dan webhook delivery;**
7. **setelah boundary terbukti, perluas ke Compare, Passport, Watchtower, Case,
   dan enterprise identity.**

API Access yang benar-benar selesai bukan API yang memiliki banyak endpoint.
Ia adalah contract firewall yang membuat integrasi eksternal tetap aman,
jelas, dapat diaudit, dan dapat bertahan ketika evidence, provider, network,
schema, model bisnis, dan infrastruktur JOBEN NETWORK berubah selama 10 tahun.