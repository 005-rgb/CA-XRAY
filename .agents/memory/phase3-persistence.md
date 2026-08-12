---
name: Phase 3 persistence
description: Environment-specific persistence decision for CA X-RAY's PostgreSQL rollout.
---

PostgreSQL is an explicit adapter selected with `DATA_STORE_DRIVER`; development
continues to default to the memory adapter so the imported app runs without
external configuration. The schema is applied explicitly and is not created
silently during application startup.

**Why:** This preserves the adapter contract and prevents an unavailable database
or an implicit DDL operation from becoming a hidden fallback or deployment risk.

**How to apply:** Keep migration/rollback operations separate from the web process,
require `DATABASE_URL` for the PostgreSQL adapter, and use the Replit database
workspace for development schema changes.