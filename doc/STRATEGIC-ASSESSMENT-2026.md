# JOBEN NETWORK — Strategic Assessment

**Tanggal penilaian:** 25 Agustus 2026  
**Mode:** asumsi seluruh roadmap produk dan Settings telah dibangun,
terintegrasi, production-grade, dan memenuhi release gate yang ditetapkan.  
**Jenis dokumen:** laporan strategi, bukan hasil telemetry produksi atau
financial forecast yang telah diaudit.

## 1. Executive summary

### Kesimpulan utama

JOBEN NETWORK berpotensi kuat menjadi **evidence operating layer untuk due
diligence, monitoring, dan review kontrak crypto lintas network**. Kekuatan
terbesarnya bukan sekadar mendeteksi token berisiko, melainkan menghubungkan:

```text
evidence → uncertainty → timeline → comparison → monitoring
         → case/review → report/API → audit decision
```

Jika benar-benar dibangun sesuai roadmap, JOBEN akan menempati ruang antara:

- scanner cepat yang memberi sinyal;
- platform enterprise yang mahal dan luas;
- spreadsheet/manual research yang tidak konsisten;
- API provider yang memberi raw data tetapi tidak memberi decision workflow.

### Skor ringkas

Skala 1–5:

- **1:** lemah/tidak terbukti;
- **3:** layak tetapi parity-heavy atau bergantung eksekusi;
- **5:** keunggulan struktural yang sulit ditiru.

| Dimensi | Skor | Penilaian |
|---|---:|---|
| Kejelasan masalah | 4.4/5 | Masalah false confidence, evidence fragmentation, dan monitoring nyata |
| Diferensiasi produk | 4.2/5 | Evidence lineage + uncertainty + workflow terintegrasi |
| Kesiapan enterprise | 4.0/5 | Governance, case, API, audit, report, roles; tetap perlu trust proof |
| Kekuatan data moat | 3.8/5 | Naik seiring historical snapshots dan verified provenance |
| Monetization potential | 4.0/5 | SaaS workspace + API + enterprise governance |
| Distribusi awal | 2.9/5 | Produk sulit dijual tanpa credibility, channel, dan reference customer |
| Defensibility 10 tahun | 4.1/5 | Schema/provenance/workflow moat jika data dan trust terus dikumpulkan |
| Execution complexity | 2.6/5 | Sangat kompleks: provider, chain, queue, security, billing, compliance |
| Risiko keseluruhan | 3.1/5 | Medium-high; terutama liability, provider dependency, dan market cyclicality |
| **Business readiness composite** | **3.8/5** | Menarik secara strategis, belum otomatis menjadi bisnis besar |

**Verdict:** **GO dengan fokus sempit dan bertahap**, bukan GO untuk menjadi
platform crypto serba ada. Wedge terbaik adalah **evidence-backed monitoring dan
review workspace untuk tim yang harus mempertanggungjawabkan keputusan**.

## 2. Assumsi penilaian

Penilaian ini mengasumsikan:

1. Core Scan, Risk Passport, Compare, Watchtower, Shared Reports, API Access,
   Community, Case/Compliance, Network Intelligence, Billing, dan User Settings
   selesai sesuai roadmap.
2. PostgreSQL durable, queue/worker, retry/dead-letter, backup/restore,
   observability, dan production security benar-benar berjalan.
3. Provider outages, missing evidence, conflicts, stale data, dan unsupported
   capability tetap ditampilkan secara eksplisit.
4. API keys, webhooks, sharing, export, billing, audit, role, MFA, dan tenant
   isolation telah melewati security gate.
5. JOBEN tidak menjual “safe token” atau financial recommendation.
6. Data competitor adalah snapshot publik pada Agustus 2026. Pricing,
   headcount, customer count, dan internal roadmap competitor tidak dianggap
   fakta jika tidak tersedia dari sumber resmi.
7. Angka scoring adalah judgment strategis berbobot, bukan hasil survei pasar.

**Confidence:**

