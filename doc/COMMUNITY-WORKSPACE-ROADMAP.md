# JOBEN NETWORK — Community Workspace Core Module Roadmap

---

Version: 1.0  
Last updated: 2026-08-25  
Status: Draft for implementation planning  
Owner: Product + Evidence Community  
Parent product: Core Scan / Risk Passport / Case Workspace  
Primary surface: Authenticated Community Workspace

---

## 1. Ringkasan eksekutif

Community Workspace bukan social feed, forum opini, atau leaderboard popularity.
Ia adalah **Evidence Commons**: ruang penelitian bersama tempat researcher dapat
menerbitkan klaim yang terikat pada evidence, menerima peer review independen,
menjawab dispute, dan membawa hasil yang sudah cukup kuat ke Case, Compare,
Watchtower, Shared Report, atau API.

**Ide brilian utama:** setiap contribution menjadi **Claim with a Verifiable
Lifecycle**, bukan post. Nilai contribution berasal dari:

- kualitas dan kelengkapan citation;
- ketepatan scope dan timestamp evidence;
- kejelasan pemisahan fact, interpretation, dan hypothesis;
- peer review independen;
- cara author merespons dispute;
- histori koreksi dan reproducibility;
- kualitas reviewer, bukan jumlah likes atau follower.

Community tidak mengubah evidence source. Ia menambahkan lapisan interpretasi
manusia yang:

- bisa diverifikasi;
- memiliki status dan revision;
- dapat ditantang;
- tidak dapat menaikkan risk score secara diam-diam;
- tetap berlabel `OBSERVED`, `INFERRED`, atau `VERIFIED` sesuai bukti.

Dengan desain ini, community dapat bertahan 10 tahun: format contribution,
reputation, moderation, network, dan policy boleh berkembang tanpa mengorbankan
provenance atau mengubah opini menjadi fakta.

## 2. Keputusan arsitektur

### 2.1 Community adalah evidence interpretation layer

Pembagian tanggung jawab:

- **Core Scan** menghasilkan canonical facts dan provider evidence.
- **Risk Passport** menyimpan snapshot dan timeline.
- **Compare/Watchtower** menghasilkan perubahan dan monitoring context.
- **Community Workspace** menyimpan claim, annotation, review, dispute, dan
  consensus state.
- **Case Workspace** mengonsumsi claim yang relevan sebagai evidence request,
  review input, atau decision context.
- **Shared Report/API** hanya menampilkan community content sesuai moderation,
  visibility, provenance, dan permission policy.

Community tidak boleh:

- mengedit evidence source;
- mengganti risk score/finding severity;
- menghapus histori secara destructive;
- mengubah `UNKNOWN` menjadi `VERIFIED`;
- mengangkat popularitas menjadi credibility;
- membuat inferred relationship terlihat sebagai direct observation.

### 2.2 Workspace-first, public later

Urutan keamanan:

1. authenticated workspace collaboration;
2. scoped sharing dan published annotation;
3. moderated public evidence view;
4. cross-workspace aggregate knowledge hanya setelah privacy, moderation, dan
   provenance terbukti.

Default community data bersifat private/workspace-scoped. Public publication
adalah explicit action, bukan efek samping dari membuat annotation.

### 2.3 Claim, evidence, and decision remain separate

Satu contribution memiliki tiga lapisan:

```text
claim       = what the researcher says
evidence    = what can be checked
interpretation = why the evidence may matter
decision    = what an authorized reviewer decides
```

Decision dapat memakai claim, tetapi claim tidak menjadi decision otomatis.

## 3. Baseline nyata saat ini

Fondasi yang telah tersedia:

- authenticated `/api/community` boundary;
- researcher profile per workspace;
- display name, bio, specialties;
- annotation dengan contract/network, title, body, tags;
- annotation wajib memiliki 1–20 evidence references;
- peer review `ACCEPT` atau `REJECT`;
- reviewer tidak boleh mereview annotation sendiri;
- satu reviewer hanya dapat memberi satu peer review per annotation;
- evidence-backed dispute;
- author tidak boleh mendispute annotation sendiri;
- moderator dapat `APPROVE`, `HIDE`, `RESOLVE`, dan `DISMISS`;
- moderation history disimpan;
- reputation dihitung dari citations, peer outcomes, dan disputes;
- popularity tidak digunakan untuk reputation;
- workspace-scoped list dan route authorization;
- community page memiliki profile editor, annotation form, list, review, dispute,
  dan moderation actions;
- English/Indonesian product localization contract.

Baseline ini adalah **evidence-community foundation**, bukan full collaboration
workspace. Gap penting:

- annotation langsung berstatus published dengan moderation terpisah;
- claim/evidence/interpretation belum memiliki schema terstruktur;
- evidence references belum divalidasi terhadap snapshot/field yang nyata;
- belum ada revision, correction, supersede, withdrawal, atau provenance graph;
- review belum memiliki rubric, independence policy yang kaya, expertise
  declaration, atau conflict-of-interest workflow;
- dispute belum memiliki SLA, evidence comparison, appeal, atau resolution
  taxonomy yang lengkap;
- reputation belum robust terhadap sybil, collusion, reviewer quality, dan
  time decay;
- belum ada moderation queue, abuse/reporting, privacy controls, or quorum;
- UI masih satu workspace page, belum menjadi investigation/review workflow;
- belum ada export/shared/API contract untuk moderated claims;
- persistence, audit, retention, and notification behavior belum production-grade.

## 4. Tujuan produk

### 4.1 User jobs

1. **When I observe something important**, I want to publish a precise,
   evidence-linked claim, so others can reproduce it.
2. **When I review a claim**, I want a structured rubric and original evidence,
   so my decision is independent and explainable.
3. **When I disagree**, I want to challenge the claim with counter-evidence,
   without turning the workspace into an argument thread.
4. **When a claim is corrected**, I want the history to remain visible, so old
   decisions can be traced.
5. **When I use community input in a case**, I want to know whether it is
   observed, inferred, reviewed, disputed, or verified.
6. **When I manage a workspace**, I want moderation and privacy controls that
   protect researchers and evidence without hiding legitimate disagreement.

### 4.2 Desired outcomes

- more reproducible, evidence-backed investigation;
- faster discovery of useful findings without popularity bias;
- disagreements improve evidence quality rather than disappear;
- reviewer and author incentives reward accuracy, citation, and correction;
- community output can safely feed professional review workflows.

## 5. Non-goals untuk v1

Community Workspace v1 tidak mencakup:

- generic social feed, likes, follower graph, influencer ranking, atau viral score;
- anonymous accusations without evidence reference;
- financial advice, trading signals, token promotion, or price prediction;
- community members editing Core Scan facts or risk score;
- public searchable archive by default;
- automated ban based only on negative reputation;
- AI deciding truth, severity, moderation, or reputation without human policy;
- revealing private workspace, member, case, or contact details;
- cross-workspace reputation aggregation without identity/privacy review;
- unbounded attachments or arbitrary executable/media content;
- claim promotion to `VERIFIED` solely from votes or majority;
- self-review, coordinated reciprocal review, or undisclosed conflicts of interest.

## 6. Submodul Community Workspace

| ID | Submodul | Tanggung jawab | Output wajib |
|---|---|---|---|
| M1 | Researcher Identity & Profile | Identity, expertise, profile visibility, contribution history | Scoped researcher profile |
| M2 | Claim & Annotation Composer | Fact/interpretation/hypothesis, scope, tags, affected subject | Structured claim draft |
| M3 | Evidence Reference & Provenance | Snapshot/field/source/time reference validation | Verifiable evidence register |
| M4 | Publication & Revision Lifecycle | Draft, submit, publish, revise, correct, supersede, withdraw | Immutable claim lineage |
| M5 | Peer Review Rubric | Independent review, criteria, confidence, rationale, conflict | Review record |
| M6 | Dispute & Counter-evidence | Challenge, response, counterclaim, appeal, resolution | Auditable dispute case |
| M7 | Moderation & Governance | Queue, roles, policy, enforcement, appeals, transparency | Moderation decision |
| M8 | Reputation & Trust Signals | Quality-derived score, reviewer quality, decay, anti-gaming | Explainable trust profile |
| M9 | Evidence Consensus & Status | Consensus without popularity, observed/inferred/verified states | Claim status projection |
| M10 | Collaboration & Case Handoff | Assign, mention, request evidence, link Case/Watchtower/Report | Controlled workflow link |
| M11 | Discovery & Search | Evidence-first filters, network/field/status/specialty | Scoped discovery view |
| M12 | Privacy, Safety & Operations | Data classification, abuse, retention, audit, incident response | Policy/runbook evidence |
| M13 | Community API & Export | Read projection, citations, export, version contract | Safe external projection |
| M14 | Responsive Workspace UX | Research, review, dispute, moderation flows desktop/mobile | Accessible responsive UI |

## 7. Core domain contract

### 7.1 Researcher profile

Profile minimal:

- `researcherId`, `workspaceId`, actor identity;
- display name and optional bio;
- specialties as controlled/normalized tags;
- profile visibility;
- contribution/review counts;
- reputation components and explanation;
- conflict-of-interest declarations where relevant;
- created/updated timestamps;
- moderation/safety status.

