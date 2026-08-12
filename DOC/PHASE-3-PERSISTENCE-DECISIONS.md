# CA X-RAY — Phase 3 Persistence Decisions

Status: **Approved for implementation planning**  
Date: 2026-08-12  
Scope: PostgreSQL dan persistence  
Parent roadmap: `DOC/PHASE-PEMBANGUNAN-CA-XRAY.md`

## 1. Tujuan dan batasan

Phase 3 memindahkan state penting dari proses aplikasi ke persistence layer
durable, tanpa mengubah core forensic engine atau memperluas scope menjadi
authentication, dashboard private, billing, atau continuous intelligence.

Prinsip fase ini:

- PostgreSQL menjadi source of truth untuk data durable.
- Tidak ada silent data loss, silent fallback, atau silent duplicate operation.
- Migration harus versioned dan memiliki rollback/recovery procedure.
- Persistence layer harus tetap modular agar object storage, read replica, atau
  provider infrastructure dapat ditambahkan kemudian tanpa mengubah core engine.
- Tidak ada credential atau layanan eksternal yang diciptakan tanpa konfigurasi
  yang disetujui.

## 2. Keputusan yang disetujui

### 2.1 Strategi database

- Gunakan pendekatan **adapter-first**.
- PostgreSQL wajib digunakan untuk production.
- Development tetap dapat menggunakan adapter lokal/in-memory agar proyek dapat
  dijalankan tanpa memaksakan database eksternal.
- Perbedaan adapter tidak boleh mengubah contract, ownership, idempotency, atau
  semantics hasil analisis.

### 2.2 Tenant isolation

- Server-side authorization tetap menjadi sumber keputusan akses.
- Setiap tabel private memiliki ownership yang jelas dan dapat ditelusuri ke
  workspace.
- Gunakan foreign key, unique constraint, check constraint, dan indeks tenant
  sebagai enforcement database.
- PostgreSQL Row-Level Security (RLS) **belum diwajibkan pada Phase 3** dan
  disiapkan sebagai defense-in-depth pada fase authentication/tenant isolation.
- Client tidak boleh memilih atau mengubah `workspace_id` sebagai authority.

### 2.3 Penyimpanan evidence

- PostgreSQL menjadi source of truth untuk metadata scan, normalized findings,
  report data, dan payload evidence awal.
- Payload provider/evidence terstruktur dapat disimpan dalam JSONB.
- Object storage **tidak dikonfigurasi pada Phase 3**.
- Persistence boundary harus menyediakan extension point agar payload besar dapat
  dipindahkan ke object storage kemudian tanpa mengubah core analyzer atau model
  report.
- Hash, provenance, retrieved time, status, confidence, schema version, dan
  engine version tetap dipertahankan untuk evidence yang disimpan.

### 2.4 Retention dan lifecycle

- Phase 3 menetapkan policy, metadata, dan worker contract lifecycle.
- Implementasi archival/deletion worker penuh ditunda ke fase berikutnya.
- Tidak ada automatic destructive deletion yang aktif pada Phase 3.
- Metadata lifecycle minimum:
  - `created_at`
  - `expires_at`
  - `archived_at`
  - `deleted_at`
  - retention status
  - workspace ownership
  - audit reference
- Future deletion harus auditable, tenant-scoped, deterministic, dan reversible
  jika secara teknis memungkinkan.

### 2.5 Recovery target

Target awal yang disetujui:

- **RPO:** maksimal 1 jam
- **RTO:** maksimal 4 jam
- **Availability SLO:** 99,5% per bulan

Target ini menjadi dasar desain backup, restore drill, migration recovery, dan
operational acceptance. Target dapat diperketat setelah baseline volume,
revenue, dan kebutuhan operasional berkembang.

### 2.6 Scope implementasi

Phase 3 dibatasi pada **persistence-only**:

- schema dan migrations;
- PostgreSQL adapter/configuration boundary;
- transaction boundary;
- scan creation idempotency;
- webhook/event idempotency;
- outbox contract;
- retention metadata dan lifecycle contract;
- backup/restore dan recovery tests;
- migration rollback dan partial-failure tests.

Di luar scope Phase 3:

- sign up/sign in dan Clerk claims verification;
- private dashboard;
- workspace invite dan membership workflow;
- billing aktif;
- watchlist, alerts, Risk Passport, evidence graph;
- superadmin;
- object storage nyata;
- microservices migration.

## 3. Data model minimum

Migration harus menyediakan fondasi untuk tabel berikut. Tabel yang belum
digunakan oleh endpoint Phase 3 boleh dibuat sebagai schema foundation, tetapi
tidak boleh mengaktifkan workflow produk yang belum disetujui.

- `users`
- `workspaces`
- `memberships`
- `roles`
- `plans`
- `subscriptions`
- `entitlements`
- `usage_counters`
- `scan_jobs`
- `scans`
- `findings`
- `evidence`
- `providers`
- `audit_logs`
- `webhook_events`
- `idempotency_keys`
- `outbox_events`
- schema/engine version metadata

Semua tabel private harus memiliki ownership path yang eksplisit. Query utama
harus memiliki indeks untuk workspace/tenant, status, created time, dan lookup
domain yang relevan.

## 4. Konsistensi dan failure handling

Persistence implementation harus memastikan:

1. Duplicate scan request tidak membuat scan kedua atau mengonsumsi quota dua
   kali.
2. Duplicate webhook/event tidak mengubah state lebih dari sekali.
3. Scan, usage, idempotency record, audit event, dan outbox event memiliki
   transaction boundary yang jelas.
4. Outbox event dapat diproses ulang dengan aman.
5. Partial failure tidak meninggalkan state sukses palsu.
6. Report dan evidence yang selesai tetap immutable; perubahan engine membuat
   versi baru.
7. Error database tidak dikonversi menjadi hasil scan yang terlihat valid.

## 5. Acceptance gate

Phase 3 dapat dinyatakan selesai hanya jika bukti berikut tersedia:

- Data tetap ada setelah restart aplikasi.
- Migration dapat dijalankan pada database kosong dan database berisi data.
- Duplicate request menghasilkan response/state yang konsisten.
- Partial failure tidak menggandakan scan, usage, webhook, atau audit event.
- Migration rollback atau recovery procedure telah diuji.
- Backup restore drill memenuhi target RPO 1 jam dan RTO 4 jam pada lingkungan
  pengujian yang ditentukan.
- Retention metadata lengkap tanpa destructive deletion otomatis.
- Development adapter dan PostgreSQL adapter mengikuti contract test yang sama.
- Query private memiliki ownership constraint dan tidak mengandalkan UI hiding.
- Audit trail persistence gagal secara terlihat; tidak ada silent loss.

## 6. Evolusi 10 tahun

Phase 3 harus menjaga extension point berikut:

- object storage untuk evidence besar;
- partitioning atau archival berdasarkan workspace/waktu;
- read replica dan query workload separation;
- RLS sebagai defense-in-depth;
- outbox worker untuk notifications, webhooks, dan indexing;
- schema/contract versioning untuk API dan engine;
- data export dan portability tanpa vendor-specific model leakage.

Peningkatan tersebut tidak boleh mengubah prinsip utama CA X-RAY:
**evidence over assumption, precision over noise, dan failure over silent
fallback**.
