# JOBEN NETWORK — Shared Report Core Module Roadmap

---

Version: 1.0  
Last updated: 2026-08-25  
Status: Draft for implementation planning  
Owner: Product + Evidence Platform  
Parent product: Core Scan / Risk Passport / Case Workspace  
Primary surface: Reports and safe public/private sharing

---

## 1. Ringkasan eksekutif

Shared Report bukan fitur “buat URL lalu tampilkan halaman”. Ia adalah lapisan
distribusi evidence yang memungkinkan seseorang membagikan hasil analisis tanpa
mengubah arti, provenance, uncertainty, atau ownership dari evidence tersebut.

Shared Report harus menjadi **Living Evidence Capsule**:

- snapshot yang dibagikan bersifat immutable;
- pembaca dapat memverifikasi kapan evidence diambil dan versi engine/schema;
- status report menjelaskan apakah snapshot masih current, outdated, expired,
  revoked, atau tidak tersedia;
- perubahan terbaru tidak diam-diam mengganti isi report lama;
- pemilik dapat menerbitkan revision baru dengan lineage yang jelas;
- recipient hanya melihat bagian yang diizinkan, bukan data tenant internal;
- report dapat diteruskan ke Compare, Watchtower, Case, atau API dengan reference
  yang tetap dapat diaudit.

**Ide pembeda:** link publik bukan “latest data link”, melainkan **verifiable
evidence capsule**. Ia membawa konteks, batasan, freshness, dan integrity proof
sehingga penerima tahu apakah sedang membaca hasil pada saat diterbitkan atau
state terbaru yang berbeda.

## 2. Keputusan arsitektur

### 2.1 Shared Report sebagai distribution layer

Pembagian tanggung jawab:

- **Core Scan** menghasilkan report/evidence, status, provenance, dan versi.
- **Risk Passport** menyediakan identity dan snapshot history.
- **Compare** dapat menghasilkan comparison decision pack yang dibagikan dengan
  manifest input yang immutable.
- **Watchtower** dapat membuat alert-linked report atau new revision trigger.
- **Case Workspace** dapat membagikan evidence pack sesuai permission dan policy.
- **Shared Report** mengontrol publication, audience, expiry, revocation,
  redaction, verification, access events, dan rendering.

Shared Report tidak:

- memutasi snapshot;
- membuat snapshot baru hanya karena report dibuka;
- mengganti `UNKNOWN`, `UNAVAILABLE`, `UNVERIFIED`, `CONFLICT`, atau `VERIFIED`;
- menampilkan private workspace data melalui public route;
- mengklaim report yang outdated sebagai kondisi current.

### 2.2 Immutable publication, explicit revision

Setiap publication mengunci:

- subject identity;
- snapshot/evidence hash;
- report/engine/schema version;
- selected sections/field pack;
- locale/presentation mode;
- redaction policy;
- issued-at dan expiry;
- publisher/workspace authority;
- integrity metadata.

Perubahan membutuhkan revision baru. Revision lama tetap dapat diverifikasi
selama retention policy mengizinkannya, atau mengembalikan status expired/revoked
secara eksplisit.

## 3. Baseline nyata saat ini

Fondasi yang telah tersedia:

- `createReport` untuk report dari current Risk Passport snapshot;
- immutable report metadata;
- `snapshotId`, `engineVersion`, `evidenceHash`, `issuedAt`, `expiresAt`;
- `private` dan `public` visibility;
- public report hanya dapat diambil tanpa workspace context;
- authenticated owner dapat membuat report dan mengubah visibility;
- public/private route boundary sudah didokumentasikan;
- report status dihitung sebagai `VERIFIED`, `OUTDATED`, atau `EXPIRED`;
- report list di dashboard;
- report CSV helper dan report version/hash di scan persistence;
- report generation berbasis snapshot, bukan live re-fetch.

Baseline ini adalah **single-snapshot sharing foundation**, bukan complete
sharing platform. Gap utama:

- belum ada lifecycle `DRAFT/PUBLISHED/REVOKED/EXPIRED/OUTDATED/ARCHIVED`;
- visibility belum cukup granular untuk recipient, team, link, atau passwordless
  secure access policy;
