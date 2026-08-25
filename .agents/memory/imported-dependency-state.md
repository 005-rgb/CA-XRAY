---
name: Imported dependency state
description: A workspace-import quirk relevant when validating this project after a fresh import.
---

Imported workspaces may contain a valid package manifest and lockfile while
runtime modules are not yet installed. A missing-module failure during the first
test run can therefore be an environment setup issue rather than a code
regression.

**Why:** The initial verification failed at module loading because the declared
PostgreSQL dependency was not present in the runtime environment.

**How to apply:** Before diagnosing application behavior after an import, use
the approved package-management flow to install the dependencies already
declared by the project, then rerun the checks.