Profile must not expose private email, authentication identifiers, member
relationships, or hidden workspace metadata.

### 7.2 Claim/annotation

Setiap claim memiliki:

- `claimId`, `workspaceId`, author;
- subject identity: network, normalized address, contract/program;
- optional snapshot IDs and captured timestamps;
- claim type: observation, interpretation, hypothesis, correction, question;
- title, structured body, tags;
- evidence register;
- confidence chosen by author with rubric;
- status;
- visibility/audience;
- created/updated/published timestamps;
- revision root/parent;
- moderation state;
- review summary;
- dispute summary;
- labels: `OBSERVED`, `INFERRED`, `VERIFIED`, `DISPUTED`, `UNRESOLVED`;
- schema/claim version.

Claim type is semantic, not merely UI copy. An `INFERRED` hypothesis cannot be
rendered as direct observation in Report, API, Compare, or Case.

### 7.3 Evidence register

Evidence reference minimal:

- evidence ID or stable source reference;
- source type/provider category;
- snapshot/report/job reference;
- field/path or finding reference;
- captured/observed time;
- evidence status;
- quote/excerpt only where policy permits;
- author explanation of relevance;
- integrity/hash where available;
- access classification;
- validity/expiry if source is time-sensitive.

Rules:

- reference must resolve or explicitly return unavailable;
- stale evidence remains stale;
- deleted/expired source is not silently removed from history;
- user text cannot impersonate canonical evidence ID;
- a citation without resolvable evidence is incomplete, not verified.

### 7.4 Review record

Review minimal:

- `reviewId`, claim, reviewer, workspace;
- rubric version;
- decision: support, partially support, reject, needs evidence;
- per-criterion result;
- confidence;
- rationale;
- cited evidence/counter-evidence;
- independence/conflict declaration;
- created timestamp;
- one-review-per-reviewer invariant per claim revision;
- review status and possible correction.

Review outcome is not a popularity vote. Weight depends on rubric quality,
evidence use, reviewer history, and independence policy.

### 7.5 Dispute record

Dispute minimal:

- `disputeId`, target claim/revision;
- challenger;
- reason and counter-evidence register;
- disputed dimensions;
- response deadline/SLA;
- author response;
- moderator/reviewer assignments;
- resolution: upheld, partially upheld, rejected, superseded, unresolved;
- rationale and evidence;
- appeal status;
- full append-only history.

## 8. Brilliant core: Evidence Commons lifecycle

### 8.1 Claim lifecycle

```text
DRAFT
  -> SUBMITTED
    -> UNDER_REVIEW
      -> PUBLISHED
        -> DISPUTED
        -> CORRECTED
        -> SUPERSEDED
        -> WITHDRAWN
        -> ARCHIVED
```

Rules:

- publication requires evidence register and policy checks;
- correction creates a new revision, never edits published claim body in place;
- superseded claim remains visible with successor link;
- withdrawal hides from discovery according to policy but preserves audit reason;
- dispute does not automatically hide claim unless safety/moderation policy requires;
- `PUBLISHED` is not equal to `VERIFIED`;
- `VERIFIED` requires independent evidence/review policy, not majority votes.

### 8.2 Four-layer claim state

Reader sees separate dimensions:

1. **Publication:** draft/submitted/published/withdrawn.
2. **Evidence:** complete/partial/unavailable/conflicting/stale.
3. **Review:** unreviewed/supported/mixed/rejected/needs-evidence.
4. **Moderation:** pending/approved/hidden/appealed/resolved.

Do not collapse these into one green/red badge.

### 8.3 Fact/interpretation/hypothesis separation

Composer requires author to classify:

- `FACT`: directly observed and cited;
- `INTERPRETATION`: explanation grounded in cited facts;
- `HYPOTHESIS`: plausible relationship requiring confirmation;
- `QUESTION`: request for evidence/review.

The UI and API preserve this label in every downstream projection.

## 9. Trust and reputation model

### 9.1 Quality, not popularity

Trust signals may include:

- citation validity and completeness;
- peer review outcomes;
- quality of review rationale;
- dispute outcomes;
- correction behavior;
- reproducibility;
- time decay;
- conflict disclosure;
- reviewer independence;
- expertise relevance as contextual metadata.

Never use:

- likes;
- views;
- follower count;
- number of comments;
- raw contribution volume;
- paid/plan tier as evidence quality.

### 9.2 Explainable reputation

Researcher profile exposes components:

```text
quality score
  = citation quality
  + peer review quality
  + correction/reproducibility behavior
  - upheld dispute impact
  - unresolved conflict/risk
```

