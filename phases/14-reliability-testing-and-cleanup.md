# Phase 14 — Reliability, Testing and Cleanup

[← Back to index](README.md)

## Goal

Make the backend reliable and understandable.

### Tasks

- [x] Review authentication boundaries. (every route in `app.ts` checked
      by hand: all except `/health`, `/auth/register`, `/auth/login`
      require `requireAuth`/`requireRole` — no gaps found)
- [x] Review authorization boundaries. (ownership pattern re-verified
      across Job/Application/Interview/Dashboard: consistent
      "404 on read, 403 on confirmed-but-not-owned write" convention,
      no exceptions found)
- [x] Review database constraints. (found and fixed a real gap — see
      Architecture Note)
- [x] Review transaction boundaries. (confirmed `$transaction` is used
      exactly where multi-row atomicity matters — `User`+`Candidate`,
      `Application`+`ApplicationStageHistory`(+`AuditLog`) — and
      nowhere else needs it; nested Prisma creates like
      `Job`+`JobStage[]` are already atomic as a single call)
- [x] Review state-machine enforcement. (confirmed no route accepts a
      raw `status`/`currentStageId` field that could bypass
      publish/close, schedule/reschedule/cancel/complete, or
      move-stage)
- [x] Review worker idempotency. (already tested extensively in
      Phases 8-10; re-confirmed the "skip if already done, but not if
      merely in-progress" pattern is consistent across all three
      workers)
- [x] Review retry behavior. (already verified against real Redis in
      Phase 8/9; re-confirmed the `UnrecoverableError` fix from Phase 9
      is still correct)
- [x] Review external service failures. (Redis/MinIO/OpenRouter
      failures all degrade gracefully per their phase's documented
      design — re-confirmed, no gaps found)
- [x] Review LLM failure handling. (re-confirmed the "no key → still
      functional, degraded" pattern from Phase 9/10 is consistent)
- [x] Review error handling. (only one raw `throw new Error` outside
      workers/LLM clients, in `config/env.ts` — correct, since that's a
      pre-HTTP startup failure)
- [x] Review logging. (no stray `console.*` calls anywhere — everything
      goes through the shared structured `logger`)
- [x] Remove dead code. (none found — every file is imported somewhere,
      including the ambient `mammoth.d.ts` which TypeScript picks up
      implicitly)
- [x] Remove unnecessary abstractions. (none found)
- [x] Improve unclear names. (none found — `processXJob` naming is
      specific, not generic)
- [x] Add missing important tests. (added a regression test for the
      new `(candidateId, fileHash)` constraint's race-condition
      fallback path)
- [x] Run complete test suite. (125/125 passing)
- [x] Run TypeScript checks. (both workspaces clean)
- [x] Run linting if configured. (no linter is configured anywhere in
      the monorepo — nothing to run)
- [x] Verify environment configuration. (`config/env.ts`'s variables
      cross-checked field-by-field against `.env.example` — exact
      match)
- [x] Review README. (rewritten with a full API overview, tradeoffs,
      known limitations, and future improvements — previously just
      setup instructions)
- [x] Update architecture documentation where implementation differs
      intentionally. (added Implementation Note sections to
      `state-machine.md`, `data-model.md`, `resume-processing.md`,
      `ranking.md`, `dashboard.md`, `background-jobs.md`,
      `api-design.md`, and `principles.md`)

### Architecture Note

**Found and fixed a real database-constraint gap.** `Resume`'s
duplicate-file check (`candidateId` + `fileHash`) was application-level
only — no DB constraint backed it, unlike every other duplicate check
in this codebase (`User.email`, `Candidate.phone`,
`Application(candidateId, jobId)`, `InterviewScorecard.interviewId`).
Added `@@unique([candidateId, fileHash])` on `Resume` (migration
`20260830064353_add_resume_candidate_hash_unique`), dropped the
now-redundant standalone `candidateId` index (the compound unique index
already serves candidateId-prefixed lookups), and added the same
pre-check-plus-DB-constraint-fallback pattern to
`ResumeService.uploadResume` that every other duplicate check already
uses. Checked for existing duplicate rows before migrating (none) and
verified live that the constraint is enforced.

**Investigated, not fixed: a benign `pg` deprecation warning** that can
appear in the worker's startup logs. Confirmed `@prisma/adapter-pg`
uses a real connection pool (not a shared single client), and
deliberately reproducing concurrent load against the Prisma client
directly did not reproduce it. See the root
[README.md](../README.md#known-limitations) for the full writeup —
documented as a known, non-blocking timing quirk rather than something
requiring a fix.

### Verification

- [x] Clean install works.
- [x] Database setup works (migration applied cleanly, verified live).
- [x] Redis setup works.
- [x] Backend starts.
- [x] Workers start.
- [x] Tests pass (125/125).
- [x] TypeScript passes (both workspaces).
- [x] Documentation matches implementation (README rewritten;
      architecture docs annotated with implementation notes wherever
      the actual build made a judgment call worth recording).

### Addendum: `apps/backend/src` restructure

After this phase (and Phase 16) were complete, the user requested a
folder restructure of `apps/backend` (a specific target tree), with an
explicit instruction to keep all code behavior unchanged — files moved
and were renamed, imports were updated to match, but no logic changed.

**Before:** a flat `src/{auth,candidates,jobs,applications,interviews,
notifications,dashboard,ranking,queue,workers,shared,database,config,
health}/` layout, with resume-related files living inside `candidates/`
and tests colocated next to their source files as `*.test.ts`.

**After:** `src/modules/{auth,candidates,resumes,jobs,applications,
interviews,notifications,ranking,dashboard,health}/` for domain logic;
`resumes/` split out of `candidates/` as its own module; `queue/` split
into `queues/` (`queue.service.ts`, `resume.queue.ts`, `ranking.queue.ts`,
`notification.queue.ts` — each queue now owns its job-data type and
queue-name constant, sharing one Redis connection and `defaultJobOptions`
via `queue.service.ts` so behavior didn't change) plus
`infrastructure/redis/`; `shared/http/` split into `middleware/`
(`error.middleware.ts`), `shared/errors/`, `shared/types/`; `shared/llm/`
and `shared/storage/` moved to `infrastructure/`; workers renamed to
kebab-case (`resume-parser.worker.ts`, `application-ranking.worker.ts`,
`notification.worker.ts`); tests moved to a top-level `tests/` directory
mirroring `src/modules/`, with matching renames.

Two deliberate deviations from the requested tree, both to honor "keep
the code the same" over matching file names exactly:

- **No barrel `index.ts` files.** The target tree listed one per
  module, but adding them would mean introducing a new re-export
  surface that didn't exist before — additive code, not a pure move.
- **`ranking/` keeps `deterministicScore.ts` and
  `candidateJobMatcher.ts` as separate files**, not merged into one
  `ranking.service.ts` — they're independent units (one always runs,
  one only runs when an OpenRouter key is configured), and merging them
  would mean restructuring code, not just relocating it.

Also added, per explicit user decisions made while scoping this
restructure: `docker-compose.yml` at the repo root (Postgres/Redis/
MinIO, matching the existing per-workspace `.env.example` values) and
[docs/api.md](../docs/api.md) (a dedicated per-endpoint API reference).
The two per-workspace `.env.example` files and the existing
`architecture/`/`phases/` documentation structure were kept as-is
rather than consolidated, since CLAUDE.md's own rules reference them by
name.

Verified after the restructure: `bunx tsc --noEmit` clean on both
`src` and `tests`, 125/125 `bun test` passing, and a live `bun run
start` / `bun run worker` / `GET /health` / login smoke test all
succeeded unchanged.
