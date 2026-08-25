# JOBEN NETWORK — Development Roadmap

## Product direction

JOBEN NETWORK follows a dual-track strategy:

- **B2B is the revenue engine:** evidence-backed due diligence, listing review,
  compliance workflow, and auditable decisions for Indonesia and Southeast Asia.
- **Consumer is the distribution layer:** fast contract scans, personal Risk
  Passport, monitoring, explainable findings, and shareable reports.

Both tracks share one core: evidence, provenance, snapshots, change detection,
reports, policy states, and audit events. They are not separate products.

## Product principles

1. Evidence over score.
2. Decision-grade outputs, never absolute safety claims.
3. Unknown, unavailable, stale, and conflicting data remain explicit.
4. Human approval remains authoritative for organizational decisions.
5. AI may summarize and organize evidence, but may not alter evidence or
   silently replace uncertainty with confidence.
6. Temporal intelligence is central: what changed matters as much as current
   state.

## Phases

### Phase 0 — Trust contract

Canonical evidence schema, finding taxonomy, confidence/freshness rules,
decision states, report versioning, privacy boundaries, threat model, and legal
positioning review.

### Phase 1 — Production-grade core

PostgreSQL persistence, durable queue and workers, lease/retry/dead-letter
handling, backup/restore drill, readiness and health checks, metrics,
provider-health telemetry, adapter contract tests, and production security
gates.

### Phase 2 — Consumer investigation MVP

Scan summary, evidence coverage, explainable findings, Risk Passport,
comparison, saved watchlists, material-change alerts, and safe public/private
report sharing.

### Phase 3 — Evidence intelligence

Evidence Graph, lineage, provider conflict view, stale evidence handling,
confidence per finding, explainable risk breakdown, and coverage map.

### Phase 4 — Investigation Case Workspace

Cases, multi-contract review, assignments, comments, evidence requests,
finding lifecycle, review queue, decision log, immutable audit timeline, and
report generation.

### Phase 5 — Listing and compliance pack

Configurable policy/checklists, role separation, approvals, conditional
decisions, review expiry, Indonesian/English reports, evidence register, and
tenant governance.

### Phase 6 — Evidence API and agent interface

Versioned asynchronous API, evidence bundles, signed reports, webhooks, usage
metering, SDK, uncertainty contract, and agent-safe responses.

### Phase 7 — Network intelligence

Deployer/funding graphs, repeated behavior, cross-contract comparison,
cross-network hypotheses, and clear observed/inferred/verified labels.

### Phase 8 — Evidence community

Researcher profiles, evidence-backed annotations, peer review, disputes,
moderation, and reputation based on contribution quality rather than popularity.

## Release gates

- **Trustable Scanner:** reliable scan, evidence coverage, Passport, timeline,
  watchlist, material alerts, and export.
- **Review Workspace:** case, policy, review, approval, audit, and versioned
  report.
- **Evidence Platform:** API, webhooks, signed evidence, schemas, and usage
  controls.

## Explicitly deferred

Token/governance mechanics, generic social feed, popularity leaderboard,
wallet connection, trading, financial recommendations, unsupported chain
expansion, and ungrounded AI chat.

## Success measures

Evidence completeness, freshness, conflict rate, false-confidence incidents,
review completion time, repeat monitoring, alert acknowledgement, alert-to-case
conversion, report sharing, audit retrieval time, review turnaround, and cost
per completed review.