# Fase Pembangunan CA X-RAY

Dokumen ini adalah urutan eksekusi dari PRD `DOC/PRD-CA-XRAY-PLATFORM.md`.
Roadmap kini berisi **10 fase (Fase 0–9)** setelah capability differentiation,
retention, dan developer distribution disetujui.
Fase berikut harus dikerjakan berurutan; setiap fase memiliki gate sebelum fase
berikutnya dimulai.

## Prinsip delivery

- Selesaikan core dan security boundary sebelum monetisasi.
- Pertahankan modular monolith sampai load test membuktikan kebutuhan pemisahan.
- Semua perubahan schema menggunakan migration dan rollback plan.
- Tidak ada silent fallback, silent data loss, atau authorization hanya di UI.
- Setiap fase menghasilkan test dan bukti verifikasi yang dapat diulang.

## Ringkasan fase

| Fase | Fokus | Prioritas | Gate |
|---|---|---:|---|
| 0 | Keputusan produk dan baseline | P0 | Scope serta target operasional disetujui |
| 1 | Architecture dan threat model | P0 | Trust boundary dan risk register disetujui |
| 2 | Core engine audit dan API adaptability | P0 | Core stabil, versioned, dan provider-resilient |
| 3 | PostgreSQL dan persistence | P0 | Data durable, tenant-ready, recoverable |
| 4 | Authentication dan tenant isolation | P0 | Tidak ada akses lintas tenant |
| 5 | Private dashboard dan scan jobs | P0 | User dapat menjalankan dan menelusuri scan |
| 6 | Continuous intelligence dan retention | P1 | Risk Passport dan Watchtower menghasilkan repeat value |
| 7 | Superadmin operations | P1 | API provider dan platform dapat dikelola aman |
| 8 | Subscription, entitlements, dan API product | P1 | Monetisasi dan developer distribution aman |
| 9 | Scale, observability, dan go-live hardening | P0 | SLO, load baseline, recovery, dan security gate lulus |

---

## Fase 0 — Keputusan produk dan baseline

**Tujuan:** mengunci asumsi yang memengaruhi desain dan biaya.

**Output:**

- Definisi registered user, MAU, concurrent user, scans/minute, evidence
  retention, RPO, RTO, dan availability SLO.
- Keputusan identity provider, billing provider, currency/tax policy, dan model
  personal workspace atau team workspace.
- Daftar network/provider yang menjadi scope awal.
- Baseline dari `server.js`, `src/engine.js`, `public/`, dan `test/`.

**Gate:** owner menyetujui scope P0, target kapasitas, dan non-goals.

## Fase 1 — Architecture dan threat model

**Tujuan:** menetapkan boundary keamanan sebelum menambah data dan akun.

**Output:**

- Architecture decision record untuk API, core, provider adapter, job queue,
  PostgreSQL, cache, object storage, identity, billing, dan admin.
- Threat model untuk account takeover, IDOR/BOLA, cross-tenant leakage, SSRF,
  abuse, secret exposure, webhook spoofing, dan evidence tampering.
- RBAC awal: user, member, workspace owner, superadmin.
- Security baseline: secret handling, session, MFA admin, rate limit, audit log,
  retention, backup, restore, dan incident response.

**Gate:** tidak ada boundary kritis yang ambigu; threat register memiliki owner dan
mitigasi untuk semua risiko P0.

## Fase 2 — Core engine audit dan API adaptability

**Tujuan:** membuat core analysis menjadi komponen yang stabil dan mampu bertahan
terhadap perubahan API eksternal.

**Output:**

- Adapter contract yang memisahkan schema GoPlus/DexScreener dari core engine.
- Normalization layer dengan status `valid`, `unknown`, `unavailable`, dan
  `provider_error`.
- Timeout, retry terbatas, circuit breaker, quota protection, dan provider health.
- Provenance: provider, retrieved time, confidence, evidence reference, dan
  engine/model version.
