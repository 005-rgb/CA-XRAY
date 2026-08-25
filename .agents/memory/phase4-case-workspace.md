---
name: Phase 4 case workspace
description: Durable rules for investigation cases, review lifecycle, and audit history.
---

Case workspace mutations must remain tenant-scoped and append-only: assignments, status changes, evidence-request changes, comments, and decisions are recorded as timeline events rather than rewriting history.

**Why:** Investigation decisions need an explainable chain of custody and must not alter the underlying evidence snapshot.

**How to apply:** Keep case status, evidence-request status, and decision state explicit; reject invalid transitions or values instead of silently normalizing them.