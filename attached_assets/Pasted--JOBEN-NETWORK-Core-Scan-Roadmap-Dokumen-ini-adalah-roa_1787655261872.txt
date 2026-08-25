# JOBEN NETWORK — Core Scan Roadmap

Dokumen ini adalah roadmap khusus mesin **Core Scan**: validasi target,
pengambilan evidence, normalisasi, analisis, risk scoring, reliability,
reporting, dan pengalaman scan responsive.

Roadmap ini sengaja memisahkan:

- **sudah completed dan tervalidasi**
- **sedang menjadi batasan produk**
- **pekerjaan yang wajib diselesaikan sebelum klaim full coverage**

Tidak ada fase yang boleh menyatakan contract/token aman hanya karena provider
mengembalikan data kosong, timeout, atau status yang tidak diketahui.

Roadmap Risk Passport dipelihara sebagai dokumen terpisah karena Passport
adalah modul longitudinal yang mengonsumsi snapshot Core Scan, mengelola
perubahan, monitoring, review, dan audit:
`doc/RISK-PASSPORT-ROADMAP.md`.

---

## 1. Sasaran akhir

Core Scan dianggap production-grade apabila memenuhi seluruh kondisi berikut:

1. Target address divalidasi terhadap network yang dipilih sebelum provider
   dipanggil.
2. Bytecode/account state dibuktikan pada chain yang benar.
3. Setiap evidence memiliki status, provenance internal, confidence, waktu
   pengambilan, dan reference yang dapat diaudit.
4. `UNKNOWN`, `UNAVAILABLE`, `UNVERIFIED`, `CONFLICT`, `PARTIAL`, dan
   `VERIFIED` tidak pernah disamakan.
5. Risk score tidak mengubah evidence yang hilang menjadi nilai aman atau nol.
6. Scan besar berjalan asynchronous dan tidak menggantung request HTTP.
7. Histori lifetime hanya berstatus `COMPLETE` setelah pagination benar-benar
   selesai.
8. Provider failure tidak digantikan oleh fixture DEMO atau data sintetis.
9. Semua status penting tersedia dalam English dan Bahasa Indonesia.
10. Core scan tetap usable pada desktop dan mobile tanpa horizontal overflow.
11. Hasil yang ditampilkan ke user menjelaskan coverage per network dan per
    capability, bukan hanya menampilkan angka score.

---

## 2. Baseline saat ini

### 2.1 Yang sudah completed dan tervalidasi

- Katalog berisi **53 network**.
- **38 network EVM** memiliki RPC dan `rpc-contract` adapter.
- **11 network native** memiliki adapter protocol-specific.
- **8 network** memiliki Blockscout indexer untuk histori transfer/log:
  Ethereum, BNB Chain, Base, Arbitrum, Polygon, Optimism, Gnosis, dan Astar.
- **4 network metadata-only** belum memiliki on-chain adapter:
  Sui, Aptos, Near, dan Stable.
- Validasi chain-aware mencegah address diproses pada network yang salah.
- EVM RPC membuktikan bytecode tersedia pada chain yang dipilih.
- Native adapter menggunakan validasi address dan endpoint protocol-specific.
- Provider result taxonomy sudah eksplisit:
  `valid`, `unknown`, `unavailable`, `provider_error`.
- Risk score dan reliability score dihitung terpisah.
- Transfer indexer mendukung:
  - pagination dengan `next_page_params`
  - initial cursor untuk resume
  - deduplikasi event
  - konversi amount desimal/hex ke representasi integer
  - `PARTIAL` dengan `nextCursor`
  - `COMPLETE` hanya ketika cursor habis
- Test suite engine: **86/86 lulus**.
- Visual regression private workspace: **20/20 lulus** pada desktop dan
  mobile.
- Homepage smoke check:
  - HTTP 200
  - 53 network tampil di UI
  - form scan lengkap
  - tidak ada horizontal overflow pada 1440px dan 390px.

### 2.2 Batasan yang harus terlihat di produk

- 53 network di katalog **tidak berarti 53 network memiliki kedalaman evidence
  yang sama**.
- Full lifetime indexer history saat ini tersedia hanya pada network yang
  memiliki Blockscout host.
- Cursor sudah dikembalikan oleh adapter, tetapi belum otomatis disimpan dan
  dilanjutkan oleh background continuation job.
- Sui, Aptos, Near, dan Stable belum boleh disebut full on-chain scan.
- Ketersediaan endpoint publik live belum dapat dianggap permanen; timeout,
  rate limit, provider error, dan perubahan schema harus tetap terlihat.

---

## 3. Capability contract per kelas network