- **High:** kemampuan yang ditentukan dalam roadmap dan sumber resmi produk;
- **Medium:** positioning dan gap kompetitor yang dapat diinferensikan dari
  public product surface;
- **Low:** willingness-to-pay, conversion, market share, dan timing 10 tahun.

## 3. Product assessment jika roadmap selesai

### 3.1 Jobs-to-be-done yang dapat dimenangkan

| Job pengguna | Solusi JOBEN | Nilai bisnis |
|---|---|---|
| “Apakah kontrak ini layak ditinjau lebih jauh?” | scan + risk range + coverage + provenance | Mengurangi waktu triage |
| “Apa yang berubah sejak terakhir diperiksa?” | Passport + Compare + Watchtower Evidence Pulse | Mengurangi blind spot monitoring |
| “Bisakah saya menjelaskan keputusan ini?” | evidence bundle + case + immutable report + audit | Mempercepat internal/external review |
| “Bisakah tim lain memverifikasi hasilnya?” | Shared Report + signed report + revision lineage | Meningkatkan trust dan handoff |
| “Bisakah sistem kami mengonsumsi hasil dengan aman?” | versioned API + uncertainty contract + SDK | Membuka embedded/API revenue |
| “Siapa boleh melihat atau mengubah apa?” | workspace roles + Settings + policy + audit | Membuka enterprise adoption |
| “Bagaimana peneliti berkolaborasi tanpa mengubah fakta?” | Evidence Community + peer review + dispute | Menciptakan knowledge network |

### 3.2 Kekuatan arsitektur produk

1. **Evidence-first semantics:** unavailable tidak diratakan menjadi zero atau
   safe; ini penting untuk penggunaan compliance dan due diligence.
2. **Temporal intelligence:** snapshot dan perubahan biasanya lebih bernilai
   daripada satu skor statis.
3. **Workflow continuity:** dari scan ke alert, case, report, API, dan audit
   tanpa export/import manual sebagai sumber kebenaran.
4. **Provider-agnostic boundary:** provider dapat diganti tanpa mengubah core
   scoring contract.
5. **Tenant and role boundary:** dapat berkembang dari individual researcher ke
   team dan enterprise.
6. **Settings sebagai control plane:** preference, security, notification,
   API, sharing, retention, dan billing memakai policy yang konsisten.
7. **Auditability:** keputusan dapat dikaitkan ke snapshot, evidence hash,
   actor, policy version, dan timestamp.

### 3.3 Kelemahan struktural yang tetap ada

- Provider coverage dan kualitas evidence akan bervariasi per chain.
- Risk scoring dapat dipersepsikan sebagai rating walau sebenarnya memiliki
  range dan uncertainty.
- Produk cukup kompleks bagi pengguna retail yang hanya ingin jawaban cepat.
- Community dapat menjadi liability jika opini, inference, atau dispute dibaca
  sebagai fakta.
- Menawarkan scan, monitoring, cases, reports, API, billing, dan community
  sekaligus dapat mengaburkan wedge penjualan.
- Trust tidak cukup dibuktikan dengan fitur; diperlukan historical accuracy,
  incident response, customer reference, dan metodologi yang dapat diaudit.

## 4. Competitive landscape

### 4.1 Competitive alternatives

Alternatif yang sebenarnya dipertimbangkan buyer:

1. **Do nothing:** hanya mengandalkan reputasi, social signal, atau intuisi.
2. **Spreadsheet/manual workflow:** murah, fleksibel, tetapi tidak reproducible.
3. **Raw data/API providers:** banyak data, tetapi consumer membangun logic dan
   audit workflow sendiri.
4. **Token scanners:** cepat untuk initial detection, biasanya lebih sempit.
5. **Enterprise blockchain intelligence:** kuat untuk investigation/compliance,
   lebih berat dan mahal untuk tim crypto-native.
6. **Internal build:** kontrol penuh, tetapi mahal dalam provider, maintenance,
   security, dan evidence governance.

### 4.2 Competitor dossiers

