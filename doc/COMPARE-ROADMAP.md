# JOBEN NETWORK — Compare Core Module Roadmap

---

Version: 1.0  
Last updated: 2026-08-25  
Status: Draft for implementation planning  
Owner: Product + Core Intelligence  
Parent product: Risk Passport / Core Scan  
Primary surface: authenticated Compare workspace

---

## 1. Ringkasan eksekutif

Compare bukan tabel untuk melihat angka risk dua kontrak. Compare adalah **Comparative
Intelligence Kernel**: lapisan yang mengubah evidence dari beberapa kontrak,
snapshot, network, provider, dan waktu menjadi perbandingan yang:

- comparable hanya jika memang comparable;
- tetap memperlihatkan unknown, unavailable, unverified, dan conflict;
- dapat menjawab “mana yang berbeda dan mengapa?”;
- dapat direplay setelah engine, provider, atau schema berkembang;
- tidak mengunci produk pada daftar field atau network hari ini;
- berguna untuk consumer scan, Risk Passport, Watchtower, case review, listing,
  compliance, API, dan report.

**Ide inti:** setiap hasil Compare adalah **Evidence Matrix** dengan tiga lapisan:

1. **Observed:** fakta atau status evidence per subject.
2. **Compared:** delta, ranking, similarity, divergence, dan coverage dengan
   aturan comparability yang eksplisit.
3. **Interpreted:** penjelasan bounded yang menyebut confidence, limitation, dan
   tindakan review—tanpa menyimpulkan aman hanya dari ranking.

Compare harus menjadi core yang tahan 10 tahun karena field baru, network baru,
provider baru, scoring model baru, dan kebutuhan regulator tidak boleh memaksa
rewrite kontrak lama atau merusak report yang sudah diterbitkan.

## 2. Keputusan arsitektur

### 2.1 Compare berdiri sebagai capability, bukan fork produk

Compare disimpan sebagai roadmap/delivery surface mandiri, tetapi tidak menjadi
data silo:

- **Core Scan** memiliki evidence, provenance, finding, risk, reliability, dan
  schema version.
- **Risk Passport** memiliki identity, snapshot history, dan timeline.
- **Compare** membaca snapshot/references tersebut dan menghasilkan projection
  perbandingan.
- **Watchtower** dapat memakai Compare untuk before/after dan cohort baseline.
- **Case Workspace** memakai Compare untuk multi-contract review dan decision log.
- **Evidence API** mengekspos hasil Compare dengan versioned request/response.

Compare tidak menulis ulang evidence source dan tidak menyimpan salinan mutable
yang dapat menyimpang dari snapshot.

### 2.2 Stable kernel, extensible projections

Kernel yang harus stabil:

- subject identity;
- snapshot reference;
- evidence field identity;
- status semantics;
- comparability decision;
- provenance;
- confidence/reliability/freshness;
- deterministic ordering;
- explanation and limitation.

Projection yang boleh berkembang:

- table, cards, matrix, chart, ranking, cohort, report, API bundle, export;
- field packs per use case;
- localization;
- network/provider adapters;
- derived insights yang selalu berlabel dan versioned.

Dengan pemisahan ini, UI atau use case baru tidak mengubah kebenaran domain.

## 3. Baseline nyata saat ini

Kemampuan yang sudah tersedia:

- authenticated route `/dashboard/compare`;
- endpoint private `/api/compare`;
- workspace-scoped selection;
- batas request 2–5 contract;
- data source dari saved Risk Passport;
- latest snapshot per contract;
- output `found`, network, normalized address, risk, reliability score, finding
  count, evidence hash, dan captured time;
- UI checkbox selection, Add contract, Compare evidence, dan tabel hasil;
- visual baseline desktop/mobile;
- existing Core Scan distinction antara risk score, reliability score, evidence,
  dan unknown/unavailable semantics;
- Risk Passport snapshot/timeline sebagai sumber historical evidence.

Baseline ini masih **latest-summary comparison**. Ia belum mencakup:

- field-level Evidence Matrix;
- same-contract historical comparison melalui Compare;
- cross-network normalization dan capability coverage;
- provider disagreement/absence per subject;
- configurable field packs dan saved comparison;
- similarity/divergence explanation;
- evidence-linked ranking yang aman;
- compare run identity, schema, deterministic replay, dan export contract;
- loading, partial, stale, unavailable, and permission states yang lengkap;
- compare-to-case, compare-to-watchtower, atau API-grade projection.

