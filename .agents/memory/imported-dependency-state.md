---
name: Imported dependency state
description: A workspace-import quirk relevant when validating this project after a fresh import.
---

Imported workspaces may contain a valid package manifest and lockfile while
runtime modules are not yet installed. A missing-module failure during the first
test run can therefore be an environment setup issue rather than a code
regression. Playwright browser binaries may also need an explicit bootstrap
after import; the package can be installed while its browser cache is absent.

**Why:** The initial verification failed first at module loading because the
declared PostgreSQL dependency was not present, then at browser launch because
the Playwright Chromium cache was absent.

**How to apply:** Before diagnosing application behavior after an import, use
the approved package-management flow to install the dependencies already
declared by the project, then ensure the required Playwright browser is
bootstrapped before running visual checks.