- belum ada revocation, link rotation, access event, rate limit, atau abuse
  controls yang lengkap;
- public rendering dan verification surface belum menjadi evidence-first capsule;
- belum ada redaction/section selection yang policy-driven;
- belum ada revision lineage atau latest-vs-issued comparison;
- belum ada report untuk Compare/Case/Watchtower yang tetap immutable;
- belum ada download/export integrity package yang konsisten;
- belum ada durable retention/erasure policy dan audit view;
- responsive/public accessibility dan bilingual copy belum didefinisikan sebagai
  release gate khusus Shared Report.

## 4. Tujuan produk

### 4.1 User jobs

1. **When sending a scan to a colleague**, I want them to see exactly what I
   reviewed, so the shared result is not misunderstood as live truth.
2. **When receiving a public report**, I want to verify its age, evidence status,
   and integrity, so I know whether it is still useful.
3. **When evidence changes**, I want to publish a new revision without rewriting
   the old one, so audit history remains intact.
4. **When sharing with an external party**, I want to limit sections and lifetime,
   so private workspace data is not exposed.
5. **When a link is misdirected**, I want to revoke or rotate it, so access stops
   without deleting the underlying evidence.
6. **When preparing a listing or case decision**, I want a stable evidence pack
   with citations and limitations, so another reviewer can reproduce the context.

### 4.2 Desired outcomes

- recipients understand report freshness and limitations;
- report integrity can be independently checked inside the product;
- no public link leaks workspace identity, secrets, private notes, or hidden
  provider details;
- published reports remain stable while new reports show explicit lineage;
- public distribution increases trust without weakening forensic boundaries.

## 5. Non-goals untuk v1

Shared Report v1 tidak mencakup:

- wallet connection, transaction signing, trading, atau financial recommendation;
- public editing of evidence, risk score, severity, or source status;
- permanent public data lake of all scans;
- unexpired links with unlimited access by default;
- password storage in URLs or source code;
- indexable public pages by default;
- exposing provider secrets, internal adapter details, private audit metadata,
  raw credentials, or hidden workspace identifiers;
- “live report” yang berubah diam-diam di balik URL lama;
- social popularity, likes, generic public comments, atau leaderboard;
- AI-generated conclusion yang dapat mengubah evidence semantics;
- cross-tenant comparison atau cohort disclosure tanpa aggregate privacy policy.

## 6. Submodul Shared Report

| ID | Submodul | Tanggung jawab | Output wajib |
|---|---|---|---|
| S1 | Publication Manifest | Mengunci subject, snapshot, sections, version, locale, policy | Immutable manifest |
| S2 | Audience & Visibility Policy | Menentukan public/private/workspace/recipient access | Explicit authorization decision |
| S3 | Redaction & Evidence Boundary | Memilih data yang boleh keluar tanpa merusak meaning | Redaction-aware projection |
| S4 | Integrity & Verification | Hash, version, timestamp, lineage, verification status | Verifiable capsule metadata |
| S5 | Revision & Freshness Lineage | Menghubungkan old/current report tanpa mutasi | Revision graph + status |
| S6 | Lifecycle, Expiry & Revocation | Publish, expire, revoke, rotate, archive, retention | Auditable state machine |
| S7 | Access & Abuse Protection | Rate limit, anti-enumeration, access events, anomaly control | Safe access telemetry |
| S8 | Public Reader Experience | Evidence-first report, limitation, sources, CTA | Responsive public report |
| S9 | Export & Decision Pack | HTML/PDF/CSV/JSON dan case/compare handoff | Stable signed/export package |
| S10 | Collaboration & Recipient Workflow | Invite, comments/acknowledgement, reviewer handoff | Controlled collaboration |
| S11 | API & Embed Contract | Versioned read-only retrieval, embed, machine verification | External consumer contract |
| S12 | Retention, Privacy & Operations | Retention, deletion, audit, monitoring, incident response | Runbook and policy evidence |

## 7. Core domain contract

### 7.1 Publication manifest

Setiap report yang dipublish minimal memiliki:

- `reportId` dan public opaque reference yang tidak enumerable;
- `workspaceId` internal yang tidak pernah tampil pada public surface;
- publisher actor dan authorization basis;
- subject identity: canonical network, normalized address, target validation;
- `snapshotId`, evidence hash, captured-at, issued-at;
- report/engine/evidence schema/field pack versions;
- sections included dan redaction policy version;
- locale/presentation version;
- visibility and audience policy;
- expiry, retention, revocation metadata;
- revision lineage: `rootReportId`, `previousReportId`, `revision`;
- status;
- integrity/verification metadata;
- audit correlation ID.

### 7.2 Lifecycle state machine

State yang diizinkan:

```text
DRAFT -> PUBLISHED -> OUTDATED
                  -> EXPIRED
                  -> REVOKED
                  -> ARCHIVED

DRAFT -> REVOKED
PUBLISHED -> PUBLISHED (new immutable revision only)
OUTDATED -> PUBLISHED (new revision)
EXPIRED -> PUBLISHED (new revision)
```

Aturan:

- `PUBLISHED` berarti dapat dibaca oleh audience policy saat ini;
- `OUTDATED` berarti snapshot bukan current Passport snapshot, bukan berarti
  evidence salah;
- `EXPIRED` berarti lifetime berakhir, bukan berarti snapshot dihapus;
- `REVOKED` berarti owner/policy menghentikan akses;
- `ARCHIVED` berarti tidak aktif dan tunduk pada retention;
- report lama tidak diubah menjadi current hanya karena visitor membuka URL;
- reopen report revoked/expired tidak boleh menghidupkan publication lama;
- new revision memiliki report ID baru dan lineage jelas.

### 7.3 Public status semantics

Public reader harus membedakan:

- **Verified:** integrity valid, belum expired/revoked, snapshot dapat dibaca;
- **Outdated:** valid publication, tetapi ada snapshot yang lebih baru;
- **Expired:** publication melewati expiry;
- **Revoked:** owner/policy menghentikan akses;
- **Unavailable:** snapshot/source tidak dapat disajikan sesuai policy;
- **Unverified:** integrity atau source verification tidak cukup;
- **Conflict:** evidence sources conflict dan belum resolved.

Tidak boleh menampilkan badge “verified” sebagai jaminan keamanan kontrak.

## 8. Living Evidence Capsule — ide inti yang harus dipertahankan

### 8.1 Stable capsule, changing world

URL report menampilkan publication yang sama. Jika contract dipindai ulang:

1. report lama tetap memuat snapshot saat diterbitkan;
2. reader diberi banner bahwa report outdated;
3. jika owner mengizinkan, reader dapat membuka current revision melalui
   explicit “View newer evidence” link;
4. current revision tidak menggantikan isi report lama;
5. lineage menunjukkan apa yang berubah di antara revisions.

### 8.2 Verifiability panel

Setiap capsule menampilkan:

- captured at vs issued at;
- current/outdated/expired/revoked status;
- snapshot ID/reference;
- evidence hash atau verification code yang aman;
- engine/evidence schema/report version;
- network/address identity;
- data coverage and limitations;
- source category dan provider status sesuai public redaction policy;
- disclaimer bahwa report bukan guarantee of safety/performance.

### 8.3 Share-safe by default

Default publication:

- expires otomatis;
- private until explicitly published;
- minimal sections;
- no workspace member list;
- no internal actor IDs;
- no private notes/case comments;
- no secret URLs or tokens;
- no index/search exposure unless explicitly approved;
- public route rate-limited dan anti-enumeration.

## 9. Full feature scope

### 9.1 Publish flow

- choose source: scan, Passport snapshot, Compare decision pack, Case evidence
  pack, atau Watchtower pulse;
- choose sections and redaction;
- preview exactly what recipient sees;
- choose audience, expiry, locale, and export policy;
- show sensitive-data warnings;
- confirm immutable publication;
- return opaque link/reference and revoke controls.

### 9.2 Recipient/access modes

V1 access modes:

1. **Private workspace:** authenticated workspace members with role policy.
2. **Restricted link:** opaque link, expiration, optional access policy.
3. **Public link:** intentionally published, no login, redacted capsule.
4. **Named recipient:** later phase with invitation/identity verification.

Recipient mode tidak boleh mengandalkan obscurity sebagai satu-satunya security
control untuk data sensitif.

### 9.3 Report sections

Section registry:

- Executive status and scope;
- Risk and reliability, shown separately;
- Evidence coverage;
- Key findings with severity/confidence;
- Contract control/owner/proxy;
- Market/liquidity/holder evidence where available;
- Timeline or Compare delta;
- Watchtower pulse context;
- policy/compliance result where authorized;
- evidence register and provenance;
- limitations, freshness, conflict, and disclaimer.

Section inclusion harus capability-aware. Jika section tidak tersedia:

- tampilkan `UNAVAILABLE`, `NOT_APPLICABLE`, atau `REDACTED` dengan explanation;
- jangan hilangkan section silently;
- jangan mengganti data dengan guessed value.

### 9.4 Revision flow

- publish new revision from a newer snapshot;
- compare old/new revision using Compare semantics;
- show changed sections and unchanged sections;
- keep report root identity;
- allow old revision to remain accessible until expiry/revocation policy;
- export lineage manifest;
- no destructive overwrite.

### 9.5 Verification flow

Reader can:

- inspect publication status;
- inspect capture/issue time and versions;
- verify reference/hash through product UI;
- view source limitations;
- see whether current revision exists;
- download verification metadata;
- report suspicious/abused link without exposing private data.

External cryptographic verification is a later capability and must not be added
without a key rotation, signature, canonical serialization, and revocation
design.

## 10. Prioritas delivery

Roadmap menggunakan `Now / Next / Later`. Estimasi mencakup product, design,
engineering, QA, security, localization, dan operations.

### NOW — S0: Publication and trust contract

**Outcome:** definisi report yang dibagikan tidak ambigu dan tidak bocor.

Scope:

- manifest dan lifecycle state machine;
- snapshot/evidence/version references;
- public status semantics;
- visibility/audience policy;
- redaction boundary;
- default expiry and retention;
- opaque reference/non-enumeration policy;
- threat model untuk scraping, link leakage, replay, cache, and metadata;
- public disclaimer and bilingual terminology.

Acceptance:

- report lama tidak berubah ketika Passport mendapat snapshot baru;
- every publication states source snapshot, captured time, issued time, versions;
- outdated/expired/revoked/unavailable/unverified/conflict berbeda secara visual
  dan semantic;
- private workspace fields never appear in public projection;
- public URL cannot be guessed sequentially or used to infer workspace identity;
- all new public copy has English and Bahasa Indonesia locale keys.

Estimasi: **M (2–4 minggu)**.  
Gate: Evidence Platform + Security + Product sign-off.

### NOW — S1: Living Evidence Capsule v1

**Outcome:** user dapat menerbitkan report yang immutable, transparent, dan
responsive.

Scope:

- publish preview;
- current snapshot report;
- public capsule route;
- status/verification panel;
- evidence coverage and limitations;
- section/redaction selection minimum;
- expiry and revoke;
- owner report list with status;
- desktop/mobile public reader;
- access-safe error pages.

Acceptance:

- owner dapat membuat report dari completed snapshot;
- recipient hanya melihat projection yang diizinkan;
- report menunjukkan whether current or outdated without rewriting content;
- expired/revoked report does not expose snapshot body;
- mobile reader dapat melihat identity, status, key findings, evidence status,
  limitation, dan verification metadata tanpa horizontal scroll;
- public route does not require private session and does not reveal private fields.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: S0, existing report/snapshot contract, public route boundary.

### NEXT — S2: Revisions and evidence lineage

**Outcome:** shared report mengikuti perubahan secara jujur tanpa kehilangan
audit history.

Scope:

- root/revision graph;
- newer revision banner;
- old-vs-new change view;
- Compare integration;
- Watchtower pulse link;
- revision-specific expiry/revoke;
- publish new revision from selected snapshot;
- immutable lineage export.

Acceptance:

- new revision has new report ID and references previous report;
- old report body/hash remains stable;
- lineage identifies snapshot, engine, schema, and changed sections;
- a reader can tell current evidence from historical evidence;
- historical report can be viewed even when current provider is unavailable,
  subject to retention and publication policy.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: Compare contract, Watchtower evidence semantics, S1.

### NEXT — S3: Controlled recipients and collaboration

**Outcome:** report dapat dibagikan ke reviewer atau partner dengan kontrol
audience yang lebih kuat daripada public link.

Scope:

- named recipient invite;
- recipient authentication or one-time verification;
- workspace role-based access;
- reviewer acknowledgement;
- comments/requests routed to Case Workspace;
- access approval/expiry;
- owner access log and revoke all sessions/links;
- recipient notification localization.

Acceptance:

- recipient only sees report after policy check;
- revoking recipient removes access without deleting evidence;
- acknowledgement records actor, time, report revision, and locale;
- comments cannot mutate report/evidence;
- cross-workspace access is never granted by user-submitted workspace ID.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: auth/tenant policy, Case Workspace, notification policy.

### NEXT — S4: Decision Pack and export

**Outcome:** external review, listing, and case decisions memperoleh package yang
stabil dan dapat diverifikasi.

Scope:

- HTML print view;
- PDF/CSV/JSON export with version metadata;
- Compare decision pack sharing;
- Case evidence register export;
- Watchtower alert evidence capsule;
- redaction preview before export;
- content disposition and download security;
- export audit event and retention.

Acceptance:

- export content matches visible report projection;
- export contains limitations, status, timestamps, and evidence references;
- CSV/JSON values preserve status and do not flatten unknown;
- PDF/HTML responsive/print output does not hide critical disclaimer;
- export cannot include unauthorized notes or private case data;
- a report export can be correlated to its immutable publication.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: S0–S3, report engine, Case/Compare contracts.

### LATER — S5: Verification and partner integration

Directional:

- signed canonical report package;
- public verification endpoint;
- key rotation and signature revocation;
- QR verification;
- partner embed with CSP and scoped data;
- API read access with usage metering;
- webhook when a new revision is explicitly published;
- domain allowlist and enterprise sharing policy.

Tidak boleh menggunakan cryptographic signature sebagai trust theatre. Signature
harus mengikat canonical payload, version, issuer policy, expiry, and revocation.

### LATER — S6: Long-lived evidence distribution

Directional, subject to privacy/legal review:

- organization report templates;
- localization beyond English/Indonesian;
- compliance/regulatory evidence packs by jurisdiction;
- time-bounded public evidence archive;
- aggregate benchmark pages with privacy thresholds;
- offline verification package;
- migration viewer for old schema/report versions.

## 11. Responsive UX blueprint

### 11.1 Owner dashboard

Desktop:

- report list with subject, snapshot time, status, audience, expiry, revision;
- filters: current/outdated/expired/revoked, public/private, source type;
- publish/revision preview;
- copy link, revoke, rotate, view access events;
- clear distinction between report publication and source Passport.

Mobile:

- stacked report cards;
- status and expiry above secondary metadata;
- actions in bottom sheet;
- destructive revoke requires clear confirmation;
- link copy has accessible confirmation and no secret shown in full after copy;
- revision lineage opens as a vertical timeline.

### 11.2 Public reader

Information priority:

1. report identity and scope;
2. verified publication/freshness status;
3. risk/reliability distinction;
4. key evidence and findings;
5. coverage/limitations/conflicts;
6. source/time/version verification;
7. optional newer revision;
8. disclaimer and next action.

Desktop:

- evidence summary rail;
- main report sections;
- verification/freshness panel;
- visible “historical snapshot” banner where applicable;
- print-friendly layout.

Mobile:

- one-column reading flow;
- sticky status header that does not obscure content;
- collapsible evidence sections with summary labels;
- before/after revision comparison as stacked cards;
- no horizontal table scrolling for essential content;
- source references open as accessible detail panels;
- minimum touch target 44px;
- long address truncates with copy/full accessible name;
- loading, empty, expired, revoked, unavailable, permission, and error states
  designed explicitly.

### 11.3 Localization/accessibility

