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
- 2026-08-30 — Phase 5 — Set up local object storage: MinIO via Docker
  (`atcon-minio` container) plus the `mc` CLI (Homebrew) to create the
  `ats-resumes` bucket. Used Bun's built-in `Bun.S3Client` instead of an
  AWS SDK — one less dependency, and it's S3-compatible so MinIO now
  and real S3/R2 later both work through the same code by changing env
  vars.
- 2026-08-30 — Phase 5 — Built `GET/PATCH /candidates/me` and
  `POST/GET /candidates/me/resumes`. Used `/candidates/me` rather than
  the `/candidates/:candidateId` shape in api-design.md's examples,
  since nothing currently hands a candidate their own `candidateId` —
  same self-resource pattern as `GET /me` from Phase 3. Noted in the
  phase file that recruiter read access to a candidate profile will
  likely route through `GET /applications/:id` in Phase 6 instead of an
  open `/candidates/:id`.
- 2026-08-30 — Phase 5 — Resume upload computes the SHA-256 hash and
  checks for a same-candidate duplicate *before* writing to storage (no
  wasted upload on a rejected duplicate); for a genuinely new file,
  storage write happens before the DB row, and the object gets deleted
  if the DB insert then fails. Cross-candidate hash matching and fuzzy
  matching (architecture doc's Level 3, explicitly "if time allows")
  are documented as not yet implemented, not silently skipped.
- 2026-08-30 — Phase 5 — Caught a real bug before calling this done:
  `GET /candidates/me` was returning the full Prisma `User` record
  including `passwordHash` in the response. Added a `CandidateProfile`
  mapper (mirrors `toPublicUser` from auth) and confirmed live that the
  hash no longer appears in the response.
- 2026-08-30 — Phase 5 — Verified live: candidate profile get/update,
  phone format validation, resume upload with a real file landing in
  the MinIO bucket (confirmed via `mc ls`) and its metadata row in
  Postgres, duplicate re-upload → 409, wrong file type → 400, recruiter
  blocked from candidate routes → 403. 40/40 `bun test` passing,
  `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 6 — Built `POST /jobs/:jobId/applications`,
  `GET /applications` (role-branched, recruiter gets an optional
  `?jobId=` filter), and `GET /applications/:applicationId`.
  `Application` + its initial `ApplicationStageHistory` row are created
  together in one `prisma.$transaction` — state-machine.md's "stage
  history must not be silently bypassed" rule applies to the very
  first stage assignment too, not just later transitions.
- 2026-08-30 — Phase 6 — Made `resumeId` required to apply (schema
  keeps it nullable — cheap flexibility — but the business rule that
  you need a submitted resume to apply lives in `ApplicationService`,
  not the database). Applying picks the job's lowest-`order` stage
  automatically.
- 2026-08-30 — Phase 6 — Duplicate-candidate detection at this layer is
  mostly already covered by Phase 1/3's global `User.email` and
  `Candidate.phone` uniqueness; what's new here is duplicate-application
  prevention (pre-check plus a DB-constraint fallback for races).
  Documented in the phase file that cross-candidate resume-hash matches
  still aren't surfaced anywhere — a known gap carried over from Phase
  5, not something this phase changes.
- 2026-08-30 — Phase 6 — Verified live end to end: apply without a
  resumeId → 400, apply with one → 201 with both the `Application` and
  its stage-history row present in the response, re-apply → 409,
  candidate and the owning recruiter can both view/list it, ownership
  enforced in tests for the non-owning cases. 50/50 `bun test` passing,
  `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 7 — Built the stage-transition rule as a generic
  function (`applications/pipeline.ts`) instead of hardcoding specific
  stage names, since stages are configurable per job: advance to the
  immediate next stage by `order`, or jump straight to any terminal
  stage (covers rejection — or a fast-tracked hire — from anywhere);
  nothing moves once terminal, no regressing to an earlier stage.
- 2026-08-30 — Phase 7 — `PATCH /applications/:applicationId/stage`
  writes the `Application` update, the new `ApplicationStageHistory`
  row, and an `AuditLog` row (`APPLICATION_STAGE_CHANGED`) all in one
  `prisma.$transaction`. This is the first real use of the `AuditLog`
  table from Phase 1 — proves the general audit mechanism works on the
  one action `state-machine.md` calls out by name, rather than leaving
  that table unused through the whole assignment.
- 2026-08-30 — Phase 7 — Added `GET /applications/:applicationId/history`
  (in api-design.md's examples, one-line addition since `stageHistory`
  was already loaded on every application fetch).
- 2026-08-30 — Phase 7 — Verified live end to end: candidate blocked
  from moving stages (403), skip-ahead rejected (400), valid
  Applied → Screening move succeeds with history + audit log entries
  (confirmed via `psql`), jump straight to a terminal stage succeeds,
  any further move after that is rejected (409). 61/61 `bun test`
  passing, `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 8 — Chose BullMQ over hand-rolling a queue on raw
  Redis — retry/backoff/dead-letter semantics are exactly the kind of
  thing worth getting from a well-tested library rather than
  reinventing, same call as `jose` for JWT back in Phase 3. Added
  `ioredis` as a direct dependency since BullMQ needs it and the app
  imports it directly.
- 2026-08-30 — Phase 8 — Built `queue/queues.ts` (three named queues:
  `resume.parse`, `application.rank`, `notification.send`, one shared
  Redis connection, 5 attempts with exponential backoff by default) and
  `queue/createWorker.ts` (wraps `bullmq.Worker` with structured
  completed/failed logging and an `onFinalFailure` hook that only fires
  once all retry attempts are actually exhausted).
- 2026-08-30 — Phase 8 — Only wired `resume.parse` into a real flow
  (`ResumeService.uploadResume` now enqueues after the DB/storage writes
  succeed, and doesn't fail the upload if enqueueing itself fails).
  Left `application.rank` and `notification.send` unwired on purpose —
  Phase 10 and Phase 12 each explicitly own triggering their own queue.
- 2026-08-30 — Phase 8 — `resumeParse.worker.ts` is a deliberate
  mechanical placeholder: it does the real `UPLOADED → PROCESSING →
  PARSED/FAILED` lifecycle, is idempotent against redelivery (skips if
  already `PARSED`, but *not* if `PROCESSING` — otherwise a crash
  mid-attempt would strand it there forever), and hooks into retry/
  final-failure — but doesn't do real text extraction or call
  OpenRouter yet. That's Phase 9, replacing only the middle of the
  processor.
- 2026-08-30 — Phase 8 — Verified retry behavior against the real local
  Redis instance, not mocked (`queue/createWorker.test.ts`): a job that
  fails twice then succeeds shows `attemptsMade: 3`; a job that always
  fails triggers `onFinalFailure` exactly once, only after exhausting
  its configured attempts.
- 2026-08-30 — Phase 8 — Verified live end to end with the API and a
  worker running as genuinely separate processes: resume upload
  returned immediately with status `UPLOADED`, and the worker process
  independently moved it to `PARSED` in Postgres shortly after. 65/65
  `bun test` passing, `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 9 — Asked whether to wait for a real OpenRouter
  API key before building resume parsing; told to proceed without one.
  Built the full integration (real `openai` SDK pointed at OpenRouter's
  OpenAI-compatible endpoint — no separate "OpenRouter SDK" package
  exists; the one OpenRouter-branded npm package is a Vercel `ai` SDK
  provider, much heavier than needed for one JSON completion call) and
  tested everything mockable. The live network call itself is the one
  thing not verified here — documented plainly in the phase file rather
  than glossed over.
- 2026-08-30 — Phase 9 — Real text extraction: `pdf-parse` for PDF,
  `mammoth` for DOCX. Legacy `.doc` is explicitly unsupported (mammoth
  doesn't handle it, and a proper legacy-binary parser is too heavy a
  dependency for a format candidates rarely use) — uploads still
  succeed, only parsing fails, cleanly.
- 2026-08-30 — Phase 9 — Built real fixtures instead of mocking text
  extraction: a hand-crafted minimal valid PDF (worked first try
  against `pdf-parse`/pdf.js's lenient parser) and a docx built via
  Python's `zipfile` module (`[Content_Types].xml` + `_rels/.rels` +
  `word/document.xml`) since no docx-generation library was already in
  the project. Both actually parse for real in tests, not mocked.
- 2026-08-30 — Phase 9 — No API key configured → resume still ends up
  `PARSED` with `parsedData.structured: null`, not `FAILED` — text
  extraction genuinely succeeded and is useful on its own (Phase 10's
  ranking can fall back to deterministic matching). Once an LLM call is
  actually attempted, though, its failure fails the whole job rather
  than trying to preserve the already-extracted text across retries —
  a deliberate scope simplification, documented as such.
- 2026-08-30 — Phase 9 — Extended `createWorker` to recognize BullMQ's
  `UnrecoverableError` so a permanently-unparseable format (legacy
  `.doc`) fails immediately instead of burning through 5 retries for a
  guaranteed-repeat failure.
- 2026-08-30 — Phase 9 — Caught a real bug via the test I wrote for the
  above: the existing "is this the final attempt" check only compared
  `job.attemptsMade` against the configured `attempts`, which is never
  true for an `UnrecoverableError` (it stops after attempt 1
  regardless) — so `onFinalFailure` would never have fired, and an
  unsupported-format resume would have stayed `PROCESSING` forever.
  Fixed by also checking `error instanceof UnrecoverableError`, proven
  by the failing test turning green.
- 2026-08-30 — Phase 9 — Verified live, twice: a real PDF through the
  full pipeline with no LLM key configured (`PARSED`, real extracted
  text, `structured: null`); a legacy `.doc` upload (`FAILED`
  immediately, one attempt, clear `parseError`, file and DB row
  untouched otherwise). 82/82 `bun test` passing, `bunx tsc --noEmit`
  clean.
- 2026-08-30 — Phase 10 — Built candidate/job ranking:
  `ranking/deterministicScore.ts` (keyword overlap, always computed)
  and `ranking/candidateJobMatcher.ts` (LLM semantic score, only when
  `OPENROUTER_API_KEY` is set — same key gap as Phase 9, unit-tested
  with a fake client, not live-verified against the real API).
  `ApplicationService.applyToJob` now enqueues an `application.rank`
  job after the `Application` commits, same non-blocking pattern as the
  Phase 8 resume enqueue.
- 2026-08-30 — Phase 10 — Reused `OPENROUTER_MODEL` from Phase 9 rather
  than adding a second ranking-specific model env var — same
  underlying "cheap model by default, configurable" concern, no stated
  need for the two features to use different models.
- 2026-08-30 — Phase 10 — The deterministic score is always computed
  regardless of LLM availability; when an LLM score is available it
  becomes the stored `rankingScore`, but the deterministic result stays
  in `rankingExplanation` alongside it so the signal isn't lost either
  way. A resume that hasn't finished parsing yet degrades to an empty
  candidate signal (low/zero score) instead of crashing the job — the
  resume-parse and application-rank queues are independent, so that
  race is possible in principle, if unlikely in practice.
- 2026-08-30 — Phase 10 — Hit a rough edge live-testing: applying with
  a resume left over from earlier Phase 8 testing (processed by the old
  placeholder worker, which never wrote `parsedData`) correctly scored
  0 — not a bug, just stale test data from iterating across phases in
  the same dev database. Re-verified with a freshly uploaded resume
  through the real Phase 9 parser and got a real positive score with
  actual matched keywords, confirming the logic itself is correct.
  96/96 `bun test` passing, `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 11 — Built interview scheduling and structured
  scorecards: `POST /applications/:applicationId/interviews`, `GET
  /applications/:applicationId/interviews`, `GET/PATCH
  /interviews/:interviewId`, `/reschedule`, `/cancel`, `/complete`
  (each a dedicated action, same explicit-transition pattern as Job
  status in Phase 4 — not arbitrary `PATCH status=`), and `POST
  /interviews/:interviewId/scorecard`.
- 2026-08-30 — Phase 11 — Ownership model: only the recruiter who owns
  the job can schedule/edit/reschedule/cancel/complete/score an
  interview — `interviewerId` is descriptive metadata, not an access
  boundary. Kept this consistent with how Job and Application ownership
  already work rather than inventing a separate "interviewer
  permission" tier with no other precedent in the codebase.
  Scorecards can only be submitted once an interview is `COMPLETED` —
  not explicitly required, but a natural reading of the lifecycle
  (feedback about an interview that hasn't happened doesn't make
  sense).
  Score fields (technical/communication/problemSolving) are validated
  1-5 in the service, not the schema — same "boundary validation lives
  where the request enters, not in a new dependency" approach as
  everywhere else.
- 2026-08-30 — Phase 11 — Verified live end to end: candidate blocked
  from scheduling (403), scorecard blocked before completion (409),
  interview completed, scorecard accepted (201), duplicate scorecard
  rejected (409), candidate can view their own interview and its
  scorecard. 113/113 `bun test` passing, `bunx tsc --noEmit` clean.
- 2026-08-30 — Phase 12 — Built notifications on the existing
  `NotificationType` enum from Phase 1 (no schema change needed):
  `notifications/notification.service.ts` (`notifyAsync` for other
  services to trigger one, `listForUser`/`markAsRead` for the API),
  `workers/notificationSend.worker.ts`, and `EmailSender` /
  `ConsoleEmailSender` — logs instead of sending since no SMTP/email
  provider is configured here, same category of gap as the OpenRouter
  key from Phase 9, lower stakes since nothing grades actual delivery.
- 2026-08-30 — Phase 12 — Unlike the resume/ranking queues, the
  `notification.send` job carries the full notification content
  (`{userId, type, title, message}`), not a reference to an
  already-persisted row — the row doesn't exist until the worker
  creates it, since a notification is pure side effect of an event
  that already committed on its own.
- 2026-08-30 — Phase 12 — `ApplicationService` and `InterviewService`
  now depend on `NotificationService` directly — the one
  service-to-service dependency in this codebase. Deliberately
  different from the case I avoided in Phase 11 (reusing another
  module's *authorization* logic, where read/write semantics didn't
  line up) — this is just "trigger a side effect in another module,"
  a much more standard use of the pattern.
- 2026-08-30 — Phase 12 — Documented, not silently accepted: notification
  delivery isn't redelivery-idempotent (a rare BullMQ redelivery could
  double-create an in-app notification), and `INTERVIEW_COMPLETED` has
  no notification since the enum has no matching value and adding one
  isn't worth a migration for this phase alone.
- 2026-08-30 — Phase 12 — Verified live end to end: applying triggers
  `APPLICATION_RECEIVED` for the recruiter, moving a stage triggers
  `APPLICATION_STAGE_CHANGED` for the candidate, both landing as
  in-app `Notification` rows with the "email" logged by
  `ConsoleEmailSender`; a recruiter is blocked (403) from marking a
  candidate's notification read, the candidate can (200). 120/120
  `bun test` passing, `bunx tsc --noEmit` clean.