## 4. Tujuan produk

### 4.1 User jobs

1. **When screening options**, I want to compare contracts without hiding missing
   evidence, so I can shortlist responsibly.
2. **When reviewing a known contract over time**, I want to compare snapshots,
   so I can see what changed and whether the change is evidence-backed.
3. **When comparing across networks**, I want normalized fields plus capability
   differences, so I do not mistake unavailable data for a better result.
4. **When preparing a decision**, I want every comparison cell to lead to source
   evidence, so the result can be reviewed and audited.
5. **When the platform evolves**, I want old comparisons and reports to remain
   interpretable, so schema/provider upgrades do not silently rewrite history.

### 4.2 Success outcomes

- reviewer understands key differences without opening every report;
- no comparison silently ranks a subject using missing data as zero;
- every material conclusion has an evidence path;
- a compare result can be reproduced from immutable inputs and version metadata;
- new fields/networks/providers can be added through registry/capability contracts;
- mobile users can complete a comparison and inspect the important evidence.

## 5. Non-goals

Compare v1 does not:

- declare a winner or “safest contract” without a named criterion and evidence
  coverage;
- replace professional due diligence, compliance review, or human approval;
- predict price, return, liquidity outcome, or investment performance;
- infer common ownership or malicious intent from similarity alone;
- merge provider data into a single value when sources conflict;
- compare unsupported network data by coercing different semantics;
- compare live mutable chain state without recording a snapshot;
- allow user-entered labels to override canonical subject identity;
- execute transactions, connect wallets, or perform automated remediation;
- use an LLM to calculate scores, severity, evidence state, or ranking;
- keep a hidden “legacy” comparison format with undocumented semantics.

## 6. Submodul Compare

| ID | Submodul | Fungsi core | Output wajib |
|---|---|---|---|
| C1 | Subject & Snapshot Selection | Memilih contract, network, passport, snapshot, dan time basis | Immutable selection manifest |
| C2 | Evidence Field Registry | Mendefinisikan field, unit, type, direction, version, dan capability | Stable field descriptors |
| C3 | Normalization & Comparability | Menyamakan representasi tanpa menghapus perbedaan semantik | Cell value + comparability reason |
| C4 | Evidence Matrix | Membentuk baris/kolom observed, status, source, freshness, confidence | Evidence-complete matrix |
| C5 | Delta & Trajectory Compare | Membandingkan snapshot lintas waktu | Before/after delta + trajectory |
| C6 | Cross-Subject Analysis | Membandingkan antar-contract, network, cohort, dan profile | Difference/similarity projection |
| C7 | Conflict & Coverage Lens | Menunjukkan provider conflict, coverage gap, dan data quality | Coverage/conflict map |
| C8 | Explainable Decision Views | Ranking bounded, filters, material differences, limitations | Explanation + criteria |
| C9 | Saved Comparison & Collaboration | Menyimpan manifest, notes, share/export, case link | Auditable saved compare |
| C10 | Compatibility & Evolution Layer | Versioning, migration, capability negotiation, replay | Forward/backward-compatible contract |
| C11 | Responsive Review UX | Desktop/mobile matrix, detail, loading, error, accessibility | Usable responsive workspace |
| C12 | API, Export & Observability | API projection, export, metrics, cost/latency/error telemetry | Stable external and ops contract |

## 7. Core domain contract

Nama field teknis dapat disesuaikan saat engineering scoping, tetapi semantik
berikut adalah invariant.

### 7.1 Comparison manifest

Setiap compare run harus memiliki:

- `comparisonId`;
- `workspaceId` dari server-side authorization;
- daftar `subjects[]` dengan canonical `networkId`, normalized address, display
  label, dan `subjectType`;
- `snapshotRefs[]` yang eksplisit: `snapshotId`, captured time, source job,
  engine version, evidence schema version;
- `fieldPackId` dan `fieldPackVersion`;
- `criteria` dan ordering policy;
- locale/presentation preferences terpisah dari domain values;
- `createdAt`, `createdBy`, request id;
- response/schema version;
- input evidence hashes atau immutable references;
- retention/privacy classification bila disimpan atau dibagikan.

Manifest tidak boleh berubah secara diam-diam setelah hasil diterbitkan. Perubahan
memerlukan compare run baru atau immutable revision.