| Kelas | Jumlah | Boleh diklaim | Tidak boleh diklaim |
|---|---:|---|---|
| EVM + RPC + Blockscout | 8 | bytecode, ABI/evidence bila tersedia, transfer history ter-pagination | histori lengkap bila cursor belum habis |
| EVM + RPC tanpa Blockscout | 30 | bytecode dan evidence RPC yang tersedia | full lifetime history |
| Native adapter | 11 | account/contract state sesuai coverage adapter | field yang tidak disediakan protocol/provider |
| Metadata-only | 4 | market/metadata bila tersedia | validasi deployment atau full contract risk |

UI dan report wajib menampilkan capability tersebut. Label “supported” harus
berarti “supported dengan capability tertentu”, bukan “semua evidence tersedia”.

---

## 4. Urutan pengembangan

## Fase 0 — Contract dan inventory evidence

**Tujuan:** menetapkan kontrak data yang tidak ambigu sebelum menambah provider.

### Pekerjaan

- Tetapkan schema canonical untuk:
  - target identity
  - deployment/bytecode
  - token metadata
  - ownership
  - contract capabilities
  - liquidity/market
  - transfer history
  - holder distribution
  - provider health
- Tambahkan capability matrix yang dapat dibaca engine dan UI.
- Bedakan secara eksplisit:
  - `not_supported`
  - `not_checked`
  - `unavailable`
  - `provider_error`
  - `partial`
  - `verified`
- Tetapkan freshness policy untuk setiap evidence family.
- Tetapkan stable evidence IDs dan schema version.

### Acceptance criteria

- Tidak ada field mandatory yang menggunakan `null` tanpa status.
- Report dapat menjelaskan mengapa sebuah field tidak tersedia.
- Network metadata tidak menjadi satu-satunya sumber kebenaran untuk deployment.
- Snapshot yang sama menghasilkan output deterministic ketika input provider
  sama.

### Status

**Sebagian besar completed.** Capability matrix user-facing dan freshness
policy lintas semua evidence masih perlu diselesaikan dalam fase berikutnya.

---

## Fase 1 — Validasi target lintas 53 network

**Tujuan:** memastikan scan tidak pernah berjalan pada chain atau format address
yang salah.

### Pekerjaan

- Pertahankan chain-aware validation sebelum provider call.
- Lengkapi protocol checksum/encoding validation untuk seluruh native adapter.
- Validasi:
  - format
  - checksum
  - payload length
  - network prefix
  - deployment/account existence
- Untuk EVM, panggil `eth_getCode` pada RPC chain yang dipilih.
- Klasifikasikan hasil secara terpisah:
  - invalid address
  - valid syntax tetapi tidak deployed
  - provider unavailable
  - deployed and verified.
- Hindari fallback ke network lain ketika RPC chain target gagal.

### Acceptance criteria

- Address EVM valid di Ethereum tetapi tidak deployed di Base menghasilkan
  status `CONTRACT_NOT_DEPLOYED_ON_NETWORK`, bukan hasil Ethereum.
- Address native dengan prefix/checksum salah ditolak sebelum network call.
- Provider tidak dipanggil untuk input yang invalid.
- Setiap 53 entri memiliki:
  - unique ID
  - chain identity atau native protocol identity
  - capability declaration
  - status fallback yang eksplisit.

### Test gate

- Matrix test 53 network.
- Negative test untuk cross-chain address.
- Mock RPC test untuk empty bytecode dan malformed response.
- Timeout dan provider error test untuk setiap adapter family.

---

## Fase 2 — Adapter evidence yang production-grade

**Tujuan:** mendapatkan evidence yang benar-benar sesuai capability provider.

### EVM

- RPC contract adapter:
  - bytecode existence
  - chain identity
  - read-only contract calls
  - deployer/creation evidence bila provider menyediakannya.
- Blockscout:
  - ABI/source verification
  - owner/creator evidence
  - token transfer pagination
  - ownership event pagination.
- DexScreener:
  - market pairs dan liquidity
  - pair age sebagai **Pair Age**, bukan Contract Age.
- GoPlus:
  - security capability signals
  - sinyal positif tanpa ABI confirmation tetap `UNVERIFIED_SIGNAL`
    dengan confidence rendah.

### Native

- Solana:
  - account/mint
  - holder evidence
  - supply consistency.
- TON, Tron, XRPL, Starknet, Cosmos-family, Cardano:
  - protocol-specific account/contract evidence
  - protocol-specific address and checksum rules
  - explicit coverage limitations.

### Acceptance criteria