- Contract tests, malformed/partial response tests, regression tests, dan
  deterministic fixtures.
- Tidak ada fallback demo atau konversi error menjadi angka nol.

**Gate:** provider response yang null, berubah, malformed, partial, timeout, atau
  gagal menghasilkan output yang jujur, teruji, dan tidak merusak core.

## Fase 3 — PostgreSQL dan persistence

**Tujuan:** memindahkan state penting dari proses aplikasi ke storage durable.

**Output:**

- Migration schema untuk users, workspaces, memberships, scan jobs, scans,
  findings, evidence, providers, audit logs, plans, subscriptions, dan usage.
- Foreign key, unique/check constraint, tenant ownership, dan indeks query utama.
- Idempotency untuk scan creation dan webhook event.
- Retention, archival, encrypted backup, restore procedure, dan rollback migration.
- Object storage untuk payload/evidence besar; cache hanya sebagai acceleration layer.

**Gate:** data tetap konsisten setelah restart, duplicate request, partial failure,
migration rollback, dan restore drill.

## Fase 4 — Authentication dan tenant isolation

**Tujuan:** membuat private data benar-benar aman antar-user dan workspace.

**Output:**

- Sign up/sign in/sign out, account recovery, session management, dan MFA untuk
  superadmin.
- Workspace, membership, role, invite, disable member, dan ownership transfer.
- Server-side authorization pada setiap resource private.
- Test IDOR/BOLA dan negative test untuk akses lintas workspace.
- Audit event untuk login, role change, invite, disable, dan privilege escalation.

**Gate:** seluruh private endpoint menolak resource tenant lain, termasuk saat ID,
  URL, atau request body dimanipulasi.

## Fase 5 — Private dashboard dan scan jobs

**Tujuan:** memberikan pengalaman utama user tanpa membebani request HTTP.

**Output:**

- Dashboard scan, job status, history, detail report, findings, evidence, usage,
  dan workspace membership.
- Background job untuk scan berat dengan job status, idempotency, retry, timeout,
  dan safe cancellation.
- Pagination, filtering, export sesuai entitlement, correlation/request ID.
- Data report immutable setelah selesai; perubahan model menghasilkan version baru.

**Gate:** user dapat membuat scan, melihat progress, membuka hasil miliknya, dan
  menelusuri evidence tanpa blocking request atau kebocoran tenant.

## Fase 6 — Continuous intelligence dan retention moat

**Tujuan:** mengubah scan satu kali menjadi sistem intelligence yang membuat user
terus kembali dan memiliki alasan kuat untuk berlangganan.

**Output:**

- Risk Passport per kontrak: risk, reliability, findings, evidence, timestamp,
  engine version, dan status current/outdated.
- Watchlist, jadwal monitoring, deduplication, alert threshold, dan notification
  delivery.
- Risk timeline serta **Why Did Risk Change?** dengan snapshot before/after,
  evidence, confidence, dan dampak perubahan.
- Evidence graph untuk contract, owner, privileged wallet, proxy, pair, liquidity,
  dan holder cluster.
- Provider consensus yang memperlihatkan konflik provider tanpa silent averaging.
- Compare/benchmark, verified report dengan evidence hash dan expiration, serta
  scenario simulator yang jelas berlabel simulasi.
- Team workflow: komentar, assign finding, status `open/reviewing/resolved`, dan
  approval checklist.
- Weekly intelligence digest berbasis perubahan evidence, bukan engagement noise.

**Gate:** perubahan evidence menghasilkan snapshot dan alert yang idempotent;
report dapat diverifikasi; data private tetap tenant-scoped; simulator tidak
dipresentasikan sebagai prediksi atau nasihat finansial.

## Fase 7 — Superadmin operations

**Tujuan:** memberi operator kontrol platform tanpa mengekspos secret.

**Output halaman superadmin:**

- Provider/network list, active status, capability, adapter version, health,
  latency, error rate, quota, timeout, retry, priority, dan kill switch.
