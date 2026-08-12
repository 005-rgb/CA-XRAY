# CA X-RAY — Phase 3 Persistence Operations

Dokumen ini adalah runbook minimum untuk persistence Phase 3. Phase 3 tidak
menjalankan penghapusan data otomatis; lifecycle hanya menulis metadata dan
menyediakan extension point untuk worker fase berikutnya.

## Konfigurasi

Development memakai `DATA_STORE_DRIVER=memory` secara default. Production wajib
menggunakan:

```bash
DATA_STORE_DRIVER=postgresql
DATABASE_URL=<managed PostgreSQL connection string>
SCAN_QUEUE_DRIVER=<shared durable queue adapter>
```

`DATABASE_URL` hanya dibaca server-side. Jangan menaruhnya di browser, audit
payload, atau log. Aplikasi memeriksa koneksi database saat startup dan error
database tidak diubah menjadi hasil scan yang terlihat valid.

## Migration dan rollback

Migration bersifat versioned dan dijalankan eksplisit:

```bash
npm run db:migrate
npm run db:rollback
```

`db:rollback` menghapus schema Phase 3 dan data di dalam tabel tersebut. Jalankan
hanya setelah backup dan persetujuan operator. Migration memakai advisory lock dan
transaction sehingga dua runner tidak berjalan bersamaan.

Sebelum migration:

1. ambil backup PostgreSQL;
2. catat versi migration dan engine/evidence schema;
3. jalankan migration di environment pengujian;
4. verifikasi constraint, indeks tenant, dan row count;
5. simpan output verifikasi sebagai bukti release.

## Backup dan restore drill

Target Phase 3 adalah RPO maksimal 1 jam dan RTO maksimal 4 jam. Contoh drill
yang dapat diulang pada environment non-production:

```bash
pg_dump --format=custom --file=ca-xray-phase3.dump "$DATABASE_URL"
createdb ca_xray_restore_drill
pg_restore --clean --if-exists --dbname=ca_xray_restore_drill ca-xray-phase3.dump
```

Verifikasi minimal setelah restore:

- `scan_jobs`, `scans`, `findings`, `evidence`, dan `audit_logs` memiliki row
  yang sama seperti sebelum backup;
- unique key idempotency tidak berubah;
- outbox `PENDING` masih dapat diproses ulang;
- workspace scope tetap menjadi predicate query;
- hash report/evidence tetap sama.

Waktu backup, restore, dan hasil verifikasi harus dicatat oleh operator. Backup
production harus terenkripsi dan aksesnya dibatasi.

## Failure handling

Pembuatan scan mengikat idempotency key, usage counter, `scan_jobs`, audit event,
dan outbox event di satu transaction. Duplicate request mengembalikan response
yang sama dan tidak mengonsumsi quota kedua kali. Duplicate webhook memakai
`(provider, event_id)` sebagai unique key.

Report selesai immutable: hasil disimpan dengan engine version dan hash. Jika
engine berubah, buat record scan/report baru; jangan memperbarui report selesai
di tempat.