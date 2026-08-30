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
