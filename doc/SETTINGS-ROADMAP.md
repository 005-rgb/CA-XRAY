# JOBEN NETWORK — User Settings & Control Center Roadmap

Status dokumen: **roadmap pengembangan — belum ada implementasi dari dokumen ini**

## 1. Ringkasan eksekutif

Settings tidak boleh menjadi halaman formulir profil yang terpisah dari produk.
Settings harus menjadi **User Control Center**: tempat pengguna mengendalikan
identitas, keamanan, workspace, privasi, preferensi analisis, notifikasi,
integrasi, automasi, API, billing, dan jejak audit tanpa pernah dapat
melemahkan kontrak evidence JOBEN NETWORK.

Ide inti:

> **Evidence Operating Profile** — satu profil operasi yang menjelaskan bagaimana
> pengguna dan workspace ingin bekerja, tetapi tidak pernah mengubah fakta,
> status evidence, risk score, atau provenance.

Dengan model ini, setiap modul membaca policy dan preference yang sama:

```text
User identity + Workspace policy
        ↓
Settings control plane
        ↓
Scan / Passport / Compare / Watchtower / Case / Reports / API / Community
        ↓
Evidence-safe output + audit trail
```

Settings harus menjawab tiga pertanyaan setiap saat:

1. **Siapa yang mengakses?** — identity, session, role, workspace, step-up.
2. **Apa yang boleh dilakukan?** — capability, plan, scope, policy, consent.
3. **Bagaimana hasil harus disampaikan?** — locale, timezone, evidence
   presentation, notification, export, retention.

Settings bukan tempat untuk:

- mengubah evidence source, risk score, severity, atau confidence;
- mengubah hasil scan historis;
- mengaktifkan chain/provider yang belum memiliki capability nyata;
- menyimpan private key, seed phrase, wallet secret, raw provider credential,
  atau API key plaintext;
- membuat `UNKNOWN`, `UNAVAILABLE`, `UNVERIFIED`, atau `CONFLICT` terlihat aman;
- melewati role, tenant boundary, quota, moderation, approval, atau audit.

## 2. Baseline seluruh produk

### 2.1 Modul yang sudah tersedia atau memiliki foundation

| Modul | Kondisi saat ini | Dampak ke Settings |
|---|---|---|
| Public home dan auth | Sign-up/login, recovery, email verification, MFA flow, bilingual shell | Profile, credential, verification, session, MFA, privacy |
| Core Scan | EVM/Solana validation, provider-agnostic evidence, demo/live separation, risk/reliability | Default network, scan mode, evidence display, data/export |
| Scan History | Workspace-scoped history dan job read authorization | Retention, export, filters, saved views, deletion policy |
| Risk Passport | Snapshot, timeline, longitudinal identity | Freshness, watchlist defaults, report and alert preferences |
| Watchtower | Watchlist, schedule, rules, alert events, acknowledgement, queue foundation | Monitoring defaults, alert routing, quiet hours, escalation |
| Compare | Multi-contract evidence comparison foundation | Comparison defaults, saved comparison policy, export format |
| Shared Reports | Report/publication foundation dan roadmap lengkap | Sharing defaults, redaction, expiry, recipient/access notifications |
| API Access | API v1, scoped key issue/revoke, async scan, bundle, signed report, metering; UI masih preview | Key lifecycle, scopes, quota, webhook, developer settings |
| Evidence Community | Profile, annotation, review, dispute, moderation, reputation quality-derived | Community identity, contribution visibility, alerts, conflict/privacy |
| Case Workspace | Tenant-scoped case mutations dan append-only timeline | Case defaults, role, review queue, retention, export |
| Listing/compliance | Versioned policy, evidence register, approvals, expiry, bilingual output | Workspace governance, approval policy, compliance notifications |
| Network intelligence | Deployer/funding observations, clusters, behavior comparison, inferred labels | Sensitive insight visibility, retention, sharing, capability display |
| Platform Ops | Admin-only provider posture, flags, inventory, approvals, audit | Dipisahkan dari user Settings; hanya status yang relevan boleh terlihat |
| Billing/plan | Plan catalog dan usage foundation; payment belum aktif penuh | Usage visibility, limits, invoice/export, owner-only controls |
| Persistence/queue | PostgreSQL migration path, development memory mode, durable production direction | Data lifecycle, retention, recovery, environment disclosure |
| Localization | English dan Bahasa Indonesia sebagai kontrak produk | Semua Settings copy, error, email, export, audit label harus bilingual |

