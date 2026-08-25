# JOBEN NETWORK — Watchtower Core Module Roadmap

---

Version: 1.0  
Last updated: 2026-08-25  
Status: Draft for implementation planning  
Owner: Product + Core Intelligence  
Parent module: Risk Passport  
Upstream dependency: Core Scan / Evidence Snapshot

---

## 1. Keputusan utama

Watchtower adalah **roadmap dan delivery surface yang mandiri**, tetapi bukan produk
yang berdiri sendiri. Ia merupakan submodul resmi Risk Passport yang mengonsumsi
snapshot hasil Core Scan.

Pembagian tanggung jawab:

- **Core Scan** menghasilkan evidence, finding, provenance, status, confidence, dan
  snapshot yang dapat diulang.
- **Risk Passport** mempertahankan identitas kontrak dan histori longitudinal.
- **Watchtower** menentukan apa yang dipantau, kapan pemeriksaan dijalankan, apakah
  perubahan material, siapa yang perlu diberi tahu, dan apa tindakan review berikutnya.
- **Case Workspace** menerima alert yang dipromosikan menjadi pekerjaan investigasi.

Watchtower tidak boleh menghitung ulang fakta provider secara terpisah, membuat
klaim “aman”, atau mengubah evidence sumber.

## 2. Ide inti: Evidence Pulse

Watchtower dibangun sebagai **Evidence Pulse**, bukan sistem notifikasi generik.
Setiap pulse adalah paket perubahan yang menjawab lima pertanyaan:

1. Apa yang berubah?
2. Apa nilai sebelum dan sesudahnya?
3. Evidence mana yang mendasari perubahan itu?
4. Seberapa material, reliable, dan fresh perubahan tersebut?
5. Apa tindakan yang aman dan dapat diaudit berikutnya?

Satu pulse dapat menghasilkan:

- tidak ada alert ketika perubahan tidak material;
- satu alert yang digabung ketika banyak field berubah dalam satu snapshot;
- beberapa delivery channel untuk satu event yang sama;
- eskalasi ke review queue atau case tanpa membuat evidence baru;
- status `UNKNOWN`, `UNAVAILABLE`, `UNVERIFIED`, `CONFLICT`, atau `VERIFIED`
  tetap terlihat dan tidak diratakan menjadi sinyal positif/negatif.

**Prinsip pembeda:** pengguna tidak menerima “contract changed”; pengguna menerima
perubahan yang terukur, terprovenance, memiliki tingkat materialitas, dan dapat
direplay ke snapshot sumber.

## 3. Kondisi saat ini (baseline yang sudah ada)

Fondasi Watchtower telah tersedia:

- watchlist tenant-scoped dengan label, network, address, status active/paused;
- interval pemeriksaan 1, 6, 12, 24, dan 168 jam;
- scheduler/tick yang memilih target due dan mengantrikan scan;
- deduplikasi snapshot berbasis evidence hash;
- snapshot, timeline, trajectory, dan perbandingan before/after;
- delapan tipe rule: risk increase, owner, privilege, proxy, tax, liquidity,
  holder concentration, provider disagreement;
- event alert dan acknowledgement;
- API private untuk watchlist, tick, alert rules, alert events, dan acknowledgement;
- queue in-memory untuk development serta adapter PostgreSQL untuk durable
  processing;
- UI desktop/mobile dasar untuk daftar watchlist dan alert;
- locale English dan Bahasa Indonesia sebagai kontrak produk.

Baseline ini adalah **foundation**, bukan definisi selesai. Beberapa gap penting:

- scheduler masih dipicu oleh timer lokal dan endpoint manual;
- claim/lease target monitoring belum memiliki semantik durable yang lengkap;
- channel `webhook` dan `email` belum menjadi delivery pipeline yang dapat
  diobservasi end-to-end;