#### GoPlus Security — direct data/API alternative

- **Positioning publik:** open Web3 security data API untuk developer dan user.
- **Public capabilities:** Token Security API, malicious address, NFT security,
  approval security, dApp security, signature decoding, phishing detection,
  dan Solana-related security capabilities.
- **Strength:** breadth, API orientation, speed, dan distribution sebagai
  security data layer.
- **Weakness relatif terhadap JOBEN:** buyer masih perlu membangun timeline,
  case/review, immutable report, governance, evidence conflict handling, dan
  uncertainty-safe decision workflow.
- **Threat level:** tinggi pada data/API layer; sedang pada workflow layer.
- **Confidence:** tinggi untuk capability; medium untuk buyer experience.

#### Token Sniffer / Solidus Labs — direct scanner alternative

- **Positioning publik:** automated scam detection, contract auditing, dan risk
  analysis; public site menyebut monitoring jutaan token/scam dan API.
- **Public pricing signal:** public API page menampilkan Pro dan Enterprise
  package; enterprise pricing custom.
- **Strength:** recognizable scam-focused surface, fast token screening, simple
  user mental model, established distribution.
- **Weakness relatif terhadap JOBEN:** scanner-centric; lebih sedikit surface
  yang terlihat untuk longitudinal evidence, case governance, uncertainty
  contract, workspace review, dan cross-module audit.
- **Threat level:** tinggi untuk top-of-funnel token scan; rendah-menengah untuk
  decision-grade investigation.
- **Confidence:** tinggi pada public capabilities/pricing signal.

#### CertiK Skynet — direct/adjacent intelligence alternative

- **Positioning publik:** Web3 security, due diligence, dan insights.
- **Public capabilities:** token scan, security signals, project discovery,
  leaderboard/insight surface, dan multi-chain coverage.
- **Strength:** brand trust, broad ecosystem visibility, security research,
  accessible discovery.
- **Weakness relatif terhadap JOBEN:** JOBEN dapat menang pada neutral evidence
  lineage, explicit uncertainty, tenant governance, customizable workflow,
  monitoring-to-case path, dan API evidence contract.
- **Threat level:** tinggi untuk brand dan discovery; medium-high untuk
  enterprise workflow.
- **Confidence:** tinggi pada positioning; medium pada comparative workflow.

#### Blockaid — adjacent transaction/security alternative

- **Positioning publik:** real-time Web3 security untuk wallet, dApp, dan
  transaction protection.
- **Strength:** prevention at transaction boundary, simulation, user protection,
  integration into wallets/products.
- **Weakness relatif terhadap JOBEN:** fokus utama transaction/user protection,
  bukan longitudinal contract due diligence, team case review, public report
  lineage, atau evidence community.
- **Threat level:** medium as direct competitor; high as potential integration
  or category substitute.

#### Chainalysis — enterprise investigation/compliance alternative

- **Positioning publik:** blockchain analytics untuk tracing activity,
  investigation, compliance, dan crime/asset work.
- **Strength:** enterprise trust, data/network intelligence, government and
  compliance workflows, institutional distribution.
- **Weakness relatif terhadap JOBEN:** heavier enterprise motion, potentially
  higher cost/complexity, less focused on fast contract-level forensic workspace
  for crypto-native teams.
- **Threat level:** high for enterprise budget and credibility; low as identical
  product.

#### TRM Labs — enterprise compliance/investigation alternative

- **Positioning publik:** blockchain intelligence untuk crime detection,
  compliance, safety, and investigations.
- **Strength:** investigation and compliance depth, institutional buyer fit.
- **Weakness relatif terhadap JOBEN:** likely broader and enterprise-heavy;
  opportunity remains in contract-specific, evidence-first, self-serve,
  explainable workflow.
- **Threat level:** high for enterprise accounts; low-medium for initial wedge.

#### Build internally / spreadsheets — permanent indirect competitor

- **Strength:** familiar, perceived cheap, customizable, no vendor dependency.
- **Weakness:** inconsistent evidence, no durable provenance, manual updates,
  weak access control, poor monitoring reliability, and high hidden maintenance.