### 2.2 Roadmap produk yang harus ikut dipertimbangkan

Roadmap Settings tidak berdiri sendiri. Ia harus menjadi dependency surface untuk:

- production-grade PostgreSQL, durable queue, retry, dead-letter, backup,
  restore, health, metrics, dan provider outage;
- Compare yang lebih kaya dengan saved comparison dan evidence lineage;
- Shared Report dengan immutable manifest, redaction, expiry, revocation,
  revision, access event, public verification, dan export pack;
- Watchtower dengan materiality, grouping, suppression, escalation, delivery
  retry, dead-letter, health, dan case handoff;
- API Access dengan durable key store, rotation, environment, idempotency,
  rate/quota, webhook signature, SDK, versioning, dan developer portal;
- Community sebagai Evidence Commons dengan revision, structured claim,
  provenance, conflict-of-interest, moderation queue, appeal, dan anti-sybil;
- Case/Compliance dengan assignments, evidence request, approval, expiry,
  audit, immutable decision log, dan report generation;
- network intelligence yang memperluas coverage tanpa menyamakan inference
  dengan observed fact.

## 3. Baseline Settings saat ini

### Sudah ada

- navigasi Settings dengan bagian Profile, Security, Preferences,
  Notifications, Privacy & Data, Workspace, dan Billing;
- display name dan email read-only;
- perubahan password dengan minimum panjang dan revocation sesi lain;
- daftar active sessions dan aksi “sign out others”;
- preferensi default network dan preferensi analisis;
- preferensi notifikasi tersimpan per user dan workspace;
- export data melalui daftar scan workspace;
- account deletion request dengan masa tunggu 30 hari dan pembatalan;
- edit nama workspace;
- daftar anggota dan invite berbasis role;
- ringkasan plan, workspace type, dan billing status;
- tabel `user_preferences` scoped oleh `(user_id, workspace_id)`;
- tabel account deletion request dengan status dan scheduled deletion;
- endpoint authenticated untuk preferences, deletion, sessions, workspace, dan
  invite;
- role/tenant boundary dan audit foundation di auth service;
- English/Indonesian product contract.

### Belum production-complete

- preferences masih berupa JSON bebas, belum memiliki schema/version/policy
  registry atau validasi field per modul;
- belum jelas pemisahan preference pribadi, workspace policy, dan role-protected
  setting;
- belum ada optimistic concurrency/version conflict untuk dua tab atau dua admin;
- belum ada change history yang menjawab siapa mengubah policy apa dan mengapa;
- session/device management belum memiliki device label, last activity yang kaya,
  revoke per device, suspicious login, atau session event timeline;
- MFA/security center belum menjadi setup, recovery, backup-code, step-up, dan
  trusted-device workflow end-to-end;
- email change, verification state, recovery address, dan notification consent
  belum menjadi lifecycle yang lengkap;
- timezone, date/number format, locale persistence, dan evidence presentation
  preference belum menjadi kontrak lintas UI/report/email/API;
- notification center belum memiliki channel registry, delivery state,
  quiet hours, digest, escalation, preference precedence, atau delivery log;
- workspace member administration belum mencakup pending invite lifecycle,
  role change approval, remove/restore, ownership transfer, SCIM/SSO future
  boundary, dan permission preview;
- data export belum menjadi asynchronous export job dengan manifest, status,
  integrity, filters, retention, and downloadable archive;
- deletion hanya berupa account request, belum memiliki impact preview,
  workspace ownership transfer, legal hold, export-before-delete, erasure
  proof, dan provider/backup policy;
- API Access UI belum dapat mengelola key lifecycle, scopes, limits, webhook,
  usage, SDK, dan signed verification;
- billing belum memiliki checkout, invoice, payment method, plan change,
  proration, entitlement explanation, dan owner approval;
- belum ada settings health/status yang menjelaskan setting mana aktif,
  tertunda, tidak tersedia, konflik, atau memerlukan admin;
