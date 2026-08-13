# CA X-RAY — Lembar Identifikasi dan Konfirmasi Phase 4

**Tanggal pemeriksaan:** 13 Agustus 2026  
**Nama fase:** Authentication, Authorization, dan Tenant Isolation  
**Status ringkas:** **Fondasi implementasi tersedia — belum dapat disebut production-complete**

## 1. Identifikasi Phase 4

Phase 4 adalah boundary platform yang memastikan bahwa pengguna, sesi,
workspace, membership, role, dan data private terhubung melalui otorisasi
server-side. Phase 4 bukan bagian dari mesin forensic/risk engine; mesin
analisis tetap harus menerima input yang sudah memiliki scope dan kontrak
evidence yang valid.

Model akses Phase 4:

```text
User → Session → Workspace → Membership/Role → Action/Entitlement
```

Prinsip yang harus tetap terkunci:

- Browser tidak dipercaya sebagai sumber role, plan, atau `workspace_id`.
- Semua resource private harus diverifikasi dengan workspace scope di server.
- Superadmin adalah role platform dan tidak otomatis mendapat akses workspace.
- Recovery, invite, session, dan perubahan role harus dapat diaudit.
- Secret hanya boleh berada di managed secret storage atau bentuk terenkripsi
  yang memang diperlukan; secret tidak boleh masuk response public atau log.
- Hasil Phase 4 tidak boleh mengubah `unknown`, `unavailable`, atau
  `provider_error` menjadi status aman.

## 2. Status yang teridentifikasi dari source saat ini

Legenda:

- **[x] Ada** — implementasi dan/atau test sudah terlihat di repository.
- **[~] Parsial** — fondasi ada, tetapi adapter, operasi, UI, atau hardening
  production masih diperlukan.
- **[ ] Belum** — belum terlihat sebagai capability yang siap dikonfirmasi.

### A. Identity dan session

- **[x]** Register dengan validasi email dan password minimum 12 karakter.
- **[x]** Password disimpan menggunakan scrypt dengan salt.
- **[x]** Login, logout, session expiry, last-seen, dan revoke session.
- **[x]** Session dikelola lewat cookie HttpOnly, SameSite, dan Secure di
  production.
- **[x]** Daftar session aktif dan pencabutan session per user.
- **[~]** Integrasi identity provider eksternal/Clerk belum menjadi adapter
  production yang dapat diverifikasi pada import ini.
- **[ ]** Verifikasi email, notifikasi login baru, dan device trust belum
  menjadi acceptance gate tersendiri.

### B. Account recovery dan MFA

- **[x]** Recovery token disimpan sebagai hash, memiliki expiry satu jam, dan
  hanya dapat digunakan satu kali.
- **[x]** Reset password mencabut session lama.
- **[~]** TOTP untuk superadmin memiliki alur enroll, confirm, pending MFA,
  dan verify; kewajiban MFA belum dipaksakan sebelum session privileged pertama
  diterbitkan.
- **[x]** Secret MFA superadmin dienkripsi sebelum disimpan oleh auth service.
- **[~]** Pengiriman email recovery/invite belum terhubung ke provider email
  production; development dapat mengembalikan token untuk test.
- **[~]** Belum terlihat recovery code, proses disable/re-enroll MFA yang
  diawasi, atau step-up MFA untuk aksi platform yang sensitif.
- **[ ]** WebAuthn/passkey belum tersedia.

### C. Workspace dan tenant isolation

- **[x]** User baru memperoleh personal workspace yang dibuat server.
- **[x]** Pembuatan dan pemilihan workspace.
- **[x]** Membership aktif/nonaktif/deleted dan role owner/member.
- **[x]** Invite terikat email, expiry tujuh hari, dan one-time acceptance.
- **[~]** Batas anggota workspace ditegakkan oleh memory store; jalur
  acceptance invite PostgreSQL belum melakukan pemeriksaan policy dan jumlah
  anggota secara atomik.
