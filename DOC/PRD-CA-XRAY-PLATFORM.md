# PRD — CA X-RAY Platform Core, Security & Monetization

---

Version: 1.1
Last updated: 2026-08-12  
Status: Draft — strategic expansion approved
Owner: Product / Engineering  
Approver: Product Owner

---

## 1. Ringkasan

CA X-RAY dikembangkan dari analyzer kontrak EVM menjadi platform forensic analysis
multi-user yang aman, dapat diaudit, siap berlangganan, dan mampu berkembang hingga
1 juta akun tanpa mengorbankan ketepatan evidence.

Prioritas delivery:

**Architecture & threat model → core engine audit → PostgreSQL/persistence →
authentication & tenant isolation → subscription/entitlements → scale testing &
observability**

Prinsip utama: **precision over noise, evidence over assumption, failure over
silent fallback, modularity over premature microservices.**

## 2. Masalah dan tujuan

### Masalah

- Core analyzer belum memiliki boundary platform yang lengkap untuk user, workspace,
  persistence, asynchronous scan, dan billing.
- Provider API dapat berubah, lambat, tidak tersedia, atau mengembalikan format baru.
- Hasil analisis harus dapat dijelaskan, direproduksi, dan dibedakan antara
  `unknown`, `unavailable`, dan `provider error`.
- Dashboard private dan subscription membutuhkan authorization server-side serta
  isolation antar-tenant.

### Tujuan

1. Menjadikan core engine aman, testable, versioned, dan tahan perubahan provider.
2. Menyimpan user, scan, evidence, audit trail, dan entitlement secara konsisten di
   PostgreSQL.
3. Menyediakan private dashboard dengan kontrol akses yang benar.
4. Menyediakan superadmin untuk mengelola provider API dan subscription tanpa
   mengekspos secret.
5. Menyiapkan fondasi operasional untuk 1 juta user dan evolusi jangka panjang.

### Non-goals

- Wallet connection, private key, signing, trading, atau eksekusi transaksi.
- Menyebut hasil analisis sebagai kepastian keamanan atau rekomendasi finansial.
- Migrasi ke microservices sebelum bottleneck terukur.
- Membuat subscription/billing provider tertentu sebelum keputusan integrasi.

### Positioning dan competitive moat

CA X-RAY bukan hanya scanner sekali pakai. Produk diposisikan sebagai **continuous
contract intelligence**: setiap kontrak memiliki Risk Passport, histori evidence,
monitoring perubahan, dan penjelasan mengapa tingkat risikonya berubah.

Pembeda yang harus dipertahankan:

- **Trust moat:** evidence provenance, provider consensus, reliability terpisah dari
  risk, dan tidak ada silent fallback.
- **Retention moat:** Watchtower, risk timeline, alert, dan weekly intelligence
  digest.
- **Revenue moat:** workspace team, verified report, collaboration, bulk screening,
  API, dan webhook.

Alternatif yang harus dikalahkan bukan hanya pesaing langsung, tetapi juga scan
manual, spreadsheet, dashboard black-box, dan keputusan tanpa evidence.

## 3. Pengguna dan akses

| Persona | Kebutuhan utama | Akses |
|---|---|---|
| Visitor | Menjalankan demo dan memahami produk | Public, terbatas |
| User | Scan, riwayat, evidence, dan laporan pribadi | Workspace sendiri |
| Team member | Berbagi scan dalam workspace | Sesuai role |
| Workspace owner | Mengelola anggota, paket, dan penggunaan | Workspace admin |
| Superadmin | Mengelola platform, provider, subscription, dan audit | Platform-wide, sangat terbatas |

Model akses minimum:

`User → Workspace → Membership/Role → Entitlement`

Semua resource private wajib memiliki `workspace_id` dan diverifikasi di server.
UI hiding bukan mekanisme keamanan.

## 4. Arsitektur target

Gunakan **modular monolith** terlebih dahulu dengan boundary yang dapat dipisahkan
kemudian:

1. **HTTP/API layer** — routing, authentication, authorization, rate limit,
   request validation, response contract.
2. **Scan orchestration** — membuat job idempotent, mengatur timeout/retry,
   provider health, concurrency, dan status job.
3. **Core forensic engine** — normalisasi evidence, kalkulasi risk/reliability,
   findings, intelligence, serta model version.
4. **Provider adapters** — satu adapter per provider; kontrak internal stabil,
   provider-specific schema tidak bocor ke core.
5. **Persistence** — PostgreSQL untuk metadata dan query utama; object storage
   untuk payload besar/raw evidence; Redis/cache untuk hot data dan rate limit.
6. **Identity & authorization** — session/token, MFA untuk admin, RBAC,
   membership, tenant isolation.