### 7.2 Subject identity

Subject identity harus selalu memuat:

- network canonical ID;
- address format dan checksum/encoding valid sesuai network;
- contract/program kind bila tersedia;
- snapshot time;
- chain target validation result;
- status `FOUND`, `NOT_FOUND`, `UNAVAILABLE`, atau `INVALID`;
- capability profile network/provider.

Address string yang syntactically valid tetapi tidak memiliki deployed bytecode
atau tidak cocok dengan network tidak boleh dianggap subject valid.

### 7.3 Evidence cell

Setiap cell di Evidence Matrix minimal memiliki:

- `fieldId`, label key, data type, unit, direction;
- raw/reference value bila tersedia;
- display value;
- evidence status;
- comparability status;
- source/provider references;
- observedAt/capturedAt;
- confidence dan reliability bila relevan;
- freshness state;
- limitation/reason code;
- field definition version.

Status berikut berbeda dan harus dipertahankan:

`VERIFIED`, `UNVERIFIED`, `UNKNOWN`, `UNAVAILABLE`, `CONFLICT`,
`NOT_APPLICABLE`, `NOT_COMPARABLE`, `ERROR`.

### 7.4 Comparison result

Hasil Compare harus membedakan:

- **observed value:** nilai per subject;
- **absolute delta:** selisih untuk field numerik yang comparable;
- **relative delta:** hanya jika denominator dan policy mengizinkan;
- **ordinal relation:** higher/lower/equal/indeterminate;
- **material difference:** none/low/medium/high;
- **similarity:** hanya pada field pack dan method yang dinyatakan;
- **coverage:** available versus expected capability;
- **confidence:** kualitas kesimpulan, bukan pengganti evidence status;
- **limitation:** alasan ketika hasil tidak boleh disimpulkan.

`UNKNOWN` tidak sama dengan 0, empty, false, atau best/worst rank.

## 8. Field registry dan extensibility 10 tahun

### 8.1 Schema-driven field registry

Field tidak boleh di-hardcode hanya di UI atau fungsi compare. Registry harus
menyimpan:

- stable `fieldId` dan namespace;
- primitive type: number, percent, currency, count, boolean, address, enum,
  timestamp, structured, collection;
- unit and formatting rules;
- risk direction: higher-risk, lower-risk, changed, neutral;
- comparability method dan tolerance;
- applicable networks/capabilities/providers;
- evidence status policy;
- localization keys;
- data classification and export policy;
- introduced/deprecated/superseded version;
- migration/interpretation note;
- deterministic sort order.

Contoh namespace:

```text
core.risk.final_score
core.reliability.score
contract.owner
contract.proxy
trading.buy_tax
trading.sell_tax
market.liquidity_usd
holders.top10_concentration
evidence.provider_consensus
```

Nama ini adalah ilustrasi kontrak, bukan izin untuk mengunci registry pada daftar
tersebut.

### 8.2 Capability negotiation

Compare menentukan field set dari capability matrix:

```text
network capability
  -> provider capability
    -> evidence field availability
      -> comparable / not comparable decision
        -> view and explanation
```

Jika network A memiliki holder data dan network B tidak:

- cell B menunjukkan `UNAVAILABLE`;
- coverage row menjelaskan capability gap;
- comparison tidak memberi B nilai lebih baik/lebih buruk karena data hilang;
- user dapat filter “comparable only” tanpa kehilangan full evidence view.

### 8.3 Evolution policy

- menambah field tidak memecahkan consumer lama;
- menghapus field memakai deprecation period dan replacement mapping;
- mengubah arti field membuat field ID/schema version baru;
- mengubah scoring/risk semantics tidak mengedit snapshot lama;
- old compare result tetap dibaca dengan registry version asal;
- replay lintas version harus menampilkan apakah hasil exact atau migrated;
- provider baru masuk lewat adapter/registry, bukan conditional UI baru;
- network baru harus melewati address validation, bytecode/target validation,
  capability, rate policy, dan fixtures.

## 9. UX modes dan full feature scope

### Mode A — Latest Evidence Compare

Default untuk memilih 2–5 saved passports dan membandingkan current snapshot.

Fitur:

- select subject dengan search, network filter, label, freshness;
- field pack: Executive, Security, Market, Holders, Contract Control,
  Compliance-ready;