- **[x]** Ownership transfer membutuhkan owner aktif dan target member aktif.
- **[x]** Cross-tenant access ditolak melalui server-side workspace check.
- **[x]** Superadmin tidak dapat memakai workspace route biasa.
- **[~]** Soft-delete, retention, export, dan lifecycle workspace perlu
  worker serta bukti operasional production.
- **[ ]** SSO/SAML, SCIM, domain verification, dan join policy enterprise
  belum tersedia.

### D. Role, policy, dan audit

- **[x]** Permission matrix memisahkan Visitor, User, Workspace Member,
  Workspace Owner, Superadmin, Support Admin, dan Read-only Auditor.
- **[x]** Action boundary mencakup scan, export, membership, billing,
  provider configuration, audit read, dan platform management.
- **[x]** Perubahan penting menghasilkan audit event.
- **[x]** Audit service bersifat append-oriented dan memiliki workspace scope.
- **[~]** Retensi, immutable/WORM storage, query platform audit, alerting, dan
  korelasi incident belum menjadi operasi lengkap.
- **[~]** Entitlement/billing action sudah ada sebagai policy boundary, tetapi
  subscription provider dan lifecycle payment belum aktif.

### E. Persistence dan kesiapan runtime

- **[x]** Memory auth store tersedia untuk development/test.
- **[x]** PostgreSQL auth store tersedia.
- **[x]** Migration `002_phase4_auth_tenant` dan rollback tersedia.
- **[x]** Test khusus Phase 4 mencakup register/scope, invite, recovery, dan
  MFA superadmin.
- **[~]** Production harus menjalankan PostgreSQL, bukan memory store.
- **[~]** Queue bersama/durable, email provider, backup terenkripsi, restore
  drill, dan observability masih merupakan acceptance gate operasi.
- **[ ]** Load test untuk login, session lookup, workspace authorization, dan
  invite/recovery burst belum menjadi bukti kapasitas.

## 3. Putusan konfirmasi saat ini

### Konfirmasi teknis

> **Phase 4 dapat dinyatakan “implemented foundation / ready for hardening”.**
> Phase 4 belum dapat dinyatakan “production-ready” atau “full power” sebelum
> checklist production di bagian 5 ditandatangani.

### Hal yang sudah dapat dikonfirmasi

- [x] Boundary auth dan workspace dipisahkan dari forensic engine.
- [x] Server adalah sumber authority untuk workspace dan membership.
- [x] Superadmin tidak mendapat implicit workspace access.
- [x] Recovery token bersifat single-use dan reset mencabut session.
- [~] MFA TOTP dapat diwajibkan setelah superadmin melakukan enrollment, tetapi
  MFA belum menjadi enrollment gate sebelum session privileged pertama.
- [~] Invite terikat email dan one-time di memory store; enforcement batas
  anggota di jalur PostgreSQL belum dapat dikonfirmasi.
- [x] Ownership transfer memiliki perlindungan last-owner.
- [x] Memory/PostgreSQL memiliki kontrak auth store yang sejalan.
- [x] Regression test Phase 4 tersedia.

### Hal yang belum boleh dikonfirmasi sebagai selesai

- [ ] Identity provider production sudah terhubung dan claims sudah
  diverifikasi end-to-end.
- [ ] Superadmin yang belum memiliki MFA tidak pernah memperoleh session
  privileged, dan session pending tidak dapat mengakses platform actions.
- [ ] Invite acceptance PostgreSQL memeriksa workspace policy dan batas anggota
  dalam transaction yang aman terhadap race.
- [ ] Email recovery/invite sudah benar-benar terkirim, terpantau, dan
  memiliki retry/dead-letter policy.
- [ ] PostgreSQL production sudah dimigrasikan dan diverifikasi.
- [ ] Queue durable production sudah aktif dan aman terhadap duplicate job.
- [ ] Backup/restore dan account/workspace deletion drill sudah lulus.
- [ ] Rate limit, lockout, MFA failure alert, dan incident response sudah
  diuji dengan beban nyata.