7. **Billing & entitlement** — subscription state dipetakan ke capability/limit,
   bukan dicek langsung dari UI.
8. **Admin & operations** — provider configuration, plan, subscription, audit,
   health, feature flags, dan incident controls.
9. **Continuous intelligence** — Risk Passport, risk snapshots, Watchtower,
   evidence graph, provider consensus, compare, dan scenario simulation.
10. **Collaboration & distribution** — workspace workflow, verified report, export,
    developer API, dan webhook.

Scan berat berjalan sebagai background job. API publik mengembalikan `job_id` dan
status; hasil final disimpan immutable dengan referensi evidence dan versi engine.

## 5. Product requirements

### P0 — Core yang wajib selesai sebelum monetisasi

#### 5.1 Core engine dan adaptasi API

- Core menerima data dari provider melalui adapter dengan internal contract yang
  tervalidasi.
- Perubahan field, enum, nullability, atau response shape provider tidak boleh
  merusak kalkulasi secara diam-diam.
- Setiap field menyimpan provenance minimum: provider, retrieved time, confidence,
  status, dan evidence reference.
- `unknown`, `unavailable`, `error`, dan nilai valid tidak boleh dikonversi satu
  sama lain.
- Tidak ada fallback demo ketika live provider gagal.
- Provider memiliki timeout, retry terbatas, circuit breaker, health status, dan
  quota protection.
- Core memiliki engine/model version dan output deterministik untuk input yang
  sama.
- Kontrak API provider, fixture, dan migration diberi contract test.
- Provider baru dapat ditambahkan tanpa mengubah rule inti.

#### 5.2 Security dan threat model

Threat model minimum mencakup:

- account takeover, session abuse, privilege escalation, IDOR/BOLA;
- cross-tenant data leakage;
- abuse scan/API, resource exhaustion, replay, dan request flooding;
- SSRF atau URL/provider configuration abuse;
- secret leakage, log injection, supply-chain/dependency risk;
- manipulasi evidence atau hasil audit;
- webhook spoofing untuk subscription;
- kebocoran PII dan data retention yang tidak terkendali.

Kontrol minimum:

- validasi input dan ukuran request di boundary;
- authorization di setiap endpoint/resource;
- secret hanya dari managed secret storage, tidak di database plaintext atau UI;
- password/session/token mengikuti standar aman; MFA wajib untuk superadmin;
- rate limit per IP, user, workspace, provider, dan plan;
- structured audit log untuk security, admin, scan, dan billing events;
- secure headers, CORS policy, CSRF protection sesuai model auth, dan dependency scan;
- backup terenkripsi, restore drill, retention policy, dan incident response runbook.

#### 5.3 PostgreSQL dan persistence

Data minimum:

- `users`, `workspaces`, `memberships`, `roles`;
- `plans`, `subscriptions`, `entitlements`, `usage_counters`;
- `scan_jobs`, `scans`, `findings`, `evidence`;
- `risk_snapshots`, `watchlists`, `alert_rules`, `notification_events`;
- `evidence_relations`, `report_shares`, `comments`, `approval_items`;
- `provider_configs`, `provider_health`, `webhook_events`;
- `api_clients`, `api_usage`, `audit_logs`, `schema/engine version metadata`.

Aturan data:

- semua tabel private memiliki tenant ownership yang jelas;
- foreign key, unique constraint, check constraint, dan migration versioning wajib;
- query harus terindeks berdasarkan tenant, user, status, created time, dan lookup
  utama;
- hasil dan evidence memiliki retention/archival policy;
- idempotency mencegah scan atau webhook ganda;
- PostgreSQL menjadi source of truth; cache tidak boleh menjadi satu-satunya data.

Target scale awal: 1 juta registered users, dengan capacity plan terpisah untuk
MAU, concurrent requests, scans/minute, ukuran evidence, dan retention period.

#### 5.4 Authentication dan tenant isolation

- User dapat sign up, sign in, sign out, reset/recover account, dan mengelola
  session.
- Workspace owner dapat mengundang, menonaktifkan, dan mengatur role anggota.
- Setiap endpoint private menolak resource dari workspace lain, termasuk melalui
  ID yang ditebak atau URL yang dimanipulasi.
- Admin platform dan admin workspace adalah dua boundary berbeda.
- Penghapusan akun/workspace mengikuti soft-delete, retention, dan legal policy.

#### 5.5 Private dashboard

Dashboard user menampilkan:

- scan baru dan status job;
- riwayat scan, filter, detail risk/reliability, findings, evidence;
- pemakaian kuota dan status subscription;
- anggota/workspace sesuai role;
- export hanya jika diizinkan entitlement.

#### 5.6 Continuous intelligence dan retention moat