- **Threat level:** high in early sales because “we can build it” delays purchase.

### 4.3 Feature comparison matrix

Scoring: `5 = strong public/assumed fit`, `3 = partial or likely`, `1 = weak/
not core`. JOBEN column is conditional on the completed-roadmap assumption.

| Buyer capability | JOBEN | GoPlus | Token Sniffer | CertiK | Blockaid | Chainalysis/TRM | DIY |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fast contract/token signal | 4 | 5 | 5 | 4 | 3 | 3 | 2 |
| Multi-provider evidence | 5 | 3 | 2 | 3 | 2 | 4 | 2 |
| Explicit uncertainty/conflict | 5 | 2 | 2 | 3 | 3 | 3 | 1 |
| Longitudinal Passport/timeline | 5 | 2 | 2 | 3 | 2 | 4 | 2 |
| Change monitoring and alert operations | 5 | 3 | 2 | 3 | 2 | 4 | 2 |
| Case/review/approval governance | 5 | 1 | 1 | 2 | 1 | 4 | 2 |
| Immutable report/revision lineage | 5 | 2 | 1 | 2 | 1 | 4 | 1 |
| Secure evidence API/SDK | 5 | 5 | 3 | 3 | 4 | 4 | 2 |
| Workspace roles/tenant isolation | 5 | 3 | 2 | 3 | 4 | 5 | 2 |
| Community/peer review | 4 | 1 | 2 | 2 | 1 | 1 | 1 |
| Provider/network extensibility | 5 | 4 | 2 | 3 | 3 | 4 | 3 |
| Self-serve accessibility | 4 | 5 | 5 | 4 | 3 | 2 | 4 |
| **Decision-grade combination** | **5** | **3** | **2** | **3** | **2** | **4** | **1** |

Matrix ini bukan klaim bahwa competitor tidak memiliki capability tertentu;
matrix menunjukkan positioning dan product surface yang terlihat secara publik.

### 4.4 Positioning yang disarankan

> Untuk tim crypto, risk, compliance, dan research yang perlu menjelaskan
> keputusan kontrak secara dapat diaudit, JOBEN NETWORK adalah evidence-based
> contract intelligence workspace yang mengubah provider signals menjadi
> timeline, monitoring, case, report, dan API yang mempertahankan uncertainty.
> Berbeda dari token scanner atau raw analytics API, JOBEN menjaga hubungan
> antara evidence, perubahan, keputusan, dan siapa yang bertanggung jawab.

**Kategori yang dimenangkan:** decision-grade contract intelligence.  
**Kategori yang sebaiknya tidak dikejar sebagai headline:** “best token scanner”
atau “AI says safe”.

## 5. Business potential

### 5.1 Customer segments dan wedge

| Segment | Pain | Product wedge | Willingness-to-pay |
|---|---|---|---|
| Token launch/listing teams | rapid screening dan evidence pack | Scan + Report + API | Medium-high |
| Crypto funds/treasury | repeated diligence, watchlist | Passport + Watchtower + Case | High |
| Exchanges/marketplaces | listing/compliance proof | Policy + approval + audit + API | High |
| Security researchers | reproducible research/collaboration | Community + Passport + API | Low-medium, strong distribution |
| Web3 wallets/dApps | embedded contract risk signal | API + signed bundle + low latency | High |
| Compliance/investigation firms | defensible evidence and case handoff | Case + report + API + governance | High |
| Protocol teams | monitor own contract/proxy/privilege change | Watchtower + alerts | Medium |
| Retail users | one-off scam check | free scan | Low; acquisition only |

**Wedge prioritas:** funds, exchanges, listing desks, security/compliance
providers, dan wallets/dApps. Retail free scan berguna sebagai distribution
surface, bukan core revenue assumption.

### 5.2 Revenue architecture

1. **Free/Explorer:** limited scan, public-safe education, no sensitive
   workspace capability.