- belum ada import/export **Settings Profile** yang aman dan tidak membawa
  secret;
- belum ada accessibility, mobile task flow, localization, security, recovery,
  and audit release gate khusus Settings.

## 4. Prinsip desain dan policy

### 4.1 Preference hierarchy

Setiap nilai harus memiliki sumber dan precedence yang terlihat:

```text
Platform safety baseline
  > Workspace policy
    > User preference
      > Per-view temporary choice
```

Nilai yang tidak boleh dioverride user: security minimum, tenant isolation,
evidence semantics, provider disclosure, audit requirement, legal retention,
dan capability truth.

### 4.2 Private by default, explicit sharing

Default untuk scan, Passport, network intelligence, case, community,
annotation, report, dan API adalah workspace-private. Sharing ke recipient atau
public harus merupakan tindakan eksplisit dengan audience, sections, expiry,
redaction, dan audit yang jelas.

### 4.3 Safe settings, not silent magic

Setiap setting harus menjelaskan:

- scope: account, workspace, view, integration, atau platform;
- siapa yang boleh mengubah;
- kapan berlaku;
- modul yang terdampak;
- apakah perubahan retroaktif atau hanya untuk pekerjaan baru;
- status `ACTIVE`, `PENDING`, `BLOCKED`, `UNAVAILABLE`, atau `CONFLICT`;
- cara rollback atau recovery.

### 4.4 Evidence Contract Firewall

Settings menjadi firewall sebelum preference diterapkan ke modul. Contoh:

- “hide low confidence” hanya menyembunyikan tampilan, tidak menghapus data;
- “risk threshold” mengatur filter/alert, bukan risk score;
- “ignore provider disagreement” tidak boleh mengubah conflict menjadi verified;
- “auto-approve” tidak boleh menggantikan human approval;
- “public report default” tidak boleh melewati redaction dan expiry;
- “AI summary” bila kelak ada hanya boleh merangkum evidence dan harus
  mempertahankan uncertainty.

## 5. Information architecture Settings

### A. Overview — Evidence Operating Profile

Satu halaman ringkas yang menampilkan:

- security posture: MFA, password age, active sessions, recovery readiness;
- workspace posture: role, plan, usage, pending invites, policy conflicts;
- evidence posture: provider/network coverage, stale/degraded services;
- automation posture: active Watchtower, notification delivery, API keys,
  webhooks, exports;
- “needs attention” queue dengan alasan dan tindakan yang aman;
- effective settings preview: “How JOBEN will behave for you”.

### B. Profile & Identity

- display name, avatar/initial, email verification state;
- change email dengan re-authentication, verification, cooldown, dan audit;
- recovery email/status tanpa membocorkan akun;
- language, timezone, date/number format;
- researcher profile link untuk Evidence Community;
- exportable public researcher identity terpisah dari private account identity;
- account alias untuk report attribution tanpa mempublikasikan email.

### C. Security Center

- change password dan password strength/breach-safe guidance;
- MFA enrollment, authenticator, backup codes, recovery flow;
- recent security events: login, recovery, password, MFA, invite, key, export,
  deletion, sharing;
- active sessions: device/browser, approximate location if policy permits,
  created/last seen, current marker, revoke one/all;
- suspicious login review dan forced re-authentication;
- trusted device policy dengan expiry, bukan bypass permanen;
- step-up confirmation untuk destructive, sharing, API, billing, dan ownership
  actions;
- emergency “lock down account” yang mencabut sessions, API keys, webhooks,
  shares, dan pending invites melalui explicit confirmation.

### D. Analysis & Evidence Preferences

- default network hanya dari registry capability nyata;
- scan mode default: demo/live dengan label yang tidak ambigu;
- default report sections dan evidence density;
- show/hide presentation filters untuk low-confidence/stale items tanpa
  menghapus evidence;
- default compare layout, baseline/current orientation, and export format;
- default Passport timeline range dan freshness display;
- default network intelligence visibility: observed/inferred/verified selalu
  dibedakan;
- default case evidence sort, severity display, and review density;
- saved view naming dengan scope personal/workspace;
- reset ke product-safe defaults, dengan preview dampak.