- English and Bahasa Indonesia published simultaneously;
- all public copy via locale keys;
- risk/evidence status semantics remain language-neutral;
- no color-only status;
- keyboard navigation and visible focus;
- semantic headings, landmarks, table relationships, and link purpose;
- screen readers receive status, time, source, and limitation in order;
- locale-aware date/timezone/number/currency/percent;
- disclaimer and security wording reviewed natively.

## 12. Security, privacy, and abuse controls

### 12.1 Link and access security

- opaque random report reference, no sequential IDs;
- public access rate limiting and anti-enumeration response;
- constant-shape not-found/expired/revoked behavior where appropriate;
- no sensitive metadata in URL path/query;
- short default expiry and explicit maximum expiry policy;
- revoke and link rotation;
- cache policy prevents private/public mix;
- `Cache-Control`, CSP, frame policy, and content type are explicit;
- download endpoints authorize the same publication policy as HTML.

### 12.2 Redaction and data boundary

Public projection must exclude by default:

- workspace ID/name unless intentionally configured;
- actor IDs, member list, private notes, case comments;
- API keys, webhook endpoints, sessions, internal correlation secrets;
- hidden provider identifiers where product policy requires redaction;
- unpublished annotations or moderation metadata;
- tenant-specific intelligence not in the selected pack.

Redaction cannot hide a missing value while leaving a misleading summary. If
removing a section changes interpretation, show `REDACTED` plus limitation.

### 12.3 Abuse and privacy

- access event monitoring with privacy-minimized metadata;
- scraping and high-volume retrieval detection;
- recipient/owner notification for suspicious access where policy allows;
- report takedown/revocation path;
- retention and erasure policy separate from underlying evidence retention;
- incident response runbook for leaked link or overexposed projection;
- never log tokens, one-time secrets, full private URLs, or report payloads
  unnecessarily.

## 13. Compatibility strategy 10 tahun

### 13.1 Version axes

Shared Report versions independently:

1. evidence schema;
2. report content schema;
3. redaction/public projection schema;
4. report rendering/presentation;
5. signature/verification format;
6. audience/access policy;
7. export format;
8. network/provider capability.

Old publications retain their original version metadata.

### 13.2 Read old, publish new

- old report reads through compatible renderers;
- new publication uses current schema;
- content changes create new report revision;
- presentation redesign must not alter domain/evidence semantics;
- unsupported old version returns structured `REPORT_VERSION_UNSUPPORTED`,
  not an empty or misleading report;
- migration is explicit and leaves original hash/manifest intact;
- deprecation includes telemetry, documentation, and owner notice;
- report links must distinguish “cannot render” from “evidence unavailable”.

### 13.3 Rendering boundary

Canonical report data is independent from:

- HTML/CSS;
- PDF renderer;
- locale;
- dark/light theme;
- mobile/desktop layout;
- embed/partner frame.

This prevents a ten-year content migration from being coupled to a single UI
framework or document renderer.

## 14. Quality strategy and acceptance criteria

### 14.1 Test layers

1. **Domain:** publication lifecycle, expiry, revocation, revision lineage,
   visibility, redaction, status semantics.
2. **Security:** enumeration, cross-tenant access, cache leakage, link rotation,
   rate limits, download authorization, CSP/frame policy.
3. **Evidence:** snapshot immutability, hash/version preservation, unknown and
   conflict status, current/outdated distinction.
4. **Export:** HTML/PDF/CSV/JSON parity and redaction.
5. **Browser:** owner publish/revoke/revision, public reader, expired/revoked
   screen, desktop/mobile, keyboard and screen reader basics.
6. **Operations:** retention, backup/restore, revocation propagation, incident
   response, access telemetry, high-volume abuse.
7. **Compatibility:** old publication rendering after engine/provider/report UI
   version changes.

### 14.2 Gherkin acceptance scenarios

#### Immutable publication

```text
Given a report is published from snapshot S1
When the Passport receives newer snapshot S2
Then the published report still renders S1
And the report hash, captured time, and snapshot reference remain unchanged
And the reader sees that a newer revision may exist if policy allows
```