- full matrix dengan observed/status/source;
- compact summary hanya sebagai entry point;
- no-winner default;
- optional named criterion dengan formula dan limitation;
- sort by material difference, not raw score only;
- click cell membuka source evidence/snapshot.

### Mode B — Historical Snapshot Compare

Memilih dua snapshot dari satu atau beberapa passport:

- “then vs now”;
- selected dates dan latest;
- delta absolut/relatif;
- changed/unchanged/not comparable filter;
- trajectory context;
- change explanation yang sama dengan Watchtower;
- link ke alert/timeline/case bila tersedia.

### Mode C — Cross-Network Compare

- normalized common fields;
- network-specific fields di capability section;
- chain identity dan captured time selalu visible;
- warning ketika time windows tidak sebanding;
- tidak mencampurkan native units atau address semantics;
- cross-network similarity diberi label `INFERRED` bila bukan direct observation.

### Mode D — Evidence Coverage Compare

Menjawab bukan “mana paling baik”, tetapi:

- siapa memiliki evidence paling lengkap;
- field mana yang missing per subject;
- provider conflict per subject;
- stale/blocked provider;
- confidence distribution;
- coverage-adjusted view yang tetap tidak mengubah risk score.

### Mode E — Cohort Compare

Fase lanjut untuk membandingkan banyak subject berdasarkan:

- user-selected cohort;
- network, tag, use case, policy, atau case membership;
- aggregate median/range/distribution;
- minimum cohort size dan privacy thresholds;
- outlier explanations;
- tidak mengungkap data tenant lain tanpa authorization.

### Mode F — Decision Pack

Menyusun selected comparison menjadi:

- executive summary;
- evidence matrix;
- limitations and coverage;
- criteria and method;
- source references;
- snapshot timestamps;
- reviewer notes;
- generated-at and version metadata;
- export/share policy.

Decision Pack bukan rekomendasi finansial dan tidak boleh menghilangkan unknown.

## 10. Prioritas delivery

Roadmap memakai `Now / Next / Later`. Estimasi mencakup product, design,
engineering, QA, security, localization, dan operations.

### NOW — C0: Compare contract and trust boundary

**Outcome:** Compare memiliki sumber kebenaran dan aturan yang dapat diaudit.

Scope:

- manifest, subject identity, snapshot refs, Evidence Cell, Result contract;
- status taxonomy dan comparability reasons;
- field registry minimum untuk current Core Scan output;
- no-zero/no-hidden-missing rules;
- deterministic ordering, locale-independent values;
- permission, retention, and export boundary;
- compatibility policy dan error contract.

Acceptance:

- compare response selalu menyatakan input snapshots dan schema versions;
- subject invalid/not found/unavailable tidak berubah menjadi empty success;
- missing data tampil explicit dan tidak ikut ranking sebagai nilai 0;
- hasil yang sama dari input/version yang sama identik diulang;
- setiap derived relation memiliki criteria/method/version.

Estimasi: **M (2–4 minggu)**.  
Gate: Core Intelligence + Security + Product sign-off.

### NOW — C1: Evidence Matrix v1

**Outcome:** user dapat membandingkan evidence nyata, bukan hanya summary score.

Scope:

- latest saved snapshots;
- Executive, Security, Market, Holders, Contract Control field packs;
- observed value/status/source/freshness/confidence;
- comparable-only dan all-evidence view;
- field-level details dan evidence deep link;
- summary cards yang tidak menyembunyikan coverage;
- API projection yang backward-compatible dengan existing summary.

Acceptance:

- user memilih 2–5 passport dan melihat matrix field-level;
- dua nilai numerik comparable menunjukkan delta dan unit;
- different/missing status menunjukkan reason;
- click/keyboard pada cell membuka provenance/snapshot detail;
- summary tidak menyatakan winner jika criteria tidak dipilih;
- desktop dan mobile bisa membaca identity, material differences, dan limitation.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: C0, Risk Passport current snapshot contract.

### NEXT — C2: Historical and trajectory compare

**Outcome:** Compare menjelaskan perubahan sepanjang waktu, bukan hanya kondisi
terakhir.

Scope:

- snapshot picker per subject;
- same-contract and multi-subject time alignment;
- absolute/relative delta with denominator policy;
- trajectory and elapsed time;
- changed/unchanged/not comparable classification;
- connect to Watchtower pulse/timeline;
- replay metadata and historical schema rendering.

Acceptance:

- selected before/after snapshots render correctly even if current snapshot
  sudah berubah;
- timestamp, engine version, schema version, and evidence hash visible;
- unknown before/after menghasilkan `NOT_COMPARABLE`, bukan guessed delta;
- one alert and one timeline can open the same compare context;
- replay old snapshot does not mutate Passport or alert history.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: C0–C1, Risk Passport timeline, Watchtower evidence semantics.

### NEXT — C3: Cross-network and provider-aware comparison

**Outcome:** Compare tetap jujur ketika subject berasal dari chain/provider dengan
capability berbeda.

Scope:

- capability matrix and field applicability;
- common versus network-specific field groups;
- provider conflict/coverage lens;
- chain target validation;
- time-window comparability;
- native unit/address normalization;
- provider outage/stale state presentation;
- multi-network fixtures and contract tests.

Acceptance:

- unsupported field tampil `NOT_APPLICABLE` atau `UNAVAILABLE` dengan explanation;
- provider conflict tidak diratakan menjadi consensus palsu;
- network mismatch atau no-bytecode target ditolak/ditandai sesuai contract;
- common field hanya dibandingkan jika semantic/unit/time policy lulus;
- new network can be added through registry/capability path without changing
  core comparison algorithm.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: provider registry, chain target validation, C0–C1.

### NEXT — C4: Criteria, explainable ranking, and decision pack

**Outcome:** reviewer dapat menggunakan Compare untuk keputusan terstruktur tanpa
mengubahnya menjadi black-box recommendation.

Scope:

- named criteria: risk, reliability, coverage, liquidity, control, custom;
- transparent weights and exclusion rules;
- minimum evidence coverage requirement;
- tie/indeterminate handling;
- material difference summary;
- reviewer note, rationale, and limitation;
- export PDF/JSON/CSV sesuai policy;
- case handoff and audit record.

Acceptance:

- ranking menampilkan formula, field inclusion, excluded cells, and coverage;
- insufficient coverage menghasilkan indeterminate, bukan false winner;
- changing criteria creates a new immutable compare revision;
- exported decision pack contains sources, timestamps, and schema versions;
- case link preserves manifest and evidence references;
- AI, if later used for prose, cannot alter numeric/semantic result.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: C1–C3, Case Workspace and report contract.

### LATER — C5: Saved comparisons and collaboration

Directional until C0–C4 are trusted:

- saved comparison collections;
- scheduled re-run triggered by Watchtower;
- reviewer assignments and comments;
- compare version diff;
- share links with expiry and revocation;
- organization templates and policy-specific field packs;
- compare-to-alert and compare-to-case workflows.

### LATER — C6: Cohort and adaptive intelligence

Directional, not a v1 commitment:

- cohort distributions and benchmark ranges;
- outlier detection with evidence paths;
- deployer/funding/behavior graph overlays;
- network-aware baseline;
- similarity search with observed/inferred/verified labels;
- counterfactual “what field would change the result?”;
- cost-aware field selection based on provider latency and data value.

Tidak boleh mengklaim common ownership, malicious intent, atau safety hanya dari
similarity/cohort position.

## 11. Responsive UX blueprint

### 11.1 Desktop

Layout:

1. **Selection rail**
   - subject search and saved passport selection;
   - snapshot/time picker;
   - field pack and criteria;
   - network/capability filters.
2. **Comparison header**
   - one column per subject;
   - network, address, captured time, freshness, snapshot status;
   - clear `LIVE`, `DEMO`, `STALE`, `UNAVAILABLE` labels.
3. **Evidence Matrix**
   - sticky first column for field names;
   - grouped sections;
   - observed row, status row, source row, delta row;
   - conflict/coverage indicators;
   - no color-only semantics.
4. **Difference rail**
   - material differences;
   - coverage gaps;
   - indeterminate explanations;
   - criteria/ranking method.
5. **Actions**
   - open Passport/timeline;
   - open Watchtower pulse;
   - create/link case;
   - export/share subject to permissions.

### 11.2 Mobile

Mobile is a review flow, not a squeezed desktop table:

- selection becomes stepper: Subjects → Snapshots → Fields → Review;
- subject columns become swipeable cards with a persistent selected subject
  indicator;