- Adapter tidak mengembalikan data sintetis ketika provider gagal.
- Schema response invalid menjadi `provider_error`.
- `pairs: null` dipetakan menjadi no-pair/unavailable sesuai provider contract,
  bukan malformed response.
- Semua amount besar diproses sebagai integer-safe value.
- Tidak ada `NaN`, `Infinity`, atau implicit zero dari data provider.

---

## Fase 3 — Lifetime history dan cursor continuation

**Tujuan:** menyelesaikan histori lifetime tanpa memperbesar timeout request.

### Pekerjaan

- Simpan `transferCursor` dan `ownerCursor` pada payload/status job.
- Saat indexer mengembalikan `PARTIAL`:
  - persist page count
  - persist cursor terakhir
  - persist unique event count
  - persist reason dan retrieval timestamp.
- Buat continuation job asynchronous yang:
  - mengambil cursor terakhir
  - melanjutkan pagination
  - merge secara idempotent
  - tidak menggandakan event
  - mengupdate aggregate holder.
- Tambahkan expiry dan invalid-cursor handling.
- Pisahkan:
  - `scan complete with full history`
  - `scan complete with partial history`
  - `scan failed before evidence`
- Gunakan durable queue dan persistence di production.

### Acceptance criteria

- `COMPLETE` hanya dihasilkan ketika `nextCursor === null`.
- Restart worker tidak menggandakan transfer atau owner event.
- Scan dapat dilanjutkan setelah timeout tanpa mengulang seluruh history.
- Report menunjukkan:
  - page count
  - observed event count
  - history status
  - last cursor checkpoint bila partial.
- Jika cursor invalid atau provider berhenti menyediakan halaman, hasil menjadi
  `PARTIAL`/`UNAVAILABLE` dengan alasan yang dapat diaudit.

### Test gate

- Resume dari page 2 sampai page terakhir.
- Duplicate event di dua halaman.
- Cursor invalid.
- Worker restart di tengah traversal.
- Pagination budget tercapai berulang kali.
- History kosong yang sah versus response malformed.

---

## Fase 4 — Normalisasi, scoring, dan uncertainty

**Tujuan:** menghasilkan keputusan yang dapat dipahami tanpa false confidence.

### Pekerjaan

- Pertahankan risk category tanpa redistribusi bobot ketika evidence unknown.
- Tampilkan coverage dan `unscored_weight_pct`.
- Pisahkan:
  - risk score
  - reliability score
  - evidence coverage
  - freshness
  - provider health.
- Tandai provider conflict secara eksplisit dan keluarkan dari silent scoring.
- Beri confidence per finding.
- Pastikan partial history tidak tampil sebagai full holder truth.
- Buat reason code yang stabil dan language-neutral.

### Acceptance criteria

- Evidence yang hilang tidak otomatis menurunkan risk ke level aman.
- Score final dapat bernilai unavailable/unknown ketika evidence inti tidak
  cukup.
- Conflict tidak dimenangkan berdasarkan urutan provider.
- Public report menghapus provider identity internal tetapi mempertahankan
  evidence reference.
- Semua finding memiliki:
  - severity
  - confidence
  - status
  - evidence reference
  - explanation.

---

## Fase 5 — Scan job, reliability, dan operasional

**Tujuan:** membuat scan responsif dan aman untuk beban nyata.

### Pekerjaan

- Request HTTP hanya memvalidasi dan membuat job.
- Worker menjalankan provider calls di luar request path.
- Production queue wajib PostgreSQL/durable queue.
- Implement:
  - lease
  - retry bounded
  - dead-letter
  - cancellation
  - idempotency
  - per-workspace concurrency limit
  - provider circuit breaker.
- Tambahkan telemetry:
  - latency per provider
  - timeout rate
  - partial rate
  - invalid response rate
  - average pages per history
  - cursor continuation backlog
  - cost per completed scan.
- Readiness harus menolak production bila queue/storage masih memory-backed.

### Acceptance criteria

- Tidak ada synchronous request yang menggantung sampai seluruh histori selesai.
- Retry tidak mengubah hasil menjadi data DEMO.
- Provider outage menghasilkan status yang jujur dan terukur.
- Scan job dapat diobservasi dari `QUEUED`, `RUNNING`, `SUCCEEDED`,
  `PARTIAL`, atau `FAILED`.
- `/healthz`, `/readyz`, dan `/metrics` membedakan liveness, readiness, dan
  telemetry.

---

## Fase 6 — UI responsive dan report decision-grade

**Tujuan:** membuat hasil scan dapat dipakai di desktop maupun mobile tanpa
menyembunyikan keterbatasan evidence.

### Pekerjaan

- Homepage:
  - network selector
  - address form
  - validation feedback
  - capability hint per network.
