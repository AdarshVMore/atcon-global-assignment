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