- rule belum menjadi kontrak materiality yang kaya evidence dan configurable;
- alert belum memiliki lifecycle lengkap, grouping, suppression, escalation, dan
  retry/dead-letter delivery;
- UI belum menjadi ruang review perubahan yang menjelaskan evidence;
- cakupan network dan capability perlu ditentukan dari registry/capability nyata,
  bukan daftar tampilan yang hardcoded;
- belum ada release gate khusus Watchtower yang membuktikan freshness, idempotency,
  tenant isolation, delivery, dan mobile usability bersama-sama.

## 4. Tujuan dan non-goals

### Tujuan

1. Memantau kontrak lintas network secara terjadwal dan durable.
2. Mengubah dua snapshot menjadi perubahan yang dapat dijelaskan dan diverifikasi.
3. Mengurangi alert noise melalui materiality, grouping, deduplication, dan
   suppression yang dapat diaudit.
4. Menyampaikan alert secara reliable dengan status delivery yang jelas.
5. Memberi reviewer jalur cepat dari alert ke timeline, evidence, dan case.
6. Menjamin perilaku yang sama di desktop dan mobile tanpa mengorbankan detail
   forensic.

### Non-goals untuk v1

- wallet connection, signing, transaction execution, trading, atau auto-remediation;
- prediksi harga atau financial recommendation;
- klaim bahwa kontrak aman hanya karena tidak ada alert;
- generic AI chat yang dapat mengubah severity atau evidence;
- monitoring mempool real-time atau raw event firehose;
- ekspansi network tanpa adapter, address validation, RPC/provider policy, dan
  test evidence yang lengkap;
- pengiriman email/webhook tanpa consent, endpoint policy, secret management, dan
  audit delivery;
- menghapus histori alert atau snapshot secara destruktif.

## 5. Submodul Watchtower

### Layer A — Observe

| # | Submodul | Tanggung jawab | Output wajib |
|---|---|---|---|
| W1 | Watch Target & Scope | Identitas target, network, capability, label, owner, status, timezone | Target versioned dan tenant-scoped |
| W2 | Schedule & Durable Orchestrator | Interval, due calculation, claim, lease, retry, pause/resume, missed run | Satu run idempotent per target/window |
| W3 | Evidence Snapshot Intake | Validasi scan selesai, schema/version, provenance, freshness, evidence hash | Snapshot immutable yang dapat direplay |
| W4 | Change & Materiality Engine | Before/after, comparability, thresholds, confidence, severity, unknown handling | `ChangeSet` + materiality decision |

### Layer B — Decide

| # | Submodul | Tanggung jawab | Output wajib |
|---|---|---|---|
| W5 | Signal Correlation & Alert Grouping | Menggabungkan perubahan satu run, correlation key, suppression, cooldown | Satu alert bermakna per incident |
| W6 | Rule & Policy Controls | Rule per target/workspace, enabled state, threshold, quiet hours, escalation | Rule version dan audit event |
| W7 | Alert Lifecycle & Review Queue | Open, acknowledged, snoozed, investigating, resolved, reopened, linked case | State transition yang sah dan auditable |
| W8 | Reliability & Freshness Health | Provider health, stale target, missed check, confidence drift, coverage regression | Health state terpisah dari risk state |

### Layer C — Act

| # | Submodul | Tanggung jawab | Output wajib |
|---|---|---|---|
| W9 | Delivery Orchestrator | In-app, webhook, email; outbox, retry, signature, endpoint health | Delivery attempt dan terminal status |
| W10 | Forensic Review UX & Export | Pulse detail, timeline, evidence links, compare, acknowledge, case handoff, export | Review workflow responsive dan evidence-complete |

## 6. Kontrak domain inti

Nama field dapat berubah saat engineering scoping, tetapi semantik berikut tidak
boleh berubah:

### Monitoring target