- Setiap kontrak memiliki **Risk Passport** dengan risk, reliability, findings,
  evidence, engine version, timestamp, dan status current/outdated.
- User dapat membuat watchlist dan jadwal monitoring per kontrak/network.
- Watchtower memberi alert untuk perubahan owner/privilege, proxy, tax, liquidity,
  holder concentration, trading controls, provider disagreement, dan perubahan
  risiko yang melewati threshold.
- Risk timeline menyimpan snapshot sebelum/sesudah dan fitur **Why Did Risk
  Change?** dengan evidence serta confidence.
- Evidence graph menghubungkan contract, owner, privileged wallet, proxy, pair,
  liquidity, dan holder cluster tanpa menyamarkan data yang tidak tersedia.
- Provider consensus menampilkan konflik antar-provider secara eksplisit.
- Compare/benchmark memungkinkan perbandingan kontrak, periode, network, atau
  kategori yang relevan.
- Scenario simulator wajib diberi label simulasi dan tidak boleh menjadi prediksi
  pasar atau nasihat finansial.
- Weekly intelligence digest hanya mengirim ringkasan evidence yang berubah,
  bukan engagement noise.

#### 5.7 Team workflow dan verified report

- Workspace team dapat memberi komentar, assign finding, memberi status
  `open/reviewing/resolved`, dan menyimpan approval checklist.
- User dapat membuat verified report dengan report ID, timestamp, engine version,
  evidence hash, expiration, dan kontrol public/private.
- Report yang sudah selesai immutable; revisi dibuat sebagai versi baru.

#### 5.8 Developer/API product

- API dan webhook tersedia untuk scan, perubahan risiko, status job, dan report.
- Bulk screening, usage quota, API key rotation, scoped permission, dan
  correlation ID wajib.
- API output menggunakan contract version dan tidak mengekspos secret/provider
  internal.

### P1 — Superadmin dan monetisasi

#### 5.9 Superadmin: API management

Halaman superadmin menyediakan:

- daftar provider, status aktif/nonaktif, capability, versi adapter, dan health;
- pengaturan timeout, retry policy, rate/quota policy, dan priority provider;
- test connection/health check tanpa menampilkan secret;
- rotasi secret melalui secret manager;
- feature flag dan kill switch per provider/network;
- riwayat perubahan konfigurasi dan siapa yang mengubah;
- error rate, latency, quota usage, dan last successful request;
- validasi config sebelum publish serta rollback konfigurasi.

Tidak boleh:

- menampilkan API key/token;
- mengedit config tanpa audit trail;
- mengaktifkan fallback yang menyamarkan kegagalan live data.

#### 5.10 Superadmin: subscription management

Halaman superadmin menyediakan:

- CRUD plan: nama, harga, currency, period, scan limit, retention, export/API
  capability, dan status;
- melihat subscription, status lifecycle, workspace, provider billing ID, serta
  event history;
- grant/revoke entitlement manual dengan alasan dan expiry;
- suspend/cancel/resume sesuai policy;
- webhook event log, signature status, idempotency status, dan replay aman;
- subscription metrics dan failed payment visibility.

Data pembayaran sensitif tetap berada di billing provider. Sistem hanya menyimpan
identifier, status, entitlement, dan metadata minimum yang dibutuhkan.

#### 5.11 Entitlement

- Satu policy layer menentukan apakah user/workspace boleh menjalankan action.
- Entitlement memiliki source, status, effective time, expiry, dan audit trail.
- Perubahan subscription harus idempotent dan dapat dipulihkan dari event history.
- UI dan API menggunakan entitlement yang sama.

## 6. API contract minimum

- `GET /api/networks` — daftar network yang didukung.
- `GET /api/demo` — demo terpisah dari live.
- `POST /api/scans` — membuat scan job terautentikasi.
- `GET /api/scans/:id` — mengambil status/hasil yang diizinkan tenant.
- `GET /api/me`, `/api/workspaces`, `/api/usage`.
- `GET/POST/PATCH /api/watchlists`, `/api/alerts`, `/api/risk-timeline`.
- `GET /api/scans/:id/graph`, `POST /api/compare`, `POST /api/simulate`.
- `GET/POST/PATCH /api/reports` — verified report dan share policy.
- `POST /api/webhooks/risk` — delivery perubahan risiko sesuai entitlement.
- `GET/POST/PATCH /api/admin/providers` — superadmin only.
- `GET/POST/PATCH /api/admin/plans` dan `/api/admin/subscriptions` —
  superadmin only.
- Webhook billing wajib memverifikasi signature, timestamp, idempotency, dan
  subscription state transition.

Response error harus konsisten, tidak membocorkan secret/provider detail, dan
memiliki correlation/request id.

## 7. Acceptance criteria utama