#### Outdated versus expired

```text
Given a published report has a valid expiry and a newer snapshot exists
When a recipient opens the report before expiry
Then the report is labeled OUTDATED, not invalid
And the original evidence remains readable
And the current revision link is explicit rather than automatic replacement
```

```text
Given a report has passed its expiry time
When a recipient opens the public link
Then the report body is not disclosed
And the page explains that the publication has expired
And no underlying private workspace metadata is revealed
```

#### Revocation

```text
Given an owner revokes a public report
When a previous recipient opens the same link
Then access is denied with a REVOKED state
And the original snapshot is not deleted
And the revocation is recorded in the audit trail
```

#### Redaction

```text
Given a report contains private case notes and public evidence findings
When the owner previews a public publication
Then private notes are excluded from the public projection
And any interpretation affected by the exclusion shows a limitation
And the public report still preserves evidence status semantics
```

#### Uncertainty preservation

```text
Given a selected snapshot contains UNKNOWN, UNAVAILABLE, and CONFLICT evidence
When the report is published
Then each state remains distinct in the public report
And no state is rendered as zero, false, safe, or verified
And the limitations section explains the affected coverage
```

#### Revision lineage

```text
Given report R1 was issued from snapshot S1
When the owner publishes a newer report from snapshot S2
Then the new report has a new immutable identifier
And it references R1 as its previous revision
And the reader can inspect the relevant changes without mutating R1
```

#### Tenant isolation

```text
Given a user guesses or submits a report identifier from another workspace
When the report is requested through an authenticated route
Then the foreign report is not disclosed
And public access only succeeds if that exact report is explicitly public
And the response does not reveal whether a private report exists
```

#### Public export parity

```text
Given a recipient can view a redacted public report
When they download the allowed JSON or PDF export
Then the export contains no data outside the visible publication policy
And it includes status, timestamps, versions, limitations, and evidence references
And it is clearly labeled as the same immutable publication
```

#### Responsive public reading

```text
Given a recipient opens a shared report on a mobile viewport
When they inspect status, findings, evidence, and limitations
Then all essential content is readable without horizontal scrolling
And expired, revoked, outdated, and conflict states are understandable without color alone
And verification and disclaimer sections remain reachable
```

## 15. Release gates

### Gate A — Safe Publication

- immutable manifest;
- explicit audience and expiry;
- redaction preview;
- public/private authorization;
- no private metadata leakage;
- English/Bahasa Indonesia.

### Gate B — Trustable Capsule

- verification/freshness panel;
- status distinction;
- evidence/provenance/limitation visible;
- snapshot immutability;
- responsive public reader;
- expired/revoked/unavailable behavior.

### Gate C — Revision and Decision Distribution

- revision lineage;
- Compare/Watchtower/Case references;
- export parity;
- access/revoke audit;
- retention/incident runbook;
- old publication compatibility.

### Gate D — Production Sharing

- abuse/rate-limit controls;
- cache/CSP/download security;
- operational metrics and alerting;
- backup/restore and revocation drill;
- privacy/legal review;
- no critical/high security or evidence integrity defects.

## 16. Success metrics

### Trust and integrity

- percentage of publications with complete manifest/version metadata;
- public report evidence reference completeness;
- snapshot mutation incidents;
- redaction leakage incidents;
- outdated/expired status comprehension in review testing;
- export-to-visible-content parity;
- old-publication render success rate.

### Safety and security

- unauthorized access attempts blocked;
- report enumeration rate;
- public/private cache leakage incidents;
- revoke propagation latency;
- suspicious access detection and response time;
- expired-link body disclosure incidents;
- sensitive-data exposure incidents.

### Product

- publish completion rate;
- recipient successful first-open rate;
- recipient verification-panel usage;
- report-to-case conversion;
- report-to-Compare/Watchtower follow-through;
- time to review a shared report;
- mobile completion rate;
- revocation/rotation usage.

### Operations

- p50/p95 public render latency;
- export success/failure rate;
- public traffic and cost per capsule;
- access event ingestion lag;
- retention cleanup success;
- notification or takedown response time.