- `targetId`, `workspaceId`, `networkId`, normalized `address`;
- `status`: `ACTIVE`, `PAUSED`, `ERROR`, `ARCHIVED`;
- `schedule`: interval, timezone, next due, last successful run;
- `capabilityProfile`: capability yang benar-benar tersedia untuk network/provider;
- `ruleSetVersion`, `createdAt`, `updatedAt`;
- tidak menerima `workspaceId` dari request sebagai sumber otoritas.

### Monitoring run

- `runId`, `targetId`, `windowKey`, `jobId`;
- `QUEUED`, `CLAIMED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`,
  `DEAD_LETTERED`;
- attempt count, lease owner/expiry, started/completed time;
- provider health, scan data status, error code yang terstruktur;
- retry tidak boleh membuat snapshot, alert, atau delivery duplicate.

### Change set

- `beforeSnapshotId`, `afterSnapshotId`, `detectedAt`;
- field, before value, after value, delta, unit;
- `comparability`: `COMPARABLE`, `NOT_COMPARABLE`;
- evidence references, provider/source, observed time;
- `materiality`: `NONE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`;
- `confidence` dan `reliability` terpisah;
- perubahan unknown/unavailable tidak boleh diperlakukan sebagai angka nol.

### Alert

- `alertId`, `correlationId`, `ruleVersion`, target, snapshot/timeline references;
- type, materiality, severity, confidence, message key;
- evidence register dan before/after summary;
- status lifecycle, actor, timestamps, acknowledgement reason;
- delivery summary per channel;
- dedupe key stabil dan dapat diaudit.

## 7. Prioritas delivery

Roadmap menggunakan `Now / Next / Later` sebagai komitmen relatif. Estimasi
merupakan rentang kerja lintas product, design, engineering, dan QA; bukan
janji tanggal.

### NOW — W0: Contract and trust gate

**Outcome:** Watchtower memiliki definisi kebenaran yang tidak ambigu sebelum
durable worker dan channel dibangun.

Scope:

- finalisasi domain contract di atas dan status machine;
- capability matrix per network/provider;
- definisi materiality untuk delapan alert yang ada;
- aturan comparability dan stale/unknown/conflict;
- idempotency key untuk target, run, snapshot, alert, dan delivery;
- threat model untuk webhook SSRF, replay, secret exposure, tenant escape, dan
  abuse terhadap scheduler;
- metric/event taxonomy dan audit requirements.

Acceptance:

- setiap alert dapat ditelusuri ke before/after snapshot dan evidence reference;
- setiap `UNKNOWN`/`UNAVAILABLE`/`UNVERIFIED`/`CONFLICT` mempertahankan statusnya
  dari engine sampai UI dan delivery;
- rule tanpa evidence yang comparable menghasilkan no-trigger atau
  `NOT_COMPARABLE`, bukan false positive;
- semua state transition memiliki actor/system cause dan timestamp.

Estimasi: **S–M (1–2 minggu)**.  
Gate: product + security + core intelligence sign-off.

### NOW — W1: Durable monitoring foundation

**Outcome:** satu target due hanya menghasilkan satu monitoring run meskipun
timer, worker, atau request diulang.

Scope:

- scheduler berbasis database/outbox atau mekanisme durable yang setara;
- claim/lease dengan expiry dan recovery setelah worker mati;
- bounded concurrency per workspace/provider/network;
- retry dengan backoff, dead-letter, replay yang eksplisit;
- missed-run policy: catch-up terbatas, skip, atau mark stale;
- pause/resume tidak membuat pekerjaan lama hidup kembali secara tidak sengaja;
- observability untuk due lag, run latency, queue depth, retry, DLQ.

Acceptance:

- dua worker tidak dapat claim window target yang sama secara bersamaan;
- lease yang expired dapat direclaim tanpa duplicate alert;
- restart worker mempertahankan queued/running state yang sah;
- target gagal berulang masuk dead-letter dengan alasan yang dapat ditindaklanjuti;
- p95 scheduler due lag dan p95 run latency memiliki dashboard/alert operasional.