- each field becomes a stacked row: field label → values → status → delta;
- “differences only” is available without hiding a clear path to full evidence;
- evidence detail opens as a bottom sheet with provenance and limitations;
- sticky footer exposes Compare, Filter, and Next action;
- filters use a sheet with active filter count and reset;
- no essential information relies on hover or horizontal scroll;
- minimum touch target 44px;
- long addresses truncate with copy and accessible full label;
- table/card transitions preserve keyboard focus and screen-reader order;
- responsive states include loading, partial, empty, stale, unavailable, error,
  permission denied, and too-many-subjects.

Priority order at every viewport:

**subject identity → evidence status → material difference → provenance →
limitation → next action**.

### 11.3 Accessibility and localization

- English and Bahasa Indonesia shipped together;
- all copy via locale keys;
- status values remain stable language-neutral enums;
- color paired with text/icon/shape;
- table headers and row groups have semantic relationships;
- keyboard navigation works across selection, matrix, detail, and export;
- screen readers receive before/after and status in logical order;
- formatting follows locale for date, number, currency, percent, and timezone;
- Indonesian risk/evidence wording gets native-language review.

## 12. Security and data integrity

### Authorization and privacy

- all subject and snapshot reads are workspace-scoped server-side;
- compare manifest cannot elevate access by submitting another workspace ID;
- saved comparisons inherit the least-permissive subject/snapshot visibility;
- share/export has explicit expiry, revocation, and redaction policy;
- cross-tenant cohort or benchmark data requires an approved aggregate boundary;
- logs contain IDs and status, not secrets or private evidence payloads.

### Integrity

- compare references immutable snapshot IDs and evidence hashes;
- live re-fetch is a new run, never a mutation of an old result;
- schema/provider version is shown in result and export;
- stale/unavailable evidence remains explicit;
- no score normalization may erase risk/reliability distinction;
- no provider conflict may be resolved by arbitrary precedence without policy;
- compare revision and criteria changes are append-only/auditable.

### Abuse and resilience

- bound subject count, field pack size, date range, and export size;
- rate-limit expensive compare/replay/cohort operations;
- cache only by complete tenant-safe manifest/version key;
- prevent cache poisoning across workspace, locale, and schema version;
- timeouts and partial-result policy for slow providers;
- deterministic degraded mode when optional provider data is unavailable.

## 13. Compatibility strategy for the next 10 years

### 13.1 Version axes

Compare must version independently on:

1. **Evidence schema:** shape/semantics of source evidence.
2. **Field registry:** definitions, units, applicability, deprecation.
3. **Comparison algorithm:** delta, materiality, similarity, ranking.
4. **Presentation/API schema:** response and export shape.
5. **Provider capability:** source availability and quality.
6. **Network registry:** canonical network and target validation.

Changing one axis must not silently imply changes to all others.

### 13.2 Read old, write new

- new code reads supported old versions through adapters;
- new results use current version;
- old published results remain renderable from their recorded manifest;
- migrations are explicit and observable;
- no destructive backfill overwrites evidence;
- deprecation includes telemetry, documentation, and consumer notice;
- unsupported versions return structured `SCHEMA_UNSUPPORTED` with migration
  guidance, not an empty matrix.

### 13.3 Plugin and registry boundary

Future provider/network/field additions should implement contracts:

- `capabilities()`;
- `normalize(context, value)`;
- `evidenceStatus(context, value)`;
- `compare(definition, left, right)`;
- `explain(definition, result, locale)`;
- `version()` and deprecation metadata.

The core should orchestrate these contracts, not contain a growing chain of
provider-specific conditionals.

### 13.4 Deterministic and auditable algorithm

Every result records:

- algorithm ID/version;
- field pack ID/version;
- criteria and weight version;
- input snapshot IDs/evidence hashes;
- provider/network capability state;
- generated timestamp;
- locale/presentation version where relevant.

If exact replay is impossible due to an external provider change, the system
must say so and distinguish **historical replay** from **fresh recomputation**.

## 14. Quality strategy and acceptance criteria

### 14.1 Test layers

1. **Domain tests:** status semantics, comparability, units, tolerance, delta,
   ranking, tie, coverage, conflict, unknown handling.
2. **Property tests:** permutation of subject order does not change subject-level
   result; repeated same manifest is deterministic; missing data never improves
   rank; locale does not change domain result.
3. **Contract tests:** field registry, provider capability, network validation,
   old/new schema adapters, API response versions.
4. **Authorization tests:** cross-workspace subject/snapshot, saved compare,
   share/export, role limitations.
5. **Performance tests:** 2–5 current subjects first; historical and field-pack
   expansion; bounded large/cohort path later.
6. **Browser tests:** desktop/mobile flows plus keyboard, focus, error, empty,
   partial, stale, conflict, and permission states.
7. **Replay fixtures:** provider unavailable, malformed, conflicting, schema
   upgrade, network capability change, clock/timezone change.

### 14.2 Gherkin acceptance scenarios

#### Comparable numeric fields

```text
Given two subjects have comparable liquidity evidence in the same unit
When the user opens an Evidence Matrix comparison
Then each subject value is shown with its source and captured time
And the delta includes direction, unit, and comparability status
And no risk conclusion is shown unless a named criterion includes that field
```

#### Missing evidence

```text
Given subject A has holder evidence and subject B has unavailable holder evidence
When the user compares the subjects
Then subject B shows UNAVAILABLE with a capability/reason reason
And the missing value is not converted to zero
And the comparison does not rank subject B higher because of the missing value
```

#### Provider conflict

```text
Given two providers report conflicting values for a field
When the comparison is generated
Then the cell shows CONFLICT and retains both provenance references
And the result does not silently choose one provider
And the limitation is visible in the summary and export
```

#### Historical replay

```text
Given a saved comparison references two immutable snapshots
When a newer snapshot is recorded for one subject
Then reopening the saved comparison renders the original snapshots
And the original evidence hashes and schema versions remain visible
And a fresh comparison is a separate revision
```

#### Cross-network capability gap

```text
Given two contracts are on networks with different supported capabilities
When the user selects a common field pack
Then common fields are compared only where semantic and unit rules pass
And network-specific fields appear in a capability section
And unsupported data is labeled NOT_APPLICABLE or UNAVAILABLE
```

#### Invalid target

```text
Given an address has valid syntax but no deployed bytecode on the selected chain
When the user attempts to add it to Compare
Then the subject is rejected or explicitly marked INVALID_TARGET
And it cannot be treated as a valid low-risk comparison subject
```

#### Criteria and indeterminate result

```text
Given the user selects a ranking criterion requiring minimum evidence coverage
When one subject fails that coverage threshold
Then the result is INDETERMINATE for the ranking
And the excluded fields and coverage reason are shown
And the raw evidence matrix remains available for review
```

#### Tenant isolation

```text
Given a user submits a snapshot or passport identifier from another workspace
When the comparison request is processed
Then the foreign resource is not revealed
And the response follows the standard not-found/forbidden contract
And no foreign resource enters the comparison manifest
```

#### Responsive review

```text
Given a reviewer opens Compare on a mobile viewport
When they select subjects and inspect material differences
Then identity, status, difference, provenance, and limitation are readable without horizontal table scrolling
And the reviewer can open Passport or case actions with touch and keyboard-compatible controls
```

## 15. Release gates

### Gate A — Trustable Evidence Matrix

- field-level observed/status/source view;
- no zero/empty coercion for missing evidence;
- comparable/not-comparable reasons;
- deterministic result and stable manifest;
- English/Indonesian and accessibility baseline.

### Gate B — Historical and Cross-Network Correctness

- immutable snapshot selection and replay;
- capability matrix;
- provider conflict preservation;
- chain target validation;
- schema/field/network versioning;
- fixtures for unavailable, stale, conflict, and schema upgrade.

### Gate C — Decision-Grade Compare

- transparent criteria and ranking;
- indeterminate/insufficient coverage behavior;
- case handoff and immutable revision;
- export contains evidence references, limitations, and versions;
- role/share/export authorization.

### Gate D — Ten-Year Adaptability

- adding a field does not require core algorithm rewrite;
- adding provider/network follows registry contract;
- old result remains renderable;
- unsupported schema returns explicit migration error;
- replay/fresh recomputation distinction is visible;
- load, cost, cache, outage, backup, and recovery runbooks exist.

## 16. Success metrics

### Trust and correctness

- percentage of comparison cells with status and provenance;
- percentage of derived deltas with valid comparability reason;
- missing-data-as-zero incidents;
- provider-conflict suppression incidents;
- deterministic replay match rate;
- stale/unknown preservation rate;
- invalid-target rejection rate.

### Usability

- time to identify a material difference;
- compare completion rate;
- evidence-detail open rate;
- percentage of users who can explain the result in review testing;
- mobile completion rate;
- keyboard/accessibility task completion;
- export-to-case conversion.

### Reliability and scale

- p50/p95 compare latency per field pack;
- partial-result and provider-timeout rate;
- cache hit rate with zero cross-tenant leakage;
- error rate by schema/provider/network;
- export success and retry rate;
- cost per comparison;
- percentage of old saved comparisons rendered without manual repair.

Numeric SLOs should be set after baseline telemetry exists. Do not invent
targets without observed reach, latency, cost, or review data.

## 17. Dependency map

```text
Core Scan
  -> canonical evidence + statuses + provenance
    -> Risk Passport snapshots/timeline
      -> C0 contract + field registry
        -> C1 latest Evidence Matrix
          -> C2 historical trajectory
          -> C3 cross-network/provider capability
            -> C4 criteria + decision pack
              -> Case Workspace / Reports / API
                -> C5 collaboration
                -> C6 cohort/adaptive intelligence
```

Hard dependencies:

- C0 depends on Core Scan evidence semantics and Risk Passport snapshot identity;
- C1 must not preserve the current summary-only API as the sole contract;
- C2 must share change semantics with Watchtower, not create a parallel delta
  definition;
- C3 depends on provider registry and chain target validation;
- C4 depends on Case Workspace permission and report versioning;
- C5/C6 require privacy boundaries, aggregation policy, and reliable telemetry;
- no adaptive ranking or similarity should ship before conflict/coverage behavior
  is trusted.

## 18. Definition of Done

Compare is **completed** only when:

1. user can compare supported subjects and snapshots through a stable manifest;
2. every cell preserves value, status, source, time, confidence, and limitation
   where applicable;
3. missing, stale, unavailable, unverified, conflict, and not-comparable states
   remain explicit;
4. numeric, boolean, address, enum, and structured fields use correct
   comparability rules;
5. latest, historical, cross-network, coverage, and decision views are coherent;
6. no ranking or summary treats absent evidence as favorable evidence;
7. target/network/provider capability is validated and visible;
8. provider conflict and network semantic differences are not silently merged;
9. saved result/revision can be replayed with recorded schema/algorithm versions;
10. adding a field/provider/network follows extension contracts without core
    rewrite or UI-only conditionals;
11. export/API/case handoff preserves evidence references, limitations, and
    authorization;
12. tenant isolation, rate limits, cache keys, share expiry, and audit events pass;
13. desktop/mobile flows support selection, matrix, detail, filters, errors,
    partial data, stale state, and next action;
14. English and Bahasa Indonesia are complete and risk terminology is reviewed;
15. automated, browser, replay, performance, and recovery tests pass release
    gates;
16. no critical/high defect remains in evidence integrity, security, or data
    interpretation.

## 19. Keputusan yang harus dikunci sebelum C0

- Which field packs are mandatory for the first Trustable Evidence Matrix?
- What is the minimum evidence coverage for each named ranking criterion?
- Which relative deltas are allowed, and what denominator policy applies?
- Are timestamps compared by exact capture time, window, or freshness bucket?
- How should DEMO snapshots appear beside LIVE snapshots?
- Which fields are comparable cross-network, and who approves semantic mapping?
- What is the retention period for saved manifests, revisions, and exports?
- Who can create, edit, publish, share, revoke, and delete a comparison?
- Which export formats are required for consumer versus B2B review?
- What is the privacy threshold for future cohort/benchmark views?
- Which old schema versions must remain renderable, and for how long?
- What telemetry baseline is needed before setting production SLOs?

## 20. Prioritas final

Urutan yang tidak boleh dibalik:

1. **kunci subject/snapshot/evidence contract;**
2. **bangun registry dan comparability, bukan table rendering dulu;**
3. **ubah summary menjadi Evidence Matrix;**
4. **tambahkan historical replay dengan snapshot immutable;**
5. **tambahkan network/provider capability dan conflict lens;**
6. **baru tambahkan ranking, decision pack, dan collaboration;**
7. **setelah trust terbukti, bangun cohort dan adaptive intelligence.**

Core Compare yang bertahan 10 tahun bukan yang memiliki chart paling banyak.
Ia adalah kernel yang dapat menerima evidence baru, mengakui keterbatasan,
menjaga arti hasil lama, dan tetap menghasilkan perbandingan yang dapat
diverifikasi ketika provider, network, schema, dan kebutuhan bisnis berubah.