Exact weights require calibration and are versioned. A score without basis is
not a trust signal.

### 9.3 Anti-gaming

- one reviewer cannot review own claim;
- reciprocal review clusters are detected;
- repeated same-workspace or same-actor patterns are contextualized;
- new accounts have limited influence, not automatic suppression;
- reputation changes have time decay and review window;
- disputed claim cannot boost author trust until resolution;
- moderator actions do not silently alter historical reputation;
- workspace-local reputation is distinct from any future global reputation;
- enforcement decisions require reason and appeal path.

Reputation is a decision aid, never proof of truth.

## 10. Prioritas delivery

Roadmap memakai `Now / Next / Later`. Estimasi mencakup product, design,
engineering, QA, security, moderation operations, localization, dan legal/
privacy review.

### NOW — M0: Evidence Commons trust contract

**Outcome:** community tidak dapat berubah menjadi opinion feed yang menyamarkan
opini sebagai evidence.

Scope:

- claim/evidence/review/dispute domain schema;
- fact/interpretation/hypothesis/question types;
- status dimensions;
- evidence reference validity and provenance;
- workspace/public boundary;
- moderation authority matrix;
- conflict-of-interest policy;
- labels `OBSERVED`, `INFERRED`, `VERIFIED`, `DISPUTED`;
- audit and revision invariants;
- threat model untuk abuse, privacy, brigading, sybil, and evidence forgery.

Acceptance:

- every published claim has a structured evidence register;
- a hypothesis cannot render as observed fact;
- missing/unavailable citation is explicit;
- publication/review/moderation status remain independent;
- workspace scope is server-side;
- no reputation or consensus decision is based on popularity.

Estimasi: **M (2–4 minggu)**.  
Gate: Evidence Community + Security + Product sign-off.

### NOW — M1: Structured claim composer and lineage

**Outcome:** researcher dapat menulis claim yang reproducible dan memperbaikinya
tanpa menghapus history.

Scope:

- draft composer;
- structured type and subject scope;
- evidence picker/reference validation;
- author confidence and limitation;
- submit/publish moderation flow;
- revision/correction/supersede/withdraw;
- citation preview;
- private/workspace/public visibility;
- evidence-linked detail page.

Acceptance:

- invalid/nonexistent evidence reference cannot be presented as verified;
- published claim revision is immutable;
- correction produces new revision and preserves predecessor;
- author must separate fact from interpretation/hypothesis;
- public projection excludes private notes and workspace metadata;
- mobile composer supports evidence selection and long-form review safely.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: M0, Core Scan/Risk Passport evidence references.

### NOW — M2: Independent peer review and dispute workflow

**Outcome:** disagreement menjadi structured quality control, bukan argument
thread atau vote.

Scope:

- review rubric and per-criterion outcome;
- reviewer conflict/independence declaration;
- one review per reviewer per revision;
- counter-evidence;
- dispute open/respond/resolve/appeal;
- SLA and queue status;
- resolution taxonomy;
- author correction response;
- reviewer/author notification policy.

Acceptance:

- author cannot review own claim;
- duplicate review is rejected;
- dispute requires reason plus evidence/counter-evidence;
- reviewer sees original citations and limitations;
- resolution requires rationale and actor;
- unresolved dispute is visible in every downstream claim projection;
- review outcome never directly changes Core Scan risk score.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: M0–M1, auth roles, notification policy.

### NEXT — M3: Moderation operations and safety

**Outcome:** community dapat scale tanpa mengorbankan researcher safety atau
evidence integrity.

Scope:

- moderation inbox;
- queue by pending, reported, disputed, high-impact, abuse risk;
- role separation for moderator/reviewer/admin;
- hide/unhide/approve/lock/restore;
- evidence and privacy abuse reports;
- appeal and second-review;
- reason codes and transparency log;
- rate limits, content limits, attachment policy;
- anti-brigading and coordinated review detection;
- emergency takedown without destructive deletion.

Acceptance:

- moderator decision always records reason, actor, time, and target revision;
- hidden claim retains audit lineage and is not silently deleted;
- appeals cannot be decided by same actor without policy exception;
- abuse report does not reveal reporter identity unnecessarily;
- moderation queue is tenant-scoped and role-protected;
- emergency hide blocks public projection while preserving authorized audit.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: M0–M2, auth/RBAC, operations runbook.

### NEXT — M4: Reputation and evidence consensus

**Outcome:** workspace dapat menemukan researcher dan claim berkualitas tanpa
membuat popularity leaderboard.

Scope:

- quality-derived reputation components;
- reviewer quality and independence;
- dispute/correction time decay;
- contextual expertise tags;
- claim consensus projection;
- observed/inferred/verified status policy;
- anti-sybil/collusion signals;
- explainable profile breakdown;
- reputation versioning and recalculation audit.

Acceptance:

- profile explains every reputation component;
- views/likes/follower count are not inputs;
- claim cannot become verified by vote count alone;
- an upheld dispute affects relevant claim status with lineage;
- reputation recalculation is reproducible with policy version;
- low-data/new researcher is shown as insufficient evidence, not automatically
  low quality;
- inferred relationships remain `INFERRED`.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: M2–M3, sufficient baseline data, privacy review.

### NEXT — M5: Collaboration and investigation handoff

**Outcome:** claim yang berguna masuk ke professional workflow tanpa kehilangan
status dan provenance.

Scope:

- assign reviewer;
- mention/notification with privacy controls;
- request additional evidence;
- link claim to Case Workspace;
- add claim to Compare decision pack;
- attach Watchtower pulse;
- reference in Shared Report;
- export evidence register;
- reviewer acknowledgement and case decision context.

Acceptance:

- handoff preserves claim revision, evidence references, review/dispute state;
- case decision can distinguish claim from canonical evidence;
- private comments stay within their original permission boundary;
- downstream report/API cannot drop `INFERRED`, `DISPUTED`, or limitation labels;
- closing a case does not resolve a community dispute automatically.

Estimasi: **M–L (3–6 minggu)**.  
Dependency: Case, Compare, Watchtower, Shared Report contracts.

### NEXT — M6: Discovery, search, and safe public projection

**Outcome:** researcher menemukan evidence yang relevan tanpa ranking popularitas
atau accidental public disclosure.

Scope:

- search by network, address, field, tag, status, evidence age, review state;
- filter observed/inferred/verified/disputed;
- reviewer specialty discovery;
- evidence coverage and source filter;
- scoped workspace/public index;
- saved queries;
- public moderated claim projection;
- citation graph and related snapshots;
- abuse-safe search and rate limits.

Acceptance:

- search result labels publication, evidence, review, moderation separately;
- hidden/private content never appears in autocomplete or counts;
- results do not sort by popularity unless explicitly non-trust metadata;
- stale/conflict evidence is visible in result;
- public result provides source limitation and revision status;
- cross-workspace search requires explicit publication/aggregate policy.

Estimasi: **L–XL (4–8 minggu)**.  
Dependency: M0–M4, privacy/indexing policy.

### LATER — M7: Community API and external verification

Directional:

- versioned read-only claim/review/evidence projections;
- public citation lookup;
- API scope for workspace/community read;
- signed evidence register;
- partner moderation webhooks;
- export to Shared Report/API Access;
- external verification package.

Must reuse API Access security and Shared Report publication contract. No direct
database-shaped community endpoint.

### LATER — M8: Long-lived evidence network

Directional, only after workspace quality is proven:

- cross-workspace federated claim exchange;
- privacy-preserving aggregate expertise;
- contribution portability;
- jurisdiction-specific moderation/policy;
- multilingual terminology/translation review;
- formal evidence graph;
- reproducibility challenges;
- independent verifier network.

No global reputation or public ranking before identity, privacy, anti-sybil,
appeal, and legal governance are proven.

## 11. Responsive UX blueprint

### 11.1 Workspace desktop

Navigation:

1. **Evidence Feed**
   - scoped filters and claim status;
   - evidence age/source/coverage;
   - no popularity-first ordering.
2. **My Research**
   - drafts, published, revisions, disputes, review assignments;
   - correction and withdrawal actions.
3. **Review Queue**
   - assigned/pending/overdue;
   - rubric preview and conflict declaration.
4. **Dispute Center**
   - open, awaiting response, appeal, resolved;
   - before/after claim revisions and counter-evidence.
5. **Researcher Profiles**
   - specialties, quality basis, review quality, limitations;
   - no follower/like leaderboard.
6. **Moderation**
   - role-protected queue, reason codes, audit trail.

Claim detail layout:

- subject identity and snapshot/time;
- claim type badge;
- evidence register;
- author interpretation/hypothesis;
- review outcomes;
- dispute status;
- revision lineage;
- confidence/reliability/coverage distinctions;
- actions: review, dispute, request evidence, link case, export.

### 11.2 Mobile

- feed uses stacked claim cards with subject, status, evidence count, freshness;
- composer becomes stepper: subject → claim type → evidence → limitations →
  preview → submit;
- evidence references open as bottom sheet with source/status/time;
- review rubric uses one criterion per card with sticky progress;
- dispute flow requires reason, affected claim dimension, and evidence;
- moderation actions use explicit confirmation and reason;
- revision lineage is vertical timeline;
- no essential evidence requires horizontal table scroll;
- minimum touch target 44px;
- long address truncation includes copy/full accessible label;
- status uses text/icon plus color, never color alone;
- loading, empty, stale, unavailable, conflict, hidden, permission, and error
  states have dedicated views.

Priority order:

**subject → claim type → evidence status → review/dispute state → limitation →
next action**.

### 11.3 Accessibility and localization

- English and Bahasa Indonesia ship together;
- all user-facing copy uses locale keys;
- status/enums remain stable language-neutral;
- semantic headings, landmarks, labels, and review controls;
- keyboard navigation for composer, evidence register, review rubric, dispute,
  moderation, and lineage;
- screen reader announces claim type/status/evidence state in logical order;
- date, time, number, and timezone use shared formatter;
- sensitive moderation/security copy receives native-language review.

## 12. Security, privacy, and safety

### 12.1 Authorization

- server derives workspace scope from session/membership;
- every claim, review, dispute, profile, and moderation record is tenant-scoped;
- role/action matrix distinguishes contribute, review, moderate, audit, export;
- public visibility requires explicit publication;
- moderator cannot access unrelated workspace;
- support/platform roles use separate audited path;
- case/report/API handoff rechecks original permission.

### 12.2 Evidence integrity

- published claims reference immutable evidence/snapshots;
- evidence reference validation prevents fabricated IDs;
- source unavailable/stale/conflict preserved;
- claim revision does not mutate source evidence;
- moderation hide does not delete historical evidence;
- downstream projections retain observed/inferred/verified/disputed labels;
- no community score changes canonical scan score.

### 12.3 Abuse and researcher safety

- content length/rate/attachment limits;
- report harassment, doxxing, impersonation, manipulation, and evidence abuse;
- redact personal data from public projection;
- no public email/member identity by default;
- anti-brigading and coordinated review detection;
- moderation reason and appeal;
- emergency hide/takedown with audit;
- prevent mass enumeration of profiles/claims;
- preserve legitimate disagreement and avoid automatic truth by majority.

### 12.4 Privacy and retention

- classification: PUBLIC, WORKSPACE, RESTRICTED, SECRET;
- private notes and moderation metadata never public;
- retention for claims/reviews/disputes/audit separately defined;
- erasure policy must preserve minimum audit/legal record without exposing PII;
- exports honor current permission and publication policy;
- notification content minimizes sensitive claim detail.

## 13. Compatibility strategy 10 tahun

### 13.1 Version axes

Community versions independently:

1. claim schema;
2. evidence reference schema;
3. review rubric;
4. dispute/moderation policy;
5. reputation policy;
6. visibility/redaction projection;
7. API/export schema;
8. locale/glossary;
9. network/provider capability.

### 13.2 Read old, write current

- old claims render with their original type/status/rubric version;
- new revisions use current schema;
- changing claim meaning creates new type/version, not silent reinterpretation;
- old reputation results retain policy version;
- moderation decisions remain tied to target revision;
- evidence unavailable later is shown as unavailable, not removed;
- unsupported schema returns structured migration state;
- public/API projections never silently upgrade historical claims;
- deprecation includes telemetry and migration guidance.

### 13.3 Extensible contribution types

New claim types should register:

- schema;
- required evidence;
- review rubric;
- allowed visibility;
- moderation policy;
- downstream projection behavior;
- localization keys;
- retention/classification;
- migration rule.

Core workspace orchestration should not grow a provider- or feature-specific
conditional maze.

## 14. Quality strategy dan acceptance criteria

### 14.1 Test layers

1. **Domain:** claim lifecycle, revision, evidence reference, labels, review,
   dispute, moderation, reputation calculation.
2. **Authorization:** tenant isolation, roles, public projection, export,
   moderator boundaries, handoff.
3. **Evidence:** resolvable/unavailable/stale/conflict citation, snapshot
   immutability, observed/inferred/verified preservation.
4. **Anti-abuse:** self-review, self-dispute, duplicate review, brigading,
   enumeration, rate limits, attachment/content safety.
5. **Reputation:** reproducibility, policy version, time decay, collusion,
   insufficient-data state, no popularity input.
6. **Workflow:** author correction, reviewer response, dispute response,
   moderator resolution, appeal, case handoff.
7. **Browser:** composer, evidence detail, review, dispute, moderation, profile,
   desktop/mobile, keyboard, focus, error, empty, hidden.
8. **Operations:** audit, retention, backup/restore, moderation incident,
   emergency hide, notification failure, migration.
9. **Compatibility:** old claim/rubric/rendering and downstream API/export.

### 14.2 Gherkin acceptance scenarios

#### Evidence-backed publication

```text
Given a researcher drafts a claim about a contract
When they submit it for publication
Then the claim must classify fact, interpretation, hypothesis, or question
And it must include at least one valid evidence reference
And unresolved or unavailable evidence is shown explicitly
And the claim is not labeled VERIFIED merely because it was submitted
```

#### Evidence status preservation

```text
Given a claim cites UNKNOWN, UNAVAILABLE, and CONFLICT evidence
When another researcher opens the claim
Then each evidence state remains distinct
And none is rendered as safe, false, zero, or verified
And the limitation is visible in the claim and downstream projection
```

#### Revision and correction

```text
Given a published claim contains an incorrect interpretation
When the author submits a correction
Then a new immutable revision is created
And the original claim remains in the lineage
And the correction explains what changed and why
And existing case/report references continue pointing to the original revision
```

#### Independent peer review

```text
Given a researcher is the author of a claim
When they attempt to review that claim
Then the review is rejected
And no reputation or review count changes
```

```text
Given a reviewer already reviewed claim revision R1
When they submit another review for R1
Then the duplicate is rejected
And the original review remains unchanged
```

#### Evidence-backed dispute

```text
Given a researcher disagrees with a published claim
When they open a dispute
Then they must provide a reason and counter-evidence
And the claim remains labeled according to its current state
And the dispute appears in the lineage without silently deleting the claim
```

#### Moderation appeal

```text
Given a moderator hides a public claim
When the author appeals the decision
Then the appeal is assigned to an eligible independent reviewer
And the original moderation decision and reason remain auditable
And the claim is not automatically restored before the appeal outcome
```

#### Reputation fairness

```text
Given two researchers have equal evidence quality but different view counts
When reputation is calculated
Then view count does not change either reputation result
And the profile explains the actual quality components used
```

#### Inferred relationship

```text
Given a community claim proposes a relationship between two contracts
When the relationship lacks independent confirmation
Then it is labeled INFERRED
And downstream report/API/case views preserve that label
And it cannot be presented as common ownership or malicious intent
```

#### Tenant isolation

```text
Given a member submits a claim or review identifier from another workspace
When the request is processed
Then the foreign resource is not disclosed
And no profile, evidence, dispute, or moderation metadata crosses the boundary
```

#### Responsive workflow

```text
Given a researcher uses Community Workspace on mobile
When they create a claim, inspect evidence, and submit a dispute
Then the workflow is completable without horizontal scrolling
And status, evidence limitation, and next action remain visible
And destructive moderation actions require explicit confirmation
```

## 15. Release gates

### Gate A — Evidence Commons Foundation

- structured claim types;
- validated evidence references;
- immutable revision lineage;
- independent status dimensions;
- workspace/public boundary;
- English/Bahasa Indonesia.

### Gate B — Reviewable Community

- rubric-based independent peer review;
- evidence-backed dispute;
- response and resolution;
- audit trail;
- self-review/self-dispute protection;
- mobile/desktop research flow.

### Gate C — Safe Governance

- moderation queue and role separation;
- abuse/reporting/takedown;
- appeal;
- anti-brigading/sybil signals;
- privacy/redaction;
- retention and incident runbook.

### Gate D — Trustworthy Network

- explainable reputation;
- observed/inferred/verified projections;
- case/Compare/Watchtower/Report handoff;
- API/export contract;
- compatibility and migration;
- load, abuse, recovery, and moderation drills;
- no critical/high defect in evidence integrity, privacy, authorization, or
  researcher safety.

## 16. Success metrics

### Evidence quality

- percentage published claims with resolvable evidence;
- citation completeness and freshness;
- reproducibility/review acceptance rate;
- correction rate and correction response time;
- unsupported/unavailable citation rate;
- claim-to-case evidence reuse;
- downstream label preservation rate.

### Review quality

- independent review completion time;
- rationale completeness;
- dispute resolution time;
- upheld/partially upheld/rejected dispute distribution;
- reviewer conflict disclosure rate;
- duplicate/self-review prevention rate;
- appeal overturn rate.

### Safety and governance

- abuse report response time;
- false takedown rate;
- privacy exposure incidents;
- moderation consistency across similar cases;
- coordinated manipulation detection;
- unauthorized cross-workspace access incidents;
- emergency hide/recovery time.

### Product

- claim publication completion;
- evidence-detail engagement;
- review queue completion;
- dispute-to-correction conversion;
- researcher return rate;
- case/report/Compare/Watchtower handoff;
- mobile completion rate.

### Trust

- false-confidence incidents;
- popularity-bias incidents;
- inferred-as-observed incidents;
- reputation reproducibility;
- percentage profiles with explainable score basis.

Numeric targets should be set after baseline telemetry and moderation capacity
are known. Do not create a popularity KPI that undermines the product principle.

## 17. Dependency map

```text
Core Scan evidence/provenance
  -> Researcher/tenant auth
    -> M0 Evidence Commons contract
      -> M1 structured claim + lineage
        -> M2 peer review/dispute
          -> M3 moderation/safety
            -> M4 reputation/consensus
              -> M5 case/report/Compare/Watchtower handoff
                -> M6 discovery/public projection
                  -> M7 API/export
                    -> M8 federated evidence network
```

Hard dependencies:

- M1 cannot validate claims without Core Scan/Risk Passport evidence identity;
- M2 cannot establish quality without independent review and dispute semantics;
- M3 cannot scale without role, appeal, audit, and privacy policy;
- M4 cannot launch before sufficient high-quality review data exists;
- M5 must preserve community labels and must not mutate canonical evidence;
- M6 public discovery requires moderation and anti-enumeration;
- M7 must reuse API Access security and Shared Report publication boundary;
- M8 requires privacy, legal, identity, and cross-workspace governance approval.

## 18. Definition of Done

Community Workspace is **completed** only when:

1. researcher can create a structured claim with subject, claim type, evidence,
   limitation, confidence, and visibility;
2. evidence references resolve to canonical snapshots/fields or explicitly
   identify unavailable/stale/conflicting state;
3. published claims are immutable revisions with correction/supersede/
   withdrawal lineage;
4. fact, interpretation, hypothesis, and question remain distinct downstream;
5. peer review is independent, rubric-based, auditable, and protected from
   self-review/duplicate review;
6. dispute requires counter-evidence, supports response/resolution/appeal, and
   never silently deletes the target claim;
7. moderation is role-protected, reasoned, appealable, and append-only;
8. reputation derives from evidence/review/correction quality, never popularity;
9. observed/inferred/verified/disputed labels survive Case, Compare, Watchtower,
   Shared Report, API, and export projections;
10. tenant isolation, privacy classification, public projection, abuse controls,
    and retention are enforced server-side;
11. search/discovery does not expose hidden/private content or rank truth by
    views/followers;
12. English and Bahasa Indonesia are complete and evidence terminology is
    reviewed;
13. desktop/mobile composer, review, dispute, moderation, and claim detail
    flows pass accessibility and responsive acceptance;
14. automated, browser, security, abuse, migration, audit, and recovery tests
    pass release gates;
15. operations runbook covers harassment, evidence abuse, privacy incident,
    emergency hide, appeal, backup/restore, and moderator compromise;
16. no critical/high defect remains in evidence integrity, authorization,
    privacy, moderation fairness, or researcher safety.

## 19. Keputusan yang harus dikunci sebelum M0

- Which claim types are mandatory for v1?
- What evidence reference types can be cited, and how are they validated?
- Which claims require moderation before workspace publication?
- What makes a claim `VERIFIED`, and who/what independent evidence qualifies?
- How are author confidence and reviewer confidence displayed separately?
- What is the reviewer independence/conflict-of-interest policy?
- What are dispute SLAs, appeal rules, and emergency hide authority?
- Which reputation components are visible, and what is their time window/decay?
- How are sybil/collusion signals used without punishing legitimate new users?
- What content/attachment types are allowed and retained?
- Which community data can be public, workspace-only, restricted, or secret?
- What minimum data is preserved when a researcher requests erasure?
- Which outputs may enter Case, Compare, Watchtower, Shared Report, or API?
- What moderation staffing/capacity is available before public discovery?
- What telemetry baseline is required before setting trust and safety SLOs?

## 20. Prioritas final

Urutan yang tidak boleh dibalik:

1. **kunci claim/evidence/review/dispute/moderation contract;**
2. **buat structured claim dan immutable lineage;**
3. **buat peer review independen dan dispute berbasis counter-evidence;**
4. **buat moderation, privacy, abuse, dan appeal;**
5. **baru hitung reputation dan consensus dengan basis yang explainable;**
6. **sambungkan ke Case, Compare, Watchtower, Shared Report, dan API;**
7. **baru buka discovery publik, federasi, dan evidence network lintas workspace.**

Community Workspace yang benar-benar selesai bukan tempat paling ramai. Ia adalah
tempat paling dapat ditelusuri: setiap klaim memiliki evidence, setiap perbedaan
memiliki jalur penyelesaian, setiap reputasi memiliki alasan, dan setiap output
tetap jujur tentang apa yang diamati, apa yang disimpulkan, dan apa yang belum
terbukti.