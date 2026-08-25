---
name: Passport intelligence contracts
description: Durable rules for Passport freshness, review actions, and audit exports.
---

Passport review actions are derived from the latest immutable snapshot, must carry an evidence or snapshot reference, and record status transitions as append-only timeline events. Freshness is family-specific and must remain separate from risk, reliability, and coverage. Audit exports should expose snapshot IDs, evidence hashes, freshness state, and review history without provider-internal identity.

**Why:** A Passport is longitudinal evidence context, not a second scan engine; collapsing these dimensions or rewriting review state would make decisions impossible to replay.

**How to apply:** Keep Passport review state separate from compliance case reviews, preserve UNKNOWN/PARTIAL/STALE distinctions, and verify exported package hashes against the included manifest and snapshot data.