Estimasi: **L–XL (3–6 minggu)**.  
Dependency: W0, persistence migration, queue/operations contract.

### NOW — W2: Evidence Pulse engine

**Outcome:** perubahan dihitung dari evidence snapshot secara deterministik dan
tidak noisy.

Scope:

- field registry dengan unit, direction, tolerance, dan comparability;
- material change rules untuk risk, owner, privilege, proxy, tax, liquidity,
  holder concentration, provider disagreement;
- threshold absolut/relatif dengan minimum data quality;
- grouping perubahan dalam satu completed scan;
- correlation/dedupe key yang stabil lintas retry;
- explanation bilingual berbasis locale key, bukan string hardcoded;
- snapshot replay yang menghasilkan keputusan sama pada schema/version yang sama.

Acceptance:

- perubahan field numerik menghasilkan before, after, delta, unit, dan direction;
- perubahan address/boolean menunjukkan before/after tanpa menebak dampak;
- provider disagreement tidak dikonversi menjadi risk increase;
- evidence hash sama tidak membuat snapshot atau alert baru;
- evidence hash berbeda tetapi tidak material tidak membuat alert material;
- fixture yang sama menghasilkan `ChangeSet` identik pada pengulangan.

Estimasi: **M (2–4 minggu)**.  
Dependency: W0; memakai output Core Scan dan Risk Passport.

### NEXT — W3: Alert operations and delivery

**Outcome:** alert bukan hanya record database; pengguna dapat mengetahui apakah
notifikasi benar-benar terkirim dan mengapa gagal.

Scope:

- in-app inbox dengan unread/open count;
- webhook outbox dengan HTTPS allowlist/endpoint policy, signing, timeout,
  retry, backoff, replay, dan delivery log;
- email provider abstraction, consent, template locale, unsubscribe, retry;
- quiet hours, cooldown, suppression, severity escalation;
- per-channel status: queued, sent, acknowledged by receiver jika tersedia,
  failed, dead-lettered;
- rate limit dan per-workspace delivery budget;
- tidak pernah menaruh secret dalam log, URL, evidence bundle, atau alert body.

Acceptance:

- satu alert dengan tiga channel memiliki delivery attempt terpisah namun satu
  `alertId` dan satu audit trail;
- timeout/5xx retry sesuai policy dan berhenti di batas maksimum;
- permanent 4xx tidak retry tanpa perubahan endpoint/replay manual;
- webhook payload dapat diverifikasi tanpa membocorkan signing secret;
- delivery failure tidak mengubah evidence atau menghapus alert in-app;
- pengguna dapat membedakan “alert dibuat” dari “notifikasi terkirim”.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: W1, W2, environment/integration setup, notification policy.

### NEXT — W4: Review queue and case handoff

**Outcome:** reviewer dapat bergerak dari signal ke keputusan tanpa kehilangan
konteks forensik.

Scope:

- filter/sort berdasarkan severity, materiality, freshness, confidence, network,
  status, dan delivery;
- alert detail dengan before/after, evidence provenance, timeline, source status,
  provider disagreement, dan “why it triggered”;
- lifecycle: open, acknowledged, snoozed, investigating, resolved, reopened;
- assign reviewer, add reason/note, link/create case;
- escalation rule untuk alert yang tidak direview;
- export/share hanya dengan snapshot dan permission yang valid;
- audit event append-only untuk semua perubahan status.

Acceptance:

- reviewer dapat membuka alert dan melihat evidence yang menyebabkan trigger;
- resolve tanpa rationale ditolak untuk alert medium/high/critical;
- alert yang sudah resolved dapat reopened bila snapshot baru memenuhi rule;
- case handoff mempertahankan `alertId`, `timelineId`, dan snapshot references;
- member workspace lain tidak dapat membaca atau memutasi alert tersebut.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: W2, W3, Case Workspace contract, localization.