- Test connection dan config validation tanpa mengirim API key ke browser.
- Secret rotation melalui managed secret storage.
- Plan catalog dan platform feature flags.
- Audit trail lengkap untuk setiap perubahan dan rollback configuration.

**Gate:** superadmin wajib MFA/RBAC; secret tidak pernah masuk response browser,
  database plaintext, analytics, atau log; semua perubahan dapat ditelusuri.

## Fase 8 — Subscription, entitlements, dan API product

**Tujuan:** mengubah billing menjadi hak akses yang konsisten dan dapat berkembang.

**Output:**

- Plan, price, period, quota, retention, export/API access, dan feature capability.
- Subscription lifecycle: trial, active, past_due, paused, canceled, expired.
- Entitlement service yang dipakai bersama oleh UI, API, scan queue, dan export.
- Billing webhook signature verification, timestamp check, idempotency, event
  history, replay aman, serta reconciliation.
- Superadmin dapat melihat subscription dan memberi grant/revoke sementara dengan
  alasan, expiry, dan audit log.
- Tier awal: Free untuk scan dasar; Pro untuk monitoring dan history; Team untuk
  collaboration/bulk screening; Enterprise untuk API, SLA, dan custom retention.
- Developer API, scoped API key, key rotation, bulk screening, risk webhook,
  contract version, usage quota, dan API-specific audit trail.

**Gate:** duplicate/out-of-order webhook tidak merusak state; user tanpa entitlement
tidak dapat melewati limit melalui API atau manipulasi UI; API client hanya
mengakses capability yang diizinkan plan.

## Fase 9 — Scale, observability, dan go-live hardening

**Tujuan:** membuktikan platform siap digunakan dan dioperasikan pada skala besar.

**Output:**

- Load test untuk API, PostgreSQL, queue, provider concurrency, cache, dan report
  retrieval berdasarkan target Fase 0.
- Connection pooling, read replica/partitioning hanya bila hasil test membuktikan
  kebutuhan.
- Metrics: request latency, queue depth, scan duration, provider health, error
  rate, DB pool, cache hit, usage, billing webhook, dan security events.
- Structured logs, distributed correlation ID, tracing, alert threshold, dashboard,
  SLO/error budget, dan incident runbook.
- Dependency/security scan, penetration test, backup restore drill, chaos/failure
  test, privacy review, dan release checklist.

**Gate go-live:** tidak ada critical/high security finding terbuka, tenant test
  lulus, restore memenuhi RPO/RTO, webhook idempotent, provider failure terlihat,
  dan load test memenuhi SLO yang disepakati.

## Urutan dependency

```text
Fase 0
  ↓
Fase 1
  ↓
Fase 2 ───────┐
  ↓           │
Fase 3 ───────┤
  ↓           │
Fase 4
  ↓
Fase 5 ───→ Fase 6
              ↓
       ┌──────┴──────┐
       ↓             ↓
     Fase 7       Fase 8
       \             /
        └────→ Fase 9
```

Fase 6 dapat mulai setelah Fase 2, 3, 4, dan 5 stabil. Fase 7 dapat berjalan
paralel setelah boundary dan core provider contract stabil, tetapi subscription,
API product, dan entitlement tidak boleh aktif untuk user sebelum Fase 4, 5, 6,
dan 8 melewati gate masing-masing.

## Definition of Done lintas fase

- Requirement dan acceptance test tercatat.
- Migration/config memiliki rollback path.
- Security, authorization, error handling, dan observability ikut diuji.
- Tidak ada secret, PII berlebih, atau provider payload sensitif di log.
- Dokumentasi operasi diperbarui.
- Bukti test dan keputusan gate disimpan sebelum fase berikutnya dimulai.

## Referensi implementasi

- PRD utama: `DOC/PRD-CA-XRAY-PLATFORM.md`
- Current API layer: `server.js`
- Current analysis core: `src/engine.js`
- Current UI: `public/`
- Current engine tests: `test/engine.test.js`