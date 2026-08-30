# Progress Log

A running ledger of completed subtasks, one line per entry, newest at the
bottom. Append here as work completes — see the Working Process in
[CLAUDE.md](CLAUDE.md#working-process-every-phase). This is a log, not a
checklist; checkboxes live in [phases/](phases/README.md).

Format: `- YYYY-MM-DD — Phase N — <what was done>`

<!-- Entries start below this line. -->

- 2026-08-30 — Phase 0 — Inspected repo; confirmed Git identity
  (AdarshVMore / skullcrushermore@gmail.com) already configured, no
  Claude identity present.
- 2026-08-30 — Phase 0 — Removed placeholder `server/` and empty
  `client/` in favor of the documented `apps/backend` + `packages/*`
  Bun workspace layout (see Architecture Note in the phase file).
- 2026-08-30 — Phase 0 — Scaffolded root workspace (`package.json`,
  `tsconfig.base.json`, `.gitignore`), `apps/backend` (package.json,
  tsconfig, `.env.example`, `src/server.ts` health-check bootstrap), and
  `packages/database` skeleton (Prisma schema/client to follow in
  Phase 1). Skipped `packages/shared` — no second consumer yet.
- 2026-08-30 — Phase 0 — Added root README covering setup, tech stack,
  and env vars.
- 2026-08-30 — Phase 0 — Verified `bun install`, `bunx tsc --noEmit`
  (exit 0), and `bun run start` (`GET /health` → `{"status":"ok"}`).
- 2026-08-30 — Phase 1 — Set up local PostgreSQL (Homebrew
  `postgresql@15`, `atcon_ats` database) and installed Prisma 7.10.0 in
  `packages/database`, pinned down from the `8.0.0-rc.12` prerelease
  `prisma init` grabbed by default.
- 2026-08-30 — Phase 1 — Wrote the full schema in
  `packages/database/prisma/schema.prisma`: User, Candidate, Job,
  JobStage, Application, ApplicationStageHistory, Resume, Interview,
  InterviewScorecard, Notification, AuditLog. No separate Recruiter
  table — `User.role` + `Job.recruiterId` covers it without an
  unnecessary 1:1 join.
- 2026-08-30 — Phase 1 — Ran the initial migration
  (`20260830023340_init`) against a freshly created empty database,
  generated the Prisma client, and wired `packages/database/src/index.ts`
  to export a singleton `prisma` client using the `@prisma/adapter-pg`
  driver adapter (Prisma 7 requires an explicit adapter).
- 2026-08-30 — Phase 1 — Added an idempotent seed script
  (`prisma/seed.ts`) covering one recruiter, one candidate, one job with
  6 stages, and one application; ran it twice to confirm no duplicate
  rows. Verified `apps/backend` can import `@atcon/database` and query
  the database successfully.
- 2026-08-30 — Phase 1 — Corrected `CLAUDE.md`'s Commands section and
  the root README: Prisma commands run from `packages/database`, not
  `apps/backend`.
- 2026-08-30 — Phase 2 — Built the class-oriented backend skeleton:
  `config/env.ts` (fails fast on missing `DATABASE_URL`/`JWT_SECRET`),
  `database/client.ts`, `shared/logger.ts`, `shared/http/HttpError.ts` +
  `withErrorHandling()`, `auth/types.ts` (types only — Phase 3 owns the
  actual auth logic), and a `Controller → Service` health check wired
  through `app.ts` and `server.ts`. No repository layer yet — nothing
  has real persistence logic to encapsulate until Phase 3/4.
- 2026-08-30 — Phase 2 — Added `bun test` coverage for the error wrapper
  and health controller (mocked service, no live DB needed); verified
  `bunx tsc --noEmit` (exit 0) and a real `bun run start` →
  `GET /health` → `200 {"status":"ok"}` with the database check logged.
- 2026-08-30 — Phase 3 — Added `jose` to `apps/backend` for JWT
  signing/verification (HS256) — hand-rolling JWT parsing/signature
  checks isn't worth the security risk versus a small, well-audited
  dependency. Password hashing uses `Bun.password` (argon2id), no
  extra dependency needed there.
- 2026-08-30 — Phase 3 — Built `POST /auth/register`, `POST /auth/login`,
  and `GET /me` end to end: `UserRepository` (creates `User` +, for
  `CANDIDATE`, a linked `Candidate` row, in one transaction),
  `AuthService` (manual boundary validation — email format, password
  length, role — no Zod, per CLAUDE.md), `AuthController`,
  `requireAuth`/`requireRole` middleware composing on top of
  `withErrorHandling`.
- 2026-08-30 — Phase 3 — Login returns the same "Invalid email or
  password" message for a wrong password and a nonexistent email, to
  avoid leaking which emails are registered.
- 2026-08-30 — Phase 3 — Hit a real bug live-testing against the actual
  database: the pg driver adapter reports Postgres unique-constraint
  violations via `meta.driverAdapterError.cause.constraint.index`, not
  Prisma's usual `meta.target` column array, so the first version of the
  duplicate-email → 409 mapping silently fell through to a generic 500.
  Fixed `isEmailUniqueConstraintViolation` to check both shapes and
  added a regression test for the driver-adapter shape specifically.
- 2026-08-30 — Phase 3 — Verified live: register candidate → 201 with a
  linked `Candidate` row confirmed in Postgres; register recruiter → 201
  with no candidate row; duplicate email → 409; wrong password → 401;
  malformed JSON body → 400; `/me` with a valid token → 200 own profile;
  `/me` without a token → 401. 19/19 `bun test` passing,
  `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 4 — Built job management end to end: `POST /jobs`
  (default 6-stage pipeline or a custom one), `PATCH /jobs/:jobId`,
  `POST /jobs/:jobId/publish`, `POST /jobs/:jobId/close`, `GET /jobs`,
  `GET /jobs/:jobId`, `POST /jobs/:jobId/stages`, `PATCH
  /jobs/:jobId/stages/:stageId`. `JobRepository` → `JobService` →
  `JobController`, same layering as auth.
- 2026-08-30 — Phase 4 — Decided against a hard-delete endpoint for
  jobs — `Application.jobId` cascades on delete, so deleting a job would
  silently wipe out candidate applications. "Archive" is a status
  transition to `CLOSED` instead. Also skipped a stage
  reorder/delete endpoint — not in the task list, and deleting a stage
  an application might reference is exactly what the schema's
  `onDelete: Restrict` is meant to prevent.
- 2026-08-30 — Phase 4 — Job visibility rule: every route requires
  authentication (no public browsing), and a non-owning viewer gets 404
  rather than 403 for a non-published job, so recruiters can't probe for
  the existence of each other's drafts.
- 2026-08-30 — Phase 4 — Verified live end to end: candidate blocked
  from `POST /jobs` (403), recruiter creates a job with default stages,
  candidate gets 404 on the draft, candidate's `GET /jobs` excludes it,
  recruiter publishes it, candidate then sees it (200). 30/30 `bun test`
  passing, `bunx tsc --noEmit` clean.