### E. Notifications & Evidence Pulse

Notification matrix per event, module, channel, severity, dan role:

- Watchtower: pulse created, material change, provider degraded, alert
  acknowledgement reminder, escalation;
- scan: accepted, completed, failed, unavailable, stale;
- case: assignment, mention, evidence request, review due, approval, expiry;
- community: peer review, dispute, moderation, annotation revision;
- report: recipient access, expiry, revocation, new revision;
- API: key created/used/expiring, quota warning, webhook failure, incident;
- billing: usage threshold, invoice, payment/plan event;
- security: login, MFA, recovery, password, session, export, deletion.

Kontrol:

- in-app inbox sebagai source of truth;
- email/webhook/push hanya delivery channel;
- immediate, digest, atau off untuk event yang boleh dimatikan;
- critical security, destructive, compliance, dan delivery failure tidak boleh
  diam-diam dimatikan;
- quiet hours dengan timezone dan override untuk critical events;
- deduplication/grouping agar satu Evidence Pulse tidak menjadi spam;
- delivery log, retry, dead-letter, test notification, dan explainability.

### F. Workspace & Governance

- workspace switcher dan active workspace indicator;
- workspace profile: name, type, plan, timezone, default locale;
- member/invite lifecycle: pending, resend, expire, revoke, accept;
- role matrix dan permission preview: “what this role can do”;
- ownership transfer dengan confirmation, step-up, cooldown, dan audit;
- member removal impact preview terhadap case, watchlist, report, API, dan
  community contribution;
- workspace-wide defaults untuk scan, reports, notifications, retention,
  community visibility, API policy, and approvals;
- approval rules: two-person approval, independent reviewer, role separation,
  conflict-of-interest;
- workspace archive/restore dan workspace deletion dengan legal/ownership guard;
- policy versioning, effective date, rollback, and change reason.

### G. Privacy, Data & Retention

- data inventory: account, workspace, scans, evidence, Passport, alerts,
  cases, reports, community, API usage, audit;
- export scope selector: account-only, workspace-owned, selected modules,
  date range, JSON/CSV/PDF/manifest;
- async export job dengan progress, expiry, checksum, and download audit;
- retention policy per data class dengan minimum safety/legal boundary;
- “what will be deleted / retained / anonymized” preview;
- account deletion scheduling, cancel, ownership transfer, legal hold;
- workspace deletion/archive policy;
- report link revoke/expiry dan API key/webhook cleanup impact;
- backup/queue retention disclosure tanpa mengklaim erasure sebelum benar-benar
  diverifikasi;
- privacy-safe analytics and consent registry.

### H. Sharing, Reports & Community

- default visibility: private workspace, selected members, recipient, public;
- default report redaction and section policy;
- default expiry and revision behavior;
- access/revocation notifications;
- community contribution visibility dan researcher attribution;
- conflict-of-interest declarations;
- moderation notification preferences;
- “preview as recipient” dengan redaction/evidence status yang sama seperti
  audience sebenarnya;
- share policy guardrail yang mencegah public exposure dari private notes,
  internal metadata, raw credentials, dan hidden identifiers.

### I. API Access & Developer

Halaman Settings harus menjadi control plane API yang nyata setelah roadmap API
Access delivery:

- issue/revoke/rotate/revoke-all key;
- one-time reveal, hash-only storage, expiry, environment label;
- least-privilege scopes dan per-operation capability explanation;
- key owner, last used, created, expiry, status, usage, and anomaly;
- per-key rate/quota policy tanpa bypass melalui key rotation;
- idempotency/replay policy visibility;
- signed report verification, issuer key version, and public verification info;
- webhook endpoint management, signature secret rotation, replay protection,
  retry/dead-letter, delivery test;
- API version, SDK language, OpenAPI, changelog, deprecation status;
- usage ledger, quota reservation, projected usage, and export;
- sandbox/test key yang tidak dapat mengakses production workspace data;
- “copy setup instructions” tanpa menampilkan secret di URL, source, atau log.

### J. Billing & Plan