### NEXT — W5: Health, coverage, and network expansion

**Outcome:** Watchtower dapat menyatakan “pemantauan tidak sehat” secara jujur,
terpisah dari risk contract.

Scope:

- per-target health: current, stale, degraded, blocked, error;
- provider/network capability and coverage matrix;
- freshness SLA per target dan interval;
- detection gap report ketika provider unavailable atau field turun coverage;
- multi-network onboarding berdasarkan registry dan deployed bytecode/address policy;
- operator view untuk provider outage dan backlog.

Acceptance:

- stale monitoring tidak ditampilkan sebagai “no change”;
- unavailable provider membuat health degraded/blocked dengan alasan eksplisit;
- target baru hanya dapat diaktifkan jika network, address validation, dan
  provider capability lulus checklist;
- UI tidak menampilkan network yang belum memiliki runtime capability;
- health score tidak digabungkan secara diam-diam dengan risk score.

Estimasi: **M–L (3–6 minggu)**.  
Dependency: W1, provider registry, chain target validation, operations telemetry.

### LATER — W6: Advanced intelligence

Directional, belum menjadi komitmen v1:

- baseline adaptif berbasis histori dengan guardrail dan explanation;
- cross-target correlation untuk deployer, owner, liquidity, dan provider;
- anomaly cluster yang tetap berlabel `INFERRED`;
- notification digest dan stakeholder routing;
- simulation/replay “apa yang akan terjadi jika rule diubah?”;
- API/webhook consumer contract untuk external risk operations.

Tidak boleh dikerjakan sebelum W0–W5 memenuhi release gates dan false-confidence
review menunjukkan hasil yang dapat dipercaya.

## 8. UX blueprint responsive

### Desktop

1. **Watchtower Overview**
   - summary: active targets, due now, stale, open alerts, delivery failures;
   - filter bar dengan status, severity, network, freshness, confidence;
   - target table dengan last successful run dan next due;
   - alert feed yang mengelompokkan perubahan dalam satu pulse.
2. **Target detail**
   - status health di atas, risk state terpisah;
   - schedule, capability coverage, rule set, recent runs;
   - timeline snapshot yang bisa dibandingkan.
3. **Pulse detail**
   - headline perubahan;
   - before/after cards;
   - evidence register dan provider/source;
   - confidence, reliability, freshness, materiality;
   - actions: acknowledge, snooze, assign, open case, export.

### Mobile

- satu kolom, tanpa horizontal table scroll untuk tindakan inti;
- target row menjadi stacked card: identity, health, last check, next check;
- filter dibuka sebagai bottom sheet/accordion;
- pulse memakai progressive disclosure: summary dahulu, evidence detail sesudahnya;
- tombol acknowledge/case tetap reachable dengan minimum touch target 44px;
- status tidak bergantung pada warna saja; gunakan label dan icon yang konsisten;
- long address memakai truncation dengan copy action yang accessible;
- timezone dan relative time mengikuti locale/user setting;
- loading, empty, stale, error, dan permission state harus memiliki desain
  eksplisit.

Responsive bukan sekadar mengecilkan desktop. Informasi prioritas tetap:
**health → material change → evidence → next action**.

## 9. Security, privacy, and localization gates

### Security

- seluruh query dan mutation tenant-scoped server-side;
- scheduler tidak menerima workspace scope dari client sebagai otoritas;
- idempotency dan authorization diuji pada retry, replay, dan race;
- webhook SSRF protection: HTTPS policy, DNS/IP validation sesuai threat model,
  timeout, size limit, redirect policy;
- signing secret hanya melalui secret management, tidak melalui chat, source,
  payload log, atau UI;
- audit trail append-only untuk rule, schedule, delivery, acknowledgement,
  assignment, resolution, dan replay;
- export/share harus memeriksa snapshot permission dan expiry;
- rate limit untuk create target, tick/replay, rule mutation, export, dan delivery.