2. **Pro Researcher:** Passport, Compare, watchlist, reports, limited API.
3. **Team:** seats, Case, governance, collaboration, retention, notifications,
   workspace policy.
4. **Enterprise:** SSO/SCIM boundary, custom retention, SLA, private deployment
   or controlled data boundary, advanced API quota, audit export, support.
5. **Usage/API:** metered scans, evidence bundles, signed reports, webhook
   deliveries, with quota reservation and transparent usage.
6. **Services/assurance:** onboarding, methodology review, policy mapping, and
   incident support; services should not replace product recurring revenue.

### 5.3 Business scorecard

| Factor | Score | Why |
|---|---:|---|
| Pain frequency | 4/5 | Contract risk and monitoring recur in listings, funds, and incidents |
| Budget availability | 4/5 | Compliance/security budgets exist, but vendor proof is required |
| Expansion revenue | 5/5 | User → team → API → enterprise governance path |
| Gross margin potential | 4/5 | Software/API strong; provider and RPC costs can pressure margin |
| Sales cycle | 2.5/5 | Trust, security review, procurement, and legal increase cycle |
| Churn risk | 3/5 | Crypto cycles and event-driven usage can cause pauses |
| Network effects | 3.5/5 | Evidence contributions help, but moderation and privacy are hard |
| Distribution | 3/5 | Public scanner can attract users; enterprise references take time |
| Liability-adjusted value | 3.5/5 | High value if semantics and disclaimers are respected |

### 5.4 Unit economics that must be proven

Jangan mengunci pricing hanya dari jumlah scan. Telemetry minimum:

- cost per live scan by network/provider;
- cost per Watchtower target/hour and notification delivery;
- API bundle/signature cost and quota utilization;
- workspace activation: first scan → second scan → watchlist → report/case;
- conversion by persona, not aggregate;
- time-to-value and report reuse;
- gross margin after provider, RPC, queue, storage, email, and support;
- false-positive/false-confidence incident cost;
- retention by market cycle and customer segment;
- expansion from researcher to team/API.

## 6. Risk analysis

### 6.1 Risk register

| Risk | Probability | Impact | Exposure | Mitigation |
|---|---:|---:|---:|---|
| User treats score as investment advice | High | Very high | Critical | evidence-first language, ranges, disclosures, no safe enum, UX review |
| False negative or stale evidence | Medium-high | Very high | Critical | freshness, coverage, provider conflict, degraded mode, incident response |
| Provider outage/contract change | High | High | High | adapter registry, contract tests, fallback only when explicit, capability status |
| Chain/network proliferation | High | High | High | capability discovery, add networks by evidence quality not marketing list |
| API key/webhook compromise | Medium | Very high | High | hash-only keys, one-time reveal, rotation, revoke-all, SSRF/replay controls |
| Cross-tenant data leakage | Low probability | Catastrophic | Critical | server-side scope, negative authorization tests, opaque IDs, audit |
| Community misinformation/collusion | Medium | High | High | evidence refs, peer review, moderation, dispute, reputation anti-sybil |
| Report misinterpretation | Medium | High | High | immutable snapshot, age/status, redaction, revision and verification capsule |
| Billing/entitlement failure | Medium | Medium-high | Medium-high | provider webhook reconciliation, impact preview, no fake success |
| Regulatory reclassification | Medium | Very high | High | no custody/trading/advice, counsel review, jurisdiction feature flags |
| Crypto market cycle | High | High | High | compliance/investigation use cases beyond speculation |
| Competitor bundling/free commoditization | High | High | High | own workflow/provenance/audit data moat, not raw scan price war |
| Operational scale failure | Medium | High | High | durable queue, RPO/RTO, SLO, load/recovery drills |
| Security claim creates legal exposure | Medium | Very high | High | methodology transparency, evidence provenance, careful claim taxonomy |
| Product overbreadth | High | Medium-high | High | one wedge, gated roadmap, module adoption metrics |

### 6.2 Most dangerous assumption

