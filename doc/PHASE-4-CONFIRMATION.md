# CA X-RAY — Phase 4 Confirmation Record

**Recorded:** 13 August 2026  
**Scope:** Authentication, session, workspace, membership, authorization,
tenant isolation, privileged MFA, and security audit events.

## Current decision

**Implemented foundation / ready for hardening.**

The existing Phase 4 architecture is preserved. The critical release gates for
this implementation are:

- server-side authentication enforcement;
- session expiry and revocation;
- server-side workspace authorization;
- strict cross-tenant/IDOR protection;
- superadmin boundary;
- privileged MFA enforcement; and
- security audit events.

## Acceptance record

| Gate | Evidence | Status |
|---|---|---|
| Visitor can access the public homepage | `GET /` + preview screenshot | Passed |
| Visitor cannot start a private scan | `POST /api/scan` requires authenticated session | Implemented |
| Unauthenticated scan intent survives login | `public/app.js` pending scan storage + login resume | Implemented |
| Authenticated user can create/read own scan | `server.js` workspace-scoped scan routes | Implemented |
| Cross-tenant report access is denied | `persistence.getScanJob(jobId, workspaceId)` | Implemented |
| Invalid/expired/revoked session is denied | `src/auth/service.js` session validation | Implemented |
| Superadmin cannot use workspace routes | `server.js` + `src/security/policy.js` | Implemented |
| Privileged superadmin session requires MFA | pending session + `/api/auth/mfa/verify` | Implemented |
| Security actions are auditable | auth audit events and workspace-scoped audit reads | Implemented |
| Server starts with PostgreSQL dependency available | `pg@8.23.0`, Node `v20.20.0`, `npm run dev` | Passed |

## Verification result

- `npm test`: **41 passed, 0 failed**.
- HTTP matrix: **passed**, including visitor denial, login redirect,
  authenticated scan/job access, cross-tenant 404, invalid/revoked session
  denial, superadmin pending-MFA denial, and post-MFA superadmin boundary.
- Workflow `Start application`: **running** on port 5000.
- Public preview: **verified**; private history and report content are not
  visible in the public rendered homepage.

## Explicitly out of scope

No Phase 5+ features are included. Forensic logic, scoring, provider
adapters, report calculations, billing, and the existing CA X-RAY visual
identity remain unchanged.

The canonical detailed checklist remains in
`DOC/PHASE-4-CONFIRMATION.md`.

## Release sign-off

- [x] GO — critical Phase 4 gates pass in this environment
- [ ] GO WITH CONDITIONS — internal/beta only
- [ ] NO-GO — production access held

**Product Owner:** ____________________  **Date:** __________  
**Engineering:** ______________________  **Date:** __________  
**Security/Operations:** ______________  **Date:** __________