1. **Given** user dari Workspace A, **when** meminta scan milik Workspace B,
   **then** server mengembalikan forbidden/not found tanpa membocorkan data.
2. **Given** provider mengubah field atau mengembalikan null, **when** adapter
   memproses response, **then** core tetap berjalan dan field ditandai sesuai
   status evidence.
3. **Given** provider gagal, **when** live scan selesai, **then** hasil menyatakan
   kegagalan/unavailable dan tidak memakai fixture demo diam-diam.
4. **Given** webhook billing dikirim dua kali, **when** diproses, **then** state
   subscription hanya berubah sekali.
5. **Given** superadmin membuka konfigurasi provider, **when** halaman dirender,
   **then** secret tidak pernah dikirim ke browser atau ditulis ke log.
6. **Given** entitlement tidak mengizinkan export, **when** endpoint export dipanggil,
   **then** API menolak request walaupun UI dimanipulasi.
7. **Given** scan request melebihi rate/plan limit, **when** request diterima,
   **then** sistem menolak secara konsisten dan mencatat usage/audit event.
8. **Given** sistem dipulihkan dari backup, **when** restore drill dijalankan,
   **then** data dan audit trail dapat dipulihkan sesuai RPO/RTO yang disepakati.
9. **Given** kontrak berada dalam watchlist, **when** evidence penting berubah,
   **then** sistem menyimpan snapshot before/after dan mengirim alert sesuai rule
   tanpa membuat duplicate event.
10. **Given** provider memberikan hasil berbeda, **when** report dibuat, **then**
    konflik provider dan reliability terlihat tanpa dipaksa menjadi satu fakta.
11. **Given** report dibagikan publik, **when** report expired atau engine baru
    tersedia, **then** statusnya menjadi outdated dan data private tetap terlindungi.
12. **Given** API client tidak memiliki entitlement bulk scan, **when** endpoint
    bulk dipanggil, **then** request ditolak server-side dan usage dicatat.

## 8. Roadmap eksekusi

| Fase | Fokus | Output keputusan |
|---|---|---|
| Now | Architecture, threat model, core audit | Boundary, risk register, provider contract |
| Next | PostgreSQL, persistence, auth, tenant isolation | Durable private platform |
| Next | Private dashboard dan scan jobs | User workflow yang aman |
| Next | Continuous intelligence & retention | Risk Passport, Watchtower, evidence moat |
| Later | Superadmin provider operations | Platform control tanpa secret leakage |
| Later | Subscription, entitlements, API product | Monetisasi dan developer distribution |
| Later | Scale, observability, go-live hardening | Capacity, SLO, recovery, release gate |

Setiap fase harus menghasilkan test, migration/rollback plan, dan operational
documentation sebelum fase berikutnya dimulai.

## 9. Success metrics

- 0 temuan kritis/high yang terbuka sebelum private dashboard dan billing live.
- 0 cross-tenant data leak pada security test.
- 100% scan live memiliki provenance dan engine version.
- 100% webhook billing diproses idempotently.
- Provider failure terlihat oleh user/operator dan tidak menjadi data palsu.
- Minimal 30% user yang menyelesaikan scan pertama memiliki minimal satu kontrak
  aktif di watchlist (target awal, disesuaikan setelah baseline).
- Weekly monitored contracts dan alert engagement menjadi metrik retensi utama.
- Setiap shared report dapat diverifikasi dan memiliki status freshness yang benar.
- False-positive rate dan provider disagreement terukur sebelum dijadikan dasar
  automated alert.
- P95 API dan scan queue latency ditetapkan setelah baseline load test.
- RPO, RTO, availability SLO, serta capacity limit disepakati sebelum scale-out.

## 10. Keputusan yang masih diperlukan

- Identity provider dan billing provider.
- Definisi MAU, concurrent users, scan volume, retention, RPO/RTO, dan SLO.
- Model workspace: personal-only atau team-first.
- Negara/currency/tax/compliance subscription.
- Paket awal, kuota, overage, dan policy refund/cancellation.
- Provider resmi yang dipakai, batas penggunaan, serta policy data retention.
- Channel notifikasi, cadence monitoring, threshold alert, dan weekly digest policy.
- Aturan verified report: public/private default, expiration, dan revocation.
- Apakah API product dimulai dari read-only report, scan API, atau bulk screening.

## 11. Baseline teknis saat ini

- Core analyzer: `src/engine.js`
- HTTP/API layer: `server.js`
- UI: `public/`
- Existing demo/live separation dan deterministic engine tests dipertahankan sebagai
  baseline, lalu diperluas dengan contract, security, persistence, dan load tests.

### Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-12 | Initial platform PRD |
| 1.1 | 2026-08-12 | Added approved differentiation, retention, collaboration, report, simulator, and API requirements |