Asumsi paling berbahaya adalah: **kelengkapan fitur otomatis menghasilkan trust
dan willingness-to-pay**. Dalam category ini buyer membeli:

- pengurangan risiko yang dapat dijelaskan;
- reliability ketika provider gagal;
- defensibility saat keputusan dipertanyakan;
- integrasi yang tidak merusak operasi;
- response ketika terjadi incident.

Karena itu, customer reference, incident transparency, reproducible reports,
dan measured false-confidence rate lebih penting daripada menambah dashboard
baru.

### 6.3 Liability boundary

JOBEN harus secara konsisten memosisikan output sebagai:

- evidence and risk intelligence;
- decision support;
- status-aware, time-bound analysis;
- bukan audit formal kecuali scope dan qualified process memang mendukung;
- bukan legal opinion;
- bukan financial recommendation;
- bukan jaminan keamanan.

## 7. Ten-year resilience assessment

### 7.1 Perubahan yang hampir pasti terjadi

Dalam 10 tahun, kemungkinan besar terjadi:

1. chain, rollup, VM, token standard, bridge, dan account abstraction berubah;
2. provider API, pricing, rate limits, dan quality berubah;
3. AI-generated attacks dan autonomous agents meningkatkan volume dan kecepatan;
4. compliance rules dan evidentiary expectations berubah per jurisdiction;
5. security detection dasar menjadi commodity/free;
6. wallet/dApp prevention pindah lebih dekat ke transaction execution;
7. enterprise buyer meminta stronger identity, residency, SSO, retention, dan
   contractual SLA;
8. cryptography/signature standards dan verification expectations berevolusi;
9. macro crypto cycles tetap menghasilkan demand spikes dan troughs;
10. buyers meminta machine-verifiable evidence, bukan dashboard screenshot.

### 7.2 Resilience by layer

| Layer | Resilience | Penilaian 10 tahun |
|---|---:|---|
| Core evidence schema | 4/5 | Tahan jika versioned dan tidak mencampur source dengan interpretation |
| Provider adapters | 4/5 | Tahan jika capability-driven dan contract-tested |
| Risk scoring | 3/5 | Perlu versioning, calibration, model governance, dan avoid score fetish |
| Passport/timeline | 5/5 | Historical change tetap bernilai meski provider berganti |
| Watchtower | 4.5/5 | Strong recurring use case; perlu noise control dan durable operations |
| Case/governance | 5/5 | Enterprise switching cost dan audit value kuat |
| Reports/API | 4.5/5 | Machine/verifiable output dapat menjadi durable boundary |
| Community | 3.5/5 | Network effect potensial, tetapi moderation/sybil/privacy berat |
| Billing | 3.5/5 | Dapat mengikuti capability/usage, bergantung provider dan market |
| Settings control plane | 4.5/5 | Mengurangi breaking change jika effective settings/versioning disiplin |
| Distribution/brand | 2.5/5 | Tidak otomatis tahan; harus dibangun lewat trust and references |

### 7.3 Scenario stress test

#### Scenario A — Detection becomes commodity

Scanner gratis memberikan token score seketika. JOBEN masih defensible jika
menjual snapshot lineage, material change, multi-provider conflict, case,
approval, audit, report verification, dan API contract—bukan “scan lebih akurat”
tanpa proof.

**Resilience:** 4/5.

#### Scenario B — Regulation demands accountable evidence

Exchange/fund perlu menunjukkan siapa meninjau apa, data kapan diambil,
limitations, reviewer independence, dan policy version. Ini adalah tailwind
terbesar untuk Case, Shared Reports, Settings governance, dan audit.

**Resilience:** 5/5 jika legal boundary dan data residency dipenuhi.

#### Scenario C — Major provider disappears

JOBEN kehilangan satu signal/provider. Sistem tetap usable jika output berubah
menjadi degraded/unknown, bukan fallback diam-diam; adapter registry dan
capability discovery mengurangi coupling.

**Resilience:** 4/5.

#### Scenario D — Autonomous agents become primary consumers