- plan/entitlement comparison berbasis capability, bukan hanya scan count;
- current usage, reserved usage, overage risk, reset date, and estimate;
- owner-only payment and plan actions;
- checkout/payment method/invoice ketika provider billing telah authorized;
- plan change preview: capability impact, workspace impact, proration;
- downgrade guardrail jika active watchlist, API, members, retention, atau
  reports melampaui plan;
- billing event audit dan notification;
- no placeholder price IDs, fake payment success, atau secret di frontend.

### K. Accessibility & Presentation

- responsive desktop/mobile dengan deep-link section;
- keyboard navigation dan visible focus;
- screen-reader labels, error association, live status;
- destructive action confirmation tidak hanya mengandalkan color;
- reduced motion;
- locale-aware dates, numbers, timezone, and pluralization;
- dense forensic tables memiliki mobile card alternative;
- setting status menggunakan text + icon, bukan warna saja.

## 6. Delivery sequence

### S0 — Contract and inventory gate (NOW)

**Outcome:** Settings memiliki model domain dan dependency contract sebelum UI
besar dibangun.

- definisikan schema/version untuk account preference, workspace policy,
  notification policy, security state, sharing defaults, API policy, and
  retention policy;
- pisahkan `user_preference`, `workspace_policy`, `effective_setting`, dan
  `platform_constraint`;
- buat capability registry contract yang dibaca Scan, Network, Watchtower,
  API, Reports, Community, dan Billing;
- inventaris semua data class, owner, retention, exportability, visibility,
  destructive impact, dan audit requirement;
- definisikan precedence, conflict, pending, unavailable, dan rollback;
- threat model Settings sebagai control-plane trust boundary;
- tetapkan event taxonomy dan correlation ID;
- putuskan setting mana yang berlaku retroaktif dan mana yang hanya untuk job
  baru.

**Gate:** tidak ada setting yang dapat ditambahkan tanpa scope, owner,
permission, effective time, audit event, localization key, dan recovery story.

### S1 — Secure Settings foundation (NOW)

**Outcome:** account, session, preference, and audit controls dapat dipercaya.

- durable preference persistence dan migration contract;
- schema validation, allowlist, size limit, and version migration;
- optimistic concurrency dan stale-write conflict;
- profile/email verification lifecycle;
- security center: MFA, recovery, backup codes, step-up, sessions, security
  event timeline;
- re-authentication untuk sensitive action;
- audit event untuk read/write/export/share/destructive operation;
- effective-setting endpoint yang mengembalikan source dan reason;
- bilingual error/status contract.

**Release gate:** tenant isolation, CSRF/session security, replay resistance,
rate limiting, secret redaction, audit completeness, and recovery drill.

### S2 — Evidence Operating Profile (NEXT)

**Outcome:** pengguna dapat menyesuaikan dashboard tanpa merusak evidence.

- Overview posture cards dan needs-attention queue;
- locale/timezone/format;
- analysis defaults untuk Scan, Passport, Compare, Case, Network Intelligence;
- safe presentation filters yang tidak menghapus evidence;
- saved views personal/workspace;
- reset/preview/effective setting explanation;
- capability-aware network/provider choices;
- desktop/mobile acceptance.

**Release gate:** setiap filter diuji agar `UNKNOWN`, `UNAVAILABLE`,
`UNVERIFIED`, `CONFLICT`, dan `VERIFIED` tetap benar.

### S3 — Notification & automation control plane (NEXT)

**Outcome:** Evidence Pulse dapat diatur, dipahami, dan diaudit.

- event/channel registry;
- in-app inbox;
- immediate/digest/off dengan non-disableable critical events;
- timezone-aware quiet hours;
- Watchtower materiality, grouping, suppression, escalation;
- delivery status, retry, dead-letter, test delivery;
- route alert-to-case policy;
- cross-module preference precedence.

**Dependency:** Watchtower W0–W3, durable queue, notification integration, and
provider health telemetry.

### S4 — Workspace governance and collaboration (NEXT)

**Outcome:** owner/admin dapat mengelola workspace secara aman, bukan hanya
mengganti nama dan mengundang email.

- role/capability matrix dan permission simulator;
- pending invite lifecycle;
- ownership transfer, member removal impact, archive/restore;
- approval and independence policy;
- workspace defaults, policy version, effective date, rollback;
- case/compliance governance;
- community moderation and conflict-of-interest policy;
- workspace audit export.