Numeric targets should be set after baseline telemetry exists. Do not turn
unobserved guesses into product commitments.

## 17. Dependency map

```text
Core Scan
  -> immutable report/evidence/snapshot contract
    -> Risk Passport identity/history
      -> S0 publication + redaction boundary
        -> S1 Living Evidence Capsule
          -> S2 revisions + Compare/Watchtower lineage
            -> S3 recipients/collaboration
              -> S4 decision pack/export
                -> S5 verification/API/embed
                  -> S6 long-lived distribution
```

Hard dependencies:

- S0 depends on evidence status, report version, snapshot hash, and public/private
  boundary;
- S1 must not expose raw internal report JSON as a public API by accident;
- S2 must use Compare change semantics, not a second diff implementation;
- S3 depends on authentication, tenant RBAC, and notification policy;
- S4 depends on stable redaction and canonical content projection;
- S5 requires signature/key/revocation design before implementation;
- S6 requires privacy, legal, retention, and operational capacity review.

## 18. Definition of Done

Shared Report is **completed** only when:

1. owner can publish an immutable report from a completed snapshot or approved
   decision pack;
2. publication manifest records subject, snapshot, hash, versions, sections,
   redaction, audience, expiry, and lineage;
3. public/private access is explicit, tenant-safe, opaque, rate-limited, and
   non-enumerable;
4. public projection excludes private notes, workspace metadata, secrets, and
   unauthorized evidence;
5. `VERIFIED`, `OUTDATED`, `EXPIRED`, `REVOKED`, `UNAVAILABLE`, `UNVERIFIED`, and
   `CONFLICT` remain distinct;
6. new snapshot never mutates an old report; new evidence is a new revision;
7. reader can inspect captured/issued time, source scope, versions, coverage,
   limitations, and verification metadata;
8. owner can expire, revoke, rotate, archive, and audit publications;
9. Compare, Watchtower, Case, and export references preserve immutable lineage;
10. HTML/PDF/CSV/JSON outputs follow the same visibility and redaction policy;
11. mobile and desktop public/owner flows support loading, empty, stale,
    outdated, expired, revoked, unavailable, conflict, and permission states;
12. English and Bahasa Indonesia are complete and security/evidence wording is
    reviewed;
13. retention, backup/restore, abuse, link leakage, and revocation drills pass;
14. compatibility tests show old publications remain interpretable after schema,
    provider, engine, and presentation changes;
15. no critical/high defect remains in privacy, authorization, evidence
    integrity, or report interpretation.

## 19. Keputusan yang harus dikunci sebelum S0

- Default expiry and maximum expiry for public, restricted, and recipient links?
- Is public indexing always disabled, or can enterprise owners opt in?
- Which sections are public by default, and which require explicit approval?
- How should provider identity and raw source references be redacted?
- What is the minimum verification panel for a non-technical recipient?
- When an old report is outdated, may the owner expose a newer revision link?
- Who may publish/revoke/revise reports in each workspace role?
- What recipient authentication is required for restricted reports?
- Which exports are mandatory for consumer, B2B, compliance, and case flows?
- How long are report manifests, access events, exports, and revoked links kept?
- What is the legal/takedown process for a publicly shared report?
- Which signature/key model is appropriate before external cryptographic verification?
- What telemetry baseline is needed before setting public availability SLOs?

## 20. Prioritas final

Urutan yang tidak boleh dibalik:

1. **kunci publication, visibility, redaction, dan status semantics;**
2. **buat Living Evidence Capsule yang immutable dan responsive;**
3. **tambahkan expiry, revoke, abuse, dan access audit;**
4. **tambahkan revision lineage dengan Compare/Watchtower;**
5. **tambahkan recipient/case workflow dan export parity;**
6. **baru tambah signature, API, embed, dan long-lived distribution.**

Shared Report yang benar-benar selesai bukan link yang terlihat bagus. Ia adalah
mekanisme distribusi evidence yang memberi penerima cukup konteks untuk percaya
secara tepat—tidak terlalu percaya, tidak salah memahami freshness, dan tidak
pernah kehilangan batas antara evidence yang terverifikasi dan klaim keamanan.