### Evidence integrity

- alert menyimpan reference ke snapshot/timeline, bukan salinan bebas yang dapat
  menyimpang;
- source timestamp, capture timestamp, engine/schema version dipertahankan;
- provider error tidak diubah menjadi no-change;
- evidence conflict tidak diselesaikan oleh Watchtower tanpa policy/independent
  evidence;
- setiap derived materiality decision dapat dijelaskan dan direplay.

### Localization

- English dan Bahasa Indonesia dikirim bersamaan;
- semua copy baru memakai locale key;
- status internal, IDs, severity, confidence, dan API fields tetap language-neutral;
- istilah `UNKNOWN`, `UNAVAILABLE`, `UNVERIFIED`, `CONFLICT`, `VERIFIED` memiliki
  arti berbeda dan tidak boleh diterjemahkan menjadi satu status;
- date, number, percent, currency, timezone, pluralization mengikuti formatter;
- security/compliance wording membutuhkan native-language review.

## 10. Quality strategy dan release gates

Tidak ada release “completed” hanya karena endpoint atau screen sudah tersedia.

### Test layers

1. **Domain fixtures:** field comparability, materiality, threshold, trajectory,
   dedupe, grouping, status transitions.
2. **Persistence/queue:** transaction, unique key, lease expiry, retry, DLQ,
   restart recovery, concurrent claim.
3. **HTTP authorization:** tenant isolation, role, request size, idempotency,
   replay, error contract.
4. **Provider contract:** unavailable, timeout, malformed, conflict, stale, chain
   mismatch, capability missing.
5. **Delivery:** webhook signing, retry matrix, permanent failure, email locale,
   consent, no-secret logging.
6. **Browser acceptance:** desktop and mobile overview, target detail, pulse
   detail, filters, empty/error/stale states, keyboard and screen-reader basics.
7. **Operations drill:** worker crash, provider outage, backlog, clock skew,
   duplicate tick, replay dead-letter, backup/restore.

### Release gates

**Gate A — Trustable Pulse**

- deterministic ChangeSet;
- evidence links lengkap;
- no false zero dari unknown/unavailable;
- dedupe dan idempotency lulus;
- English/Indonesian tersedia.

**Gate B — Durable Watchtower**

- restart-safe scheduler;
- lease/retry/DLQ;
- freshness/health metrics;
- tenant and role isolation;
- operational runbook dan recovery drill.

**Gate C — Actionable Alerting**

- delivery status end-to-end;
- retry and replay safe;
- acknowledgement/review/case audit;
- export respects permission;
- responsive browser acceptance lulus.

**Gate D — Production Watchtower**

- capability matrix untuk seluruh target network yang dipasarkan;
- load test sesuai target Phase 0;
- provider outage and notification incident drill;
- false-confidence review disetujui;
- product, security, operations, dan localization sign-off.

## 11. Success metrics

Metrics diukur terpisah antara correctness, reliability, dan product usage:

### Correctness

- duplicate alert rate;
- false-confidence incident rate;
- percentage alert with complete evidence register;
- percentage pulse with valid before/after or explicit non-comparable reason;
- rule replay determinism rate;
- unknown/unavailable preservation rate.

### Reliability

- p50/p95 due-to-run latency;
- monitoring success rate by provider/network;
- stale target rate;
- queue retry and dead-letter rate;
- delivery success rate by channel;
- webhook/email terminal failure rate;
- recovery time after worker/provider outage.

### Product

- active monitored targets;
- repeat monitoring rate;
- alert acknowledgement time;
- alert-to-case conversion;
- resolution time by severity;
- suppression/noise rate;
- mobile review completion rate;
- export/share usage where permission allows.

Target numerik wajib ditetapkan setelah baseline telemetry tersedia. Jangan
memasukkan angka yang belum memiliki sumber observasi ke dalam commitment.

## 12. Dependency map