**Dependency:** Case/Compliance review workflow, Community moderation, durable
audit, and plan entitlement registry.

### S5 — Privacy, retention, export, and lifecycle (NEXT)

**Outcome:** user memahami dan mengendalikan data tanpa janji erasure palsu.

- data inventory and retention dashboard;
- asynchronous export jobs, manifest, checksum, expiry;
- account/workspace deletion impact preview;
- transfer ownership and legal hold;
- staged deletion, cancellation, completion proof;
- report/API/webhook/member cleanup;
- backup and queue retention disclosure;
- privacy-safe telemetry and consent record.

**Dependency:** durable PostgreSQL/queue, background worker, Shared Report S6/S12,
and operational backup/restore.

### S6 — API Access, sharing, and billing surfaces (LATER / gated)

**Outcome:** Settings menjadi control plane monetizable dan integratable.

- API key lifecycle, scopes, quota, usage, webhook, SDK, and signed report
  settings;
- Shared Report audience, redaction, expiry, revocation, revision;
- billing entitlements, payment, invoice, plan change;
- downgrade/upgrade impact preview;
- owner approval and billing audit;
- sandbox vs production boundary.

**Dependency:** API Access A0–A8, Shared Report S1–S12, billing provider
authorization, and production security gates. Tidak boleh memakai fake payment,
placeholder secret, atau production key di client.

### S7 — Advanced intelligence and long-term adaptability (LATER)

Directional capabilities setelah fondasi aman:

- **Policy Linter:** memberi peringatan “policy conflict” sebelum pengguna
  mengaktifkan kombinasi yang menghasilkan blind spot;
- **Evidence Budget Planner:** menunjukkan biaya, freshness, provider coverage,
  dan quota sebelum menjalankan scan/watch;
- **Forensic Workspace Presets:** preset “Due Diligence”, “Listing Review”,
  “Incident Response”, dan “Research Lab” yang hanya mengubah defaults, bukan
  evidence semantics;
- **Change Impact Simulator:** preview modul, notification, API output, report,
  retention, dan collaborator yang terdampak sebelum save;
- **Trust Snapshot:** satu exportable, signed, timestamped snapshot tentang
  effective policy dan evidence display settings untuk audit;
- **Safe Settings Import:** import preset tanpa secret, dengan diff, schema
  version, dry-run, and approval;
- **Incident Lockdown:** satu prosedur darurat untuk mencabut access surface
  dengan staged recovery dan immutable audit;
- **Capability Drift Radar:** memberi tahu ketika provider/network capability
  berubah, tanpa mengaktifkan capability secara otomatis;
- **Settings Copilot (future, bounded):** hanya menjelaskan settings,
  menemukan konflik, dan membuat draft perubahan; tidak dapat mengubah evidence,
  policy, credential, atau destructive state tanpa user confirmation dan
  step-up.

## 7. Security and privacy invariants

1. Semua setting write menggunakan authenticated, tenant-scoped context.
2. Role check dilakukan server-side; UI hide bukan authorization.
3. Sensitive read/write memerlukan re-authentication atau recent step-up.
4. API key, webhook secret, backup code, recovery token, dan password tidak
   pernah dikembalikan setelah one-time reveal atau ditulis ke audit/log.
5. Settings read response tidak membocorkan keberadaan resource tenant lain.
6. Destructive action idempotent, confirmable, auditable, dan dapat dipulihkan
   jika policy mengizinkan.
7. Preference tidak dapat override platform safety, evidence semantics, quota,
   retention minimum, atau approval separation.
8. Change yang memengaruhi collaborator selalu menampilkan impact preview.
9. Export memiliki scope, expiry, integrity metadata, access event, dan
   anti-enumeration.
10. Notification delivery tidak menjadi sumber kebocoran workspace atau
    evidence; subject/body mengikuti redaction policy.
11. Webhook/API endpoint melewati SSRF, private-network, DNS rebinding, replay,
    signature, and rate-limit controls.
12. Locale tidak mengubah enum, status, score, severity, evidence ID, atau
    authorization semantics.
13. Audit append-only membedakan actor, subject, workspace, before/after
    redacted diff, reason, correlation ID, dan result.
14. “Off”, “hidden”, “filtered”, “unavailable”, dan “deleted” tetap berbeda.

## 8. Cross-module dependency matrix

| Settings capability | Konsumen utama | Kontrak yang wajib dipenuhi |
|---|---|---|
| Locale/timezone/format | Semua UI, report, email, audit, export | Presentation-only; machine fields tetap language-neutral |
| Default network | Scan, Passport, Compare, Watchtower | Hanya network dengan verified runtime capability |
| Evidence display | Scan, Passport, Compare, Case, Report | Filter tidak menghapus atau mengubah source status |
| Notification policy | Watchtower, Case, Community, Report, API, Billing | Critical events dan delivery failures tetap observable |
| Workspace roles | Semua tenant-scoped module | Server-side capability + least privilege |
| Retention | Scan, Passport, Case, Report, Community, API | Minimum/legal/hold guardrails dan deletion proof |
| Export | Scan, Case, Report, Community, API usage, audit | Async, scoped, checksum, expiry, audit |
| Sharing defaults | Shared Report, Community, Case, Network intelligence | Explicit audience, redaction, expiry, revocation |
| API policy | API Access, SDK, webhooks, reports | Durable keys, scopes, quota, replay, signatures |
| Billing entitlement | Scan, Watchtower, API, seats, retention | Capability registry; no client-only enforcement |
| Security posture | Auth, API, shares, billing, deletion, governance | MFA/step-up/re-auth and emergency revoke |
| Effective settings | Semua modul | Source, version, status, conflict, effective timestamp |

## 9. Acceptance criteria (Gherkin)

### Account and security

```gherkin
Given a user is signed in to workspace A
When the user requests settings
Then only account data and workspace-A effective settings are returned
And no workspace-B metadata is disclosed

Given a user changes a password
When the change succeeds
Then other active sessions are revoked
And a security audit event is recorded
And the current session state is explained

Given a user attempts to issue an API key, export data, publish a report,
delete an account, or transfer ownership
When recent step-up is missing or expired
Then the action is blocked before mutation
And the response does not disclose protected resource details
```

### Evidence-safe preferences

```gherkin
Given a user enables a low-confidence display filter
When a report or dashboard is rendered
Then the filter changes presentation only
And UNKNOWN, UNAVAILABLE, UNVERIFIED, CONFLICT, and VERIFIED remain distinct
And the user can reveal filtered evidence

Given a user selects a network
When that network lacks verified runtime capability
Then it is unavailable with an explanation
And the setting cannot silently fall back to another network
```

### Workspace governance

```gherkin
Given a workspace owner changes a workspace-wide notification policy
When members have personal preferences
Then the effective result shows workspace precedence and member exceptions
And the change records actor, reason, version, and impact

Given an owner attempts to leave or delete a workspace with active ownership
When no successor is confirmed
Then the action is blocked
And affected cases, watchlists, reports, keys, and members are listed
```

### Privacy and lifecycle

```gherkin
Given a user requests an export
When the export is prepared
Then it is an asynchronous scoped job with manifest, checksum, expiry, and audit
And secrets and unauthorized workspace data are excluded

Given a user schedules deletion
When the impact preview is shown
Then retained, anonymized, deleted, and blocked data classes are explicit
And team ownership and legal hold blockers are enforced
```

### Notifications

```gherkin
Given a Watchtower event is grouped into an Evidence Pulse
When the user has quiet hours enabled
Then non-critical delivery is deferred or digested
And critical security, compliance, and delivery-failure events remain observable
And the delivery state is replayable from the notification log
```

## 10. Quality and release gates

### Test layers

1. Unit: schema, precedence, validation, redaction, status transitions.
2. Authorization: account/workspace/role/owner/moderator/admin matrix.
3. Security: session fixation, CSRF, replay, rate limit, SSRF, secret leakage,
   enumeration, concurrent writes, step-up expiry.
4. Data lifecycle: export scope, retention, deletion cancellation/completion,
   backup disclosure, legal hold.
5. Contract: locale, timezone, capability registry, provider outage, API/report
   version and status semantics.
6. Cross-module: settings change to Scan, Watchtower, Case, Report, API,
   Community, Billing, and Network Intelligence.
7. Browser: desktop/mobile, keyboard, screen reader labels, reduced motion,
   deep links, unsaved changes, error/retry/empty/loading states.
8. Recovery: account lock down, key revoke-all, webhook failure, queue retry,
   stale preference conflict, and restore drill.

### Release gates

- no cross-tenant read or write;
- no secrets in response, HTML, logs, audit diff, export, or notification;
- all sensitive mutations have step-up/re-auth policy;
- effective settings explain source, scope, version, and impact;
- all user-facing copy exists in English and Bahasa Indonesia;
- all evidence uncertainty states survive every preference and export path;
- critical notifications cannot be disabled without explicit policy explanation;
- deletion/export/report/API lifecycle has observable state and audit;
- mobile and keyboard acceptance passes for every Settings section;
- API, queue, provider, billing, and report integrations fail explicitly;
- operations has runbook, metrics, alerting, and incident response;
- rollback leaves prior effective setting and audit history intact.

## 11. Success metrics

Metrics harus diukur setelah telemetry tersedia, bukan ditebak sebelum baseline:

- time-to-complete common Settings task;
- percentage of users with MFA/recovery readiness;
- unresolved security posture issues;
- settings save conflict and rollback rate;
- notification delivery success, latency, duplicate, and dead-letter rate;
- export completion, failure, expiry, and unauthorized-attempt rate;
- deletion request cancellation/completion and blocked-impact reasons;
- alert-to-case conversion after notification policy improvements;
- API key rotation/revocation time and anomalous-use containment;
- report/share revocation time;
- percentage of modules using effective-setting contract;
- false-confidence incidents caused by presentation/configuration;
- support contacts caused by unclear policy or entitlement.

## 12. Definition of Done

Settings dianggap **completed, real work, full feature** hanya bila:

1. semua section pada Information Architecture tersedia sesuai role dan
   capability, bukan placeholder;
2. account, workspace, effective settings, audit, notification, retention,
   export, sharing, API, and billing models memiliki schema/version contract;
3. seluruh mutation memiliki authorization server-side, validation, step-up
   bila perlu, idempotency, audit, dan recovery/error state;
4. Settings benar-benar mengendalikan perilaku Scan, Passport, Compare,
   Watchtower, Case, Shared Reports, API, Community, Network Intelligence, dan
   Billing sesuai dependency matrix;
5. tidak ada setting yang mengubah evidence source, risk score, severity,
   confidence, provenance, atau uncertainty semantics;
6. API Access memiliki key lifecycle secure dan UI production-grade, bukan
   “coming soon”;
7. notification memiliki in-app source of truth, delivery status, retry,
   digest/quiet hours, grouping, escalation, dan dead-letter;
8. export, retention, deletion, sharing, report, webhook, dan key lifecycle
   memiliki observable state serta audit trail;
9. workspace governance mencakup member lifecycle, role/permission preview,
   ownership transfer, approval, conflict-of-interest, dan impact preview;
10. semua critical flow lulus tenant, security, data lifecycle, contract,
    accessibility, responsive, localization, recovery, dan operations gates;
11. dokumentasi user menjelaskan efek setiap setting, precedence, limitation,
    dan cara pemulihan;
12. tidak ada fake provider, fake billing, fake delivery, fake security status,
    atau silent fallback;
13. Settings dapat berkembang sepuluh tahun melalui versioned schema, capability
    discovery, migration, deprecation, and compatibility policy.

## 13. Urutan keputusan yang harus dikunci

Sebelum S1 dimulai, product dan engineering harus mengunci:

- apakah workspace policy dapat memaksa preference user dan pengecualiannya;
- retention minimum per evidence/data class dan legal hold authority;
- role matrix final untuk owner, member, reviewer, moderator, billing, dan
  platform admin;
- MFA/step-up provider dan recovery responsibility;
- notification channel yang benar-benar akan didukung;
- billing entitlement source of truth;
- public report/community/API sharing boundary;
- export format, checksum, expiry, and maximum scope;
- compatibility horizon untuk preference schema dan API/report settings;
- target telemetry dan SLO setelah runtime production tersedia.