- Scan progress:
  - validation
  - provider fetch
  - normalization
  - analysis
  - scoring
  - partial/continuation state.
- Report:
  - evidence coverage
  - risk/reliability separation
  - unknown/unavailable legend
  - history completeness
  - provider limitation summary
  - mobile-friendly evidence tables.
- Setiap user-facing copy baru wajib tersedia dalam English dan Bahasa
  Indonesia.
- Gunakan reduced-motion behavior untuk scan telemetry.

### Acceptance criteria responsive

- Viewport minimum yang diuji: 390px wide.
- Tidak ada horizontal overflow pada homepage, scan form, report, table, dan
  error state.
- Semua primary action dapat diakses tanpa hover.
- Table besar memakai scroll container yang terlihat dan tidak merusak layout.
- Status `PARTIAL`, `UNKNOWN`, dan `UNAVAILABLE` terbaca pada mobile.
- Keyboard focus, label form, error association, dan button state valid.

### Test gate

- Homepage desktop/mobile smoke test.
- Semua private route desktop/mobile visual regression.
- New-scan validation state.
- Loading, partial, provider-error, empty, dan completed report state.

---

## 5. Release gates

### Gate A — Trustable Core Scan

Wajib sebelum menyebut scan dapat dipercaya:

- Fase 0–2 acceptance criteria lulus.
- Semua provider failure tetap uncertainty-safe.
- 53 network matrix tidak memiliki metadata contradiction.
- Contract deployment dibuktikan pada selected chain.
- Risk score tidak dihasilkan bila evidence inti tidak cukup.

### Gate B — Complete Lifetime History

Wajib sebelum memakai label “lifetime history complete”:

- Fase 3 selesai.
- Cursor tersimpan di job/persistence.
- Resume idempotent sudah diuji.
- `COMPLETE` hanya muncul saat cursor habis.
- Partial history terlihat jelas di API, report, dan UI.

### Gate C — Production Scan

Wajib sebelum production deployment:

- Fase 5 selesai.
- PostgreSQL persistence dan durable queue aktif.
- Readiness menolak memory driver di production.
- Retry, lease, dead-letter, cancellation, metrics, dan alerting diuji.
- Provider allowlist dan timeout budget aktif.

### Gate D — Responsive Decision UI

Wajib sebelum release user-facing:

- Fase 6 selesai.
- Desktop/mobile visual regression lulus.
- Tidak ada horizontal overflow.
- Semua status uncertainty tampil dan diterjemahkan.
- Accessibility smoke test lulus.

---

## 6. Definition of Done per scan

Satu scan hanya boleh disebut **completed dan valid** bila:

1. Network dan address valid.
2. Contract/account existence sudah diverifikasi atau status unavailable
   dijelaskan.
3. Provider results tervalidasi schema-nya.
4. Evidence dinormalisasi dengan provenance internal.
5. Tidak ada conflict yang disembunyikan.
6. Risk dan reliability dihitung sesuai coverage.
7. Histori diberi status `COMPLETE` atau `PARTIAL` yang benar.
8. Semua limitations masuk ke report.
9. Response HTTP tidak menggantung.
10. Hasil dapat dibuka dan dibaca pada desktop serta mobile.
11. Retry atau refresh tidak menggandakan evidence.
12. Tidak ada angka yang berasal dari tebakan, implicit zero, atau DEMO
    fallback.

---

## 7. Out of scope untuk Core Scan

Hal berikut tidak boleh masuk ke core scan tanpa keputusan produk terpisah:

- wallet connection
- private key, signing, atau transaksi
- trading execution
- financial recommendation
- klaim “safe”, “guaranteed”, atau “not a scam”
- social popularity score
- AI conclusion tanpa evidence reference
- network expansion tanpa adapter, tests, dan capability declaration

---

## 8. Prioritas implementasi

Urutan prioritas yang direkomendasikan:

1. **P0:** persist dan resume cursor lifetime history.
2. **P0:** capability matrix yang terlihat di UI/report.
3. **P0:** validasi live endpoint dan contract existence per network family.
4. **P1:** durable queue, retry, lease, dan continuation worker.
5. **P1:** freshness, provider health, dan partial-history telemetry.
6. **P1:** native adapter edge-case matrix.
7. **P2:** tambahan indexer untuk EVM yang saat ini hanya RPC.
8. **P2:** adapter on-chain untuk Sui, Aptos, Near, dan Stable.
9. **P2:** expanded accessibility and responsive state coverage.

Prioritas tidak boleh dibalik dengan cara menambah network baru sebelum
network yang sudah tercantum memiliki capability dan status yang jujur.