```text
Core Scan
  -> Evidence Snapshot + provenance + statuses
    -> Risk Passport identity/timeline
      -> W0 Contract
        -> W1 Durable Orchestrator
        -> W2 Evidence Pulse
          -> W3 Delivery
          -> W4 Review Queue / Case Handoff
        -> W5 Health / Capability
          -> W6 Advanced Intelligence
```

Blocking dependencies:

- W1 tidak boleh production-ready tanpa persistence transaction/lease contract;
- W2 tidak boleh mendefinisikan ulang schema evidence Core Scan;
- W3 tidak boleh aktif tanpa secret, endpoint, consent, dan abuse policy;
- W4 membutuhkan Case Workspace permission dan append-only timeline contract;
- W5 membutuhkan provider registry yang dapat menyatakan capability aktual;
- W6 tidak boleh dimulai hanya karena UI W1–W4 terlihat selesai.

## 13. Definition of Done

Watchtower dianggap **completed** hanya bila semua kondisi ini benar:

1. target dapat dibuat, dipause, diresume, diubah, diarsipkan, dan dihapus sesuai
   policy tanpa kehilangan histori;
2. schedule durable, idempotent, lease-aware, retry-safe, dan restart-safe;
3. setiap completed run menghasilkan snapshot baru atau duplicate/no-change result
   yang eksplisit;
4. setiap material change memiliki before/after, provenance, confidence,
   freshness, materiality, dan explanation;
5. alert grouping, dedupe, suppression, escalation, lifecycle, dan audit lengkap;
6. in-app delivery reliable dan webhook/email memiliki retry, terminal status,
   replay, consent, serta secret-safe logging;
7. stale, unavailable, conflict, unverified, dan provider outage terlihat jelas
   serta tidak dipresentasikan sebagai “aman” atau “tidak berubah”;
8. semua private data tenant-scoped dan semua privileged action authorized;
9. desktop dan mobile flow lulus acceptance untuk overview, target, pulse,
   filter, empty, loading, stale, error, dan permission state;
10. English dan Bahasa Indonesia lengkap dan direview untuk istilah risk/evidence;
11. automated tests, browser acceptance, load/recovery drill, dan operations
    runbook lulus release gates;
12. tidak ada open critical/high defect pada correctness, security, data integrity,
    atau delivery reliability.

## 14. Keputusan yang harus dikunci sebelum W0 selesai

- Apakah interval adalah minimum cadence atau exact wall-clock schedule?
- Kebijakan missed run: catch-up, skip, atau satu latest-only run?
- Threshold default tiap alert dan siapa yang boleh mengubahnya?
- Definisi materiality per network/provider capability?
- Apakah alert severity berasal dari finding severity, delta, policy, atau gabungan
  yang dapat dijelaskan?
- Berapa lama cooldown dan kapan alert boleh reopened?
- Channel delivery apa yang masuk v1 dan provider email resmi yang dipilih?
- Apakah target public/private berbeda dalam retention, sharing, dan delivery?
- Retention snapshot, alert, delivery log, dan dead-letter sesuai kebutuhan B2B?
- Target baseline telemetry dan SLO produksi setelah environment stabil?

## 15. Ringkasan prioritas

Urutan yang benar adalah:

1. **kunci kontrak evidence dan materiality;**
2. **buat scheduler durable dan idempotent;**
3. **hasilkan Evidence Pulse yang deterministik;**
4. **buat alert dapat dikirim dan dilacak;**
5. **sambungkan alert ke review/case;**
6. **ukur health dan capability;**
7. **baru tambah intelligence adaptif.**

Jangan membalik urutan ini dengan mempercantik feed, menambah network, atau
menambah channel sebelum correctness dan durability selesai. Watchtower yang
benar-benar selesai adalah sistem perubahan berbasis evidence yang dapat
dipercaya, bukan daftar kontrak dengan timer dan badge alert.