Agent membutuhkan API dengan idempotency, typed uncertainty, signed evidence,
quota, provenance, and replay protection. JOBEN dapat unggul jika membangun
agent-safe contract; UI saja tidak cukup.

**Resilience:** 4.5/5.

#### Scenario E — Long crypto winter

Retail volume jatuh, tetapi compliance, fraud, incident response, custody,
listing review, dan investigations tetap memiliki budget. Positioning harus
bergeser dari “crypto opportunity” ke “digital asset evidence operations”.

**Resilience:** 3.5/5.

#### Scenario F — Chain fragmentation accelerates

Coverage breadth menjadi mahal. JOBEN harus publish capability matrix dan
evidence quality per chain; lebih baik 20 chain dengan evidence jujur daripada
100 chain dengan silent gaps.

**Resilience:** 4/5.

#### Scenario G — Competitor bundles analytics + transaction protection

JOBEN tidak perlu meniru semua prevention. Integrasikan signal secara jelas,
tetap memiliki decision record, longitudinal evidence, governance, dan
cross-provider verification.

**Resilience:** 3.5/5.

### 7.4 Ten-year design rules

1. Version independently: evidence schema, provider adapter, scoring rubric,
   API, report, signature, policy, and settings schema.
2. Store provenance and capture time for every material claim.
3. Treat capability as discoverable runtime fact, not hardcoded marketing list.
4. Separate observed, inferred, verified, unavailable, conflict, and unknown.
5. Preserve immutable historical outputs; issue new revisions instead of mutating.
6. Make queue, notification, API, and export idempotent.
7. Keep business model portable across networks, providers, and crypto cycles.
8. Let AI organize evidence, never invent or authorize it.
9. Design for machine consumers and human reviewers simultaneously.
10. Invest in trust assets: methodology, incident reports, references, and
    verifiable output—not only UI velocity.

## 8. Strategic recommendations

### Recommendation 1 — Own the “decision-grade evidence” category

Lead with:

> “From contract signal to defensible decision.”

Avoid leading with a generic AI/security score. The category language should
make scanner competitors look like inputs and JOBEN like the system of record
for review.

### Recommendation 2 — Ship one commercial wedge first

Urutan paling rasional:

1. listing/due-diligence workspace;
2. Watchtower recurring monitoring;
3. immutable report and case governance;
4. API/SDK for embedded workflows;
5. enterprise controls and community expansion.

Jangan menjual semua modul ke semua persona sejak hari pertama.

### Recommendation 3 — Make evidence quality measurable

Publish internal and eventually customer-facing metrics:

- evidence coverage per network;
- freshness distribution;
- provider conflict rate;
- unknown/unavailable rate;
- false-confidence incident rate;
- alert precision and acknowledgement;
- report verification success;
- API reliability and latency.

Transparansi ini dapat menjadi moat karena competitor yang hanya menampilkan
score akan sulit dibandingkan secara objektif.

### Recommendation 4 — Productize Settings as trust infrastructure

Settings bukan backlog UI terakhir. Ia harus menjadi:

- policy compiler;
- security center;
- notification routing;
- API/share/billing control plane;
- retention and export authority;
- change impact simulator.

Ini meningkatkan enterprise confidence dan mengurangi breaking changes selama
sepuluh tahun.

### Recommendation 5 — Build integration partnerships, not provider dependence

Provider seperti GoPlus, RPC/indexer, notification, billing, dan identity
sebaiknya diperlakukan sebagai replaceable adapters. JOBEN harus memiliki:

- capability contract;
- provider health;
- provenance;
- conflict handling;
- cost/quality scorecard;
- migration path.

### Recommendation 6 — Establish trust proof before aggressive scale

Sebelum mengejar banyak chain atau fitur AI:

- lakukan independent security review;
- publish methodology and limitations;
- create customer-facing evidence verification;
- run outage/recovery drills;
- document incident response;
- obtain 3–5 reference workflows dari target segment;
- measure decision time and avoided manual work.

### Recommendation 7 — Use community as evidence network, not social network

Community hanya menjadi defensible jika setiap contribution memiliki evidence
reference, revision, peer review, dispute, moderation, dan provenance. Jangan
mengikuti likes, leaderboard popularitas, atau generic social feed.

## 9. Strategic score gates

### Gate G1 — Product truth

Target: **≥4.0/5**

- uncertainty semantics konsisten;
- evidence coverage/freshness terlihat;
- provider outage tidak menghasilkan fake confidence;
- report/API dapat diverifikasi.

### Gate G2 — Commercial proof

Target sebelum scale:

- minimal tiga persona membayar atau memberi signed design partnership;
- recurring use terlihat pada Watchtower/Case, bukan hanya one-off scan;
- buyer dapat menyebut keputusan yang menjadi lebih cepat/defensible;
- gross margin dipahami per provider/network.

### Gate G3 — Enterprise trust

- no cross-tenant incident;
- independent security assessment;
- documented RPO/RTO dan recovery drill;
- audit/export/deletion proof;
- role/approval/retention policy diterima oleh target buyer;
- legal and claims review untuk positioning.

### Gate G4 — Ten-year adaptability

- adapter/capability registry;
- independent version axes;
- migration/deprecation policy;
- signed immutable report lineage;
- agent-safe API;
- provider substitution drill;
- product does not require one chain, one provider, one billing vendor, or one
  scoring model to remain useful.

## 10. Final verdict

**JOBEN NETWORK layak dilanjutkan sebagai platform evidence intelligence
berorientasi decision-grade, dengan risk-adjusted opportunity yang menarik.**

Namun, nilai utamanya baru muncul jika:

1. roadmap benar-benar selesai sebagai sistem terintegrasi, bukan kumpulan
   halaman;
2. fokus komersial dimulai dari due diligence, monitoring, case, dan report;
3. evidence quality dan limitations menjadi bagian produk yang terlihat;
4. secure Settings menjadi control plane sebelum enterprise scale;
5. metrik trust dan unit economics dikumpulkan sebelum memperluas coverage;
6. positioning tidak terjebak perang harga dengan scanner gratis;
7. produk tetap bernilai saat market turun, provider berganti, dan chain
   berubah.

**Score akhir:** **3.8/5 — strong strategic potential, execution-sensitive.**

**Kalimat keputusan:** lanjutkan, tetapi ukur keberhasilan dari keputusan yang
lebih cepat, evidence yang lebih defensible, dan operasi yang lebih dapat diaudit
— bukan dari jumlah chain, jumlah fitur, atau jumlah scan semata.

## 11. Sources and evidence notes

Sumber publik yang digunakan untuk snapshot kompetitif dan market context:

1. GoPlus Security API — https://gopluslabs.io/en/security-api
2. GoPlus API overview — https://docs.gopluslabs.io/reference/api-overview
3. GoPlus Token Security API — https://gopluslabs.io/en/token-security-api
4. Token Sniffer — https://tokensniffer.com/
5. Token Sniffer API / pricing signal — https://www.soliduslabs.com/tokensniffer/api
6. CertiK Skynet — https://skynet.certik.com/
7. Chainalysis blockchain analytics glossary — https://www.chainalysis.com/glossary/blockchain-analytics/
8. TRM Labs forensics — https://www.trmlabs.com/blockchain-intelligence-platform/forensics
9. Web3 Security Market Report 2026 — https://www.researchandmarkets.com/reports/6231484/web3-security-market-report
10. Hacken State of Blockchain Security 2025 — https://hacken.io/insights/2025-security-report/

Catatan metodologi:

- Public homepage/API pages mendukung capability dan positioning, bukan
  independent proof of accuracy.
- Pricing enterprise, market share, headcount, retention, dan competitor
  internal roadmap tidak diasumsikan tanpa disclosure yang dapat diverifikasi.
- Feature matrix adalah strategic comparison dan harus diperbarui sebelum
  dipakai untuk sales collateral atau fundraising.