- [ ] Subscription, entitlement, dan webhook billing sudah idempotent.
- [ ] UI private dashboard menampilkan status session, membership, audit, dan
  entitlement tanpa membocorkan data restricted.
- [ ] Security review independen dan load test sudah memiliki bukti release.

## 4. Lembar konfirmasi untuk diisi

Gunakan satu lembar per release atau per environment.

| Area | Bukti/link/nomor migration | Owner | Status (Lulus / Tunda / Gagal) | Tanggal |
|---|---|---|---|---|
| Auth register/login/logout |  |  |  |  |
| Session expiry/revoke |  |  |  |  |
| Recovery single-use + revoke session |  |  |  |  |
| MFA superadmin |  |  |  |  |
| Workspace scope / anti-IDOR |  |  |  |  |
| Invite / membership / last owner |  |  |  |  |
| Superadmin boundary |  |  |  |  |
| Audit trail |  |  |  |  |
| PostgreSQL migration + rollback drill |  |  |  |  |
| Email delivery dan retry |  |  |  |  |
| Durable queue dan duplicate handling |  |  |  |  |
| Backup / restore / deletion drill |  |  |  |  |
| Rate limit / abuse test |  |  |  |  |
| Security scan / dependency review |  |  |  |  |
| Load test dan observability |  |  |  |  |

### Keputusan release

- [ ] **GO — Phase 4 foundation diterima untuk environment ini**
- [ ] **GO WITH CONDITIONS — hanya untuk beta/internal; syarat dicatat di bawah**
- [ ] **NO-GO — akses production ditahan**

**Syarat/risiko yang masih terbuka:**

```text
1.
2.
3.
```

**Konfirmasi Product Owner:** ____________________  **Tanggal:** __________  
**Konfirmasi Engineering:** _____________________  **Tanggal:** __________  
**Konfirmasi Security/Operations:** ______________  **Tanggal:** __________

## 5. Ide Phase 4 “Full Power”

Prioritas di bawah ini memperkuat sistem tanpa memecah modular monolith
terlalu dini.

### P0 — wajib sebelum production dan monetisasi

1. **Production identity boundary**
   - Tetapkan satu sumber identity resmi: local auth yang di-hardening atau
     Clerk; jangan menjalankan dua authority secara ambigu.
   - Tambahkan email verification, brute-force protection, login anomaly,
     session rotation, dan notification untuk recovery/login baru.
   - Tambahkan recovery codes dan prosedur admin recovery yang dapat diaudit.

2. **Policy dan entitlement menjadi satu mesin**
   - Semua UI dan API memanggil policy/entitlement yang sama.
   - Simpan `source`, `status`, `effective_at`, `expires_at`, dan alasan
     perubahan entitlement.
   - Tolak scan/export/API di server, bukan hanya menyembunyikan tombol UI.

3. **Production persistence**
   - Jalankan migration Phase 4 di staging lalu production dengan backup,
     checksum, row-count, dan rollback plan.
   - Tambahkan constraint yang memastikan hanya ada owner valid dan membership
     tidak mengarah ke user/workspace yang sudah dihapus.
   - Pastikan audit, session, invite, dan recovery memiliki indeks serta
     retention yang terukur.

4. **Abuse resistance**
   - Rate limit login/recovery/invite/MFA per IP, user, email, workspace, dan
     device fingerprint yang tidak invasif.
   - Tambahkan exponential backoff, lockout sementara, MFA failure alert, dan
     correlation ID.
   - Uji IDOR/BOLA, cross-tenant, replay invite, token reuse, CSRF, dan
     session fixation secara otomatis.

5. **Email dan job reliability**
   - Gunakan provider email production dengan template versioning,
     suppression/bounce handling, retry, dan dead-letter queue.
   - Pindahkan job auth/email ke queue durable; status harus idempotent dan
     dapat dipulihkan setelah restart.

### P1 — platform-grade operations

6. **Superadmin control plane**
   - Provider health, timeout/retry, quota, kill switch, feature flag,
     configuration draft/publish/rollback.
   - Subscription lifecycle, manual entitlement grant/revoke dengan expiry,
     webhook event log, signature verification, dan safe replay.
   - Semua aksi platform memakai step-up MFA, reason code, audit, dan
     four-eyes approval untuk perubahan berisiko tinggi.

7. **Audit dan incident intelligence**
   - Pisahkan security audit, admin audit, scan audit, dan billing audit.
   - Hash-chain atau WORM sink untuk event restricted.
   - Alert untuk privilege escalation, owner transfer, recovery burst, MFA
     failure, webhook mismatch, dan provider kill switch.

8. **Enterprise access**
   - SSO SAML/OIDC, domain verification, SCIM provisioning/deprovisioning,
     session policy per workspace, dan role mapping.
   - Tambahkan custom roles berbasis capability, tetapi tetap deny-by-default.

9. **Data lifecycle**
   - Account/workspace deletion memakai tombstone access lebih dahulu,
     export scoped, grace period, purge worker, dan legal hold.
   - Masking PII di audit/support view, retention per jenis data, dan
     encrypted backup/restore drill.

10. **Observability dan capacity**
    - Metrics: auth success/failure, session lookup latency, MFA challenge,
      invite acceptance, authorization deny, queue age, DB pool, dan audit lag.
    - Distributed trace dari request → authorization → scan job → provider.
    - SLO, alert threshold, runbook, chaos/restart test, dan load test untuk
      target pengguna/concurrent scan yang telah ditetapkan.

### P2 — moat produk dan ecosystem

11. **Continuous identity-aware intelligence**
    - Risk Passport, watchlist, risk timeline, dan “Why Did Risk Change?” tetap
      terikat workspace serta menyimpan engine/evidence version.

12. **Team investigation workflow**
    - Comment, assign finding, review state, approval checklist, verified
      report, public/private share, expiry, dan revoke link.

13. **Developer platform**
    - API client dengan scoped key, rotation, IP restriction opsional, usage
      quota, webhook signature, replay protection, dan contract versioning.
    - Bulk screening harus memakai entitlement dan idempotency yang sama dengan
      UI.

14. **Privacy-preserving support**
    - Support session berbatas waktu, consent/approval workspace owner,
      read-only default, reason code, banner “support access active”, dan
      audit lengkap.

## 6. Exit criteria Phase 4 Full Power

Phase 4 dapat disebut **full power** hanya jika seluruh kondisi ini terbukti:

- [ ] Identity authority dan account lifecycle production sudah dipilih dan
  diuji end-to-end.
- [ ] Tidak ada cross-tenant read/write pada negative test dan load test.
- [ ] Semua privileged action memakai policy server-side, entitlement, audit,
  dan step-up control yang sesuai.
- [ ] MFA/recovery/session incident dapat dideteksi, dibatasi, dan dipulihkan.
- [ ] PostgreSQL, queue, email, backup, restore, dan deletion worker memiliki
  runbook serta drill yang lulus.
- [ ] Billing webhook dan entitlement dapat replay tanpa double grant/double
  charge.
- [ ] Security scan, dependency review, threat-model review, dan penetration
  test memiliki bukti yang masih berlaku.
- [ ] Dashboard, API, dan job worker memakai contract/version yang sama.
- [ ] SLO, alert, dashboard observability, dan incident owner sudah ditetapkan.
- [ ] Product Owner, Engineering, dan Security/Operations menandatangani
  lembar konfirmasi tanpa outstanding blocker P0.

## 7. Rekomendasi keputusan sekarang

1. Terima Phase 4 saat ini sebagai **baseline teknis yang berhasil
   diimplementasikan**.
2. Jangan klaim “production-ready” sebelum item P0 di bagian 5 lengkap.
3. Prioritaskan identity authority, PostgreSQL/queue/email production,
   abuse-resistance, dan recovery drill sebelum membangun fitur P2.
4. Setelah P0 lulus, lanjutkan superadmin control plane, entitlement, dan
   observability sebagai pengungkit utama “full power”.