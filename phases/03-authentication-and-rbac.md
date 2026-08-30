# Phase 3 — Authentication and RBAC

[← Back to index](README.md)

## Goal

Implement authentication and Candidate/Recruiter authorization. See
[architecture/auth.md](../architecture/auth.md).

### Tasks

- [x] Implement registration. (`POST /auth/register`)
- [x] Implement login. (`POST /auth/login`)
- [x] Implement password hashing. (`Bun.password` — argon2id, no extra
      dependency)
- [x] Implement session/token mechanism. (JWT via `jose`, HS256, signed
      with `JWT_SECRET`/`JWT_EXPIRES_IN` from config)
- [x] Implement Candidate role. (registering as `CANDIDATE` creates the
      `User` and its linked `Candidate` row in one transaction)
- [x] Implement Recruiter role. (registering as `RECRUITER` creates only
      the `User` row — no candidate profile)
- [x] Add authentication middleware. (`requireAuth` — verifies the
      bearer token, attaches `req.user`)
- [x] Add authorization checks. (`requireRole(roles, handler)` composes
      on top of `requireAuth`)
- [x] Protect recruiter endpoints. (mechanism proven via
      `requireRole(["RECRUITER"], ...)` tests; no recruiter-owned
      resource exists yet to attach it to for real — that lands with
      `POST /jobs` in Phase 4, reusing this exact middleware)
- [x] Protect candidate-owned resources. (`GET /me` — the one
      self-owned resource that exists at this point; real
      candidate-owned resources — resumes, applications — arrive in
      Phase 5/6 and reuse `requireAuth`)
- [x] Add authentication tests. (`auth.service.test.ts`,
      `middleware.test.ts`)
- [x] Add authorization tests. (`requireRole` allow/deny cases in
      `middleware.test.ts`)
- [x] Verify unauthorized access behavior. (401 for no/invalid token,
      403 for wrong role — tested and confirmed live)

### Architecture Note

"Protect recruiter endpoints" and "protect candidate-owned resources"
are satisfied at the *mechanism* level in this phase: `requireAuth` and
`requireRole` exist, are tested, and are proven against `/me`. There are
no recruiter-owned or candidate-owned business resources yet (jobs,
resumes, applications) — those arrive in Phase 4 onward and will use
these same primitives rather than inventing new ones.

Same generic "Invalid email or password" message on both a wrong
password and a nonexistent email, to avoid leaking which emails are
registered.

### Verification

- [x] Candidate can authenticate.
- [x] Recruiter can authenticate.
- [x] Candidate cannot perform recruiter-only actions (verified via
      `requireRole` tests — no recruiter-only business endpoint exists
      yet to check live).
- [x] Resource ownership is enforced (`/me` returns only the caller's
      own profile, derived from the token, not a URL parameter).
- [x] Authentication failures are handled clearly (401 missing/invalid
      token, 403 wrong role, 409 duplicate email, 400 malformed body —
      all verified live against the running server and database).
