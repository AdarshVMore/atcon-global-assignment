# ATS / Recruitment Platform

A lightweight Applicant Tracking System built for the Full Stack Developer
case study. Candidates create profiles, upload resumes, and apply to jobs;
recruiters post jobs with configurable hiring pipelines, move applicants
through stages, schedule interviews, submit structured scorecards, and
view pipeline analytics. Resume parsing and candidate/job ranking run
asynchronously via OpenRouter; notifications go out for key events.

This assignment is intentionally lightweight, not production-scale — it
demonstrates backend engineering quality rather than infrastructure
complexity. See [architecture/README.md](architecture/README.md) for
design decisions and [phases/README.md](phases/README.md) for
implementation progress.

## Status

Backend complete (Phases 0–14 of [phases/](phases/README.md)). LiveKit
was evaluated and deliberately deferred, not skipped —see
[phases/15-livekit.md](phases/15-livekit.md) for the reasoning. Frontend
was out of scope for this engagement from the start (see
[CLAUDE.md](CLAUDE.md#current-scope)).

## Tech Stack

- **Runtime:** Bun + TypeScript
- **Database:** PostgreSQL via Prisma (driver adapter: `@prisma/adapter-pg`)
- **Queue:** Redis via BullMQ
- **Object storage:** S3-compatible (MinIO for local dev), via Bun's
  built-in `Bun.S3Client`
- **Auth:** JWT (`jose`), passwords hashed with `Bun.password` (argon2id)
- **LLM:** OpenRouter, via the `openai` SDK pointed at OpenRouter's
  OpenAI-compatible endpoint
- **Resume text extraction:** `pdf-parse` (PDF), `mammoth` (DOCX)

## Technical Overview

**Architecture.** A modular monolith, not microservices — one deployable
backend with clearly separated domain modules (`auth`, `jobs`,
`candidates`, `applications`, `interviews`, `notifications`,
`dashboard`, `ranking`), each following the same
Controller → Service → Repository → Prisma → PostgreSQL shape for
synchronous work, and Service → Queue → Worker → Repository → PostgreSQL
for asynchronous work (resume parsing, ranking, notifications). See
[architecture/README.md](architecture/README.md) for the full diagram
and per-concern design docs. The database is the single source of
truth; Redis holds only transient queue state, never business data.

**Why these tools.** Each dependency was picked for a specific,
narrow reason rather than by default — documented inline where it
mattered: BullMQ over hand-rolling a queue on raw Redis (retry/backoff
correctness is easy to get subtly wrong); the official `openai` SDK
over a dedicated "OpenRouter SDK" (OpenRouter's API is OpenAI-compatible,
and the only OpenRouter-branded npm package is a much heavier Vercel
`ai` SDK provider); `jose` over hand-rolled JWT (signature verification
is exactly the kind of thing worth getting from a small, well-audited
library); Bun's built-in `S3Client`/`password`/`CryptoHasher` wherever
they cover the need, instead of pulling in AWS SDKs or bcrypt. See each
phase's own file under [phases/](phases/README.md) for the full
reasoning behind its specific choices.

**System design approach.** Built and verified phase by phase, in
dependency order (schema → auth → jobs → candidates → applications →
pipeline → background jobs → resume parsing → ranking → interviews →
notifications → dashboard → reliability review), with every phase
live-tested against real running infrastructure (real Postgres, real
Redis, real MinIO, real HTTP requests) before being marked complete —
not just unit tests against mocks. Business-critical paths (auth,
duplicate detection, stage transitions, worker idempotency/retry) have
targeted `bun test` coverage; deterministic logic is unit-tested, and
LLM-dependent code is tested against a fake client since no live
OpenRouter key was available while building this (see
[Known Limitations](#known-limitations)).

**Scalability considerations.** This is explicitly not built for
production scale, but the shape doesn't fight it either:
- The API and the background workers are already separate processes
  (`bun run dev` vs `bun run worker`) — the API layer and each queue's
  worker can each be scaled independently (more worker processes, more
  `concurrency` per `bullmq.Worker`) without code changes.
- Async side effects (resume parsing, ranking, notifications) never
  block a request — the request only ever waits on the synchronous
  business-state write, matching the architecture principle "persist
  business state before triggering secondary processing."
- PostgreSQL does the heavy aggregation work for the dashboard (Prisma
  query builder, which still executes as SQL) rather than pulling rows
  into the application to aggregate in memory, with one deliberate
  exception (averaging a handful of time-to-hire rows in JS, since a
  hand-written SQL aggregate would trade readability for no real
  benefit at this data scale).
- Resume files live in object storage, never in Postgres — the
  database stays small and query-fast regardless of how much resume
  content accumulates.
- The obvious next steps if this needed to scale further: read
  replicas for the dashboard's aggregate queries, moving `AuditLog`/
  `ApplicationStageHistory` to a cheaper cold-storage tier once they
  grow large, and horizontal worker scaling per queue based on actual
  queue depth. None of this was built — it would be premature
  optimization for a case study — but the module boundaries don't
  block it either.

## Monorepo Layout

```
apps/
  backend/
    src/
      auth/            candidates/       jobs/
      applications/     interviews/       notifications/
      dashboard/         ranking/          queue/
      workers/            shared/           config/
      database/            server.ts          worker.ts
packages/
  database/       # Prisma schema, migrations, seed, generated client
architecture/     # design docs
phases/           # implementation checklist and per-phase notes
progress.md       # running log of completed work
```

Each domain module under `apps/backend/src/` follows the same shape:
`*.repository.ts` (Prisma queries), `*.service.ts` (business logic,
authorization, validation), `*.controller.ts` (HTTP request/response),
plus `dto.ts`/`validation.ts` for request bodies. Async work lives in
`queue/` (queue/worker infrastructure) and `workers/` (the actual job
processors).

## Local Setup

Requires Bun, PostgreSQL, Redis, and an S3-compatible object store
(MinIO for local dev) running locally.

```bash
bun install
cp apps/backend/.env.example apps/backend/.env
cp packages/database/.env.example packages/database/.env
# fill in DATABASE_URL, REDIS_URL, JWT_SECRET, OPENROUTER_API_KEY, etc.

# MinIO for local resume storage (S3-compatible)
docker run -d --name atcon-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/ats-resumes
```

The `S3_*` variables in `apps/backend/.env.example` already match these
default MinIO credentials and bucket name.

## Running

```bash
cd packages/database
bunx prisma migrate dev   # create/apply a migration
bunx prisma db seed       # seed a recruiter, candidate, job, and application

cd ../../apps/backend
bun run dev               # start backend with hot reload
bun run worker            # start background workers (separate process)
bun test                  # run test suite
bunx tsc --noEmit         # TypeScript check
```

The API and the background workers are separate processes — `bun run dev`
never blocks a request on queue processing, and `bun run worker` can be
scaled or restarted independently. There are three queues: `resume.parse`,
`application.rank`, `notification.send`, all handled by the one worker
process (`bun run worker`), each with its own `bullmq.Worker` inside it.

## Environment Variables

See [apps/backend/.env.example](apps/backend/.env.example) for the full
list. Notes on the ones that aren't self-explanatory:

- `JWT_SECRET` / `JWT_EXPIRES_IN` — signs access tokens returned from
  `/auth/register` and `/auth/login`.
- `S3_*` — endpoint, region, bucket, and credentials for resume storage.
  Point these at any S3-compatible store (MinIO locally, real S3/R2/Spaces
  in another environment) — the code doesn't change.
- `OPENROUTER_API_KEY` — **optional**. Without it, resume parsing and
  candidate/job ranking both still work using their deterministic
  fallback (see [Known Limitations](#known-limitations)); with it, both
  get LLM-backed enrichment on top.
- `OPENROUTER_MODEL` — defaults to `openai/gpt-4o-mini`; shared by resume
  parsing and ranking rather than having a separate setting for each.

## API Overview

All endpoints except `/health`, `/auth/register`, and `/auth/login`
require `Authorization: Bearer <token>`. Endpoints marked **(recruiter)**
or **(candidate)** additionally require that role.

```
POST   /auth/register                          register (candidate or recruiter)
POST   /auth/login                              log in
GET    /me                                      current user's profile

GET    /jobs                                    list jobs (own jobs if recruiter, published jobs otherwise)
POST   /jobs                                    create a job                              (recruiter)
GET    /jobs/:jobId                             get a job (published, or owned)
PATCH  /jobs/:jobId                             update title/description/requirements     (recruiter, owner)
POST   /jobs/:jobId/publish                     DRAFT -> PUBLISHED                         (recruiter, owner)
POST   /jobs/:jobId/close                       -> CLOSED (archive)                        (recruiter, owner)
POST   /jobs/:jobId/stages                      add a pipeline stage                       (recruiter, owner)
PATCH  /jobs/:jobId/stages/:stageId             rename / retoggle isTerminal               (recruiter, owner)

GET    /candidates/me                           own candidate profile                      (candidate)
PATCH  /candidates/me                           update phone                               (candidate)
GET    /candidates/me/resumes                   list own resumes                           (candidate)
POST   /candidates/me/resumes                   upload a resume (multipart/form-data)       (candidate)

POST   /jobs/:jobId/applications                apply to a published job                   (candidate)
GET    /applications                            list (own, or across owned jobs; ?jobId=)
GET    /applications/:applicationId             get one application
GET    /applications/:applicationId/history      stage-history for one application
PATCH  /applications/:applicationId/stage        move to another stage                      (recruiter, owner)

GET    /applications/:applicationId/interviews   list interviews for an application
POST   /applications/:applicationId/interviews   schedule an interview                      (recruiter, owner)
GET    /interviews/:interviewId                 get one interview
PATCH  /interviews/:interviewId                 update duration/meetingUrl/notes           (recruiter, owner)
POST   /interviews/:interviewId/reschedule       -> RESCHEDULED, new time                   (recruiter, owner)
POST   /interviews/:interviewId/cancel           -> CANCELLED                               (recruiter, owner)
POST   /interviews/:interviewId/complete         -> COMPLETED                               (recruiter, owner)
POST   /interviews/:interviewId/scorecard        submit a scorecard (once COMPLETED)        (recruiter, owner)

GET    /notifications                           own notifications
PATCH  /notifications/:notificationId/read       mark one as read

GET    /dashboard/overview                      pipeline metrics across own jobs            (recruiter)
GET    /jobs/:jobId/pipeline                    per-stage counts for one job                (recruiter, owner)
```

"Owner" above means the recruiter who created the job the resource
belongs to. A non-owner attempting to *view* something they don't own
gets `404` (existence isn't confirmed); a non-owner attempting to
*mutate* something whose existence they've otherwise confirmed
(e.g. found via a list they can see) gets `403`.

## Tradeoffs and Assumptions

Documented in more detail in each phase's own file under
[phases/](phases/README.md), and summarized here:

- **No separate `Recruiter` table.** `User.role` plus `Job.recruiterId ->
  User.id` is enough; a 1:1 join table would add nothing.
- **Job stage transitions are generic, not stage-name-aware.** From a
  non-terminal stage: advance to the immediate next stage by `order`, or
  jump to any terminal stage (covers rejection, or a fast-tracked hire,
  from anywhere). Nothing distinguishes a "success" terminal stage from
  a "failure" one at the schema level — see the dashboard's time-to-hire
  limitation below.
- **`resumeId` is required to apply**, even though the schema leaves it
  nullable — the business rule lives in `ApplicationService`, not the
  database, since applying without ever having submitted a resume
  doesn't match realistic ATS behavior.
- **Interview ownership = job ownership.** `interviewerId` is descriptive
  metadata (who's actually conducting it), not a separate access-control
  tier — only the recruiter who owns the job can manage an interview or
  submit its scorecard.
- **Scorecards require `COMPLETED` first** and are limited to a 1-5 score
  range per criterion — neither is explicitly required by the task list,
  but both give the interview lifecycle and scorecard real meaning.
- **`NotificationService` is the one service-to-service dependency** in
  the codebase (`ApplicationService`/`InterviewService` depend on it to
  fire notifications). Every other cross-module dependency is
  repository-to-repository.
- **Notification delivery isn't redelivery-idempotent.** A rare BullMQ
  redelivery could double-create an in-app notification — accepted as a
  low-stakes tradeoff (annoying, never state-corrupting) rather than
  building real dedup for it.

## Known Limitations

- **No OpenRouter API key was available while building this** (see
  [phases/09-resume-parser-worker.md](phases/09-resume-parser-worker.md)
  and [phases/10-candidate-ranking.md](phases/10-candidate-ranking.md)).
  Both the resume-parsing LLM call and the ranking LLM call are real,
  complete code, unit-tested against a fake OpenAI client — but the
  actual network call to OpenRouter has not been exercised live. Add a
  key to `apps/backend/.env` to do that.
- **No SMTP/email provider is configured.** `EmailSender` is a real
  interface; `ConsoleEmailSender` (the only implementation right now)
  logs what would be sent instead of sending it. Swapping in a real
  provider means implementing that one interface — no caller changes.
- **Time-to-hire depends on a stage literally named "Hired"**
  (case-insensitive), not a schema flag, because `JobStage.isTerminal`
  doesn't distinguish a successful hire from a rejection — stages are
  configurable per job, so there's no structural way to know which
  terminal stage is which. Works with Phase 4's default pipeline naming;
  a job whose recruiter renamed that stage wouldn't be counted.
- **Duplicate-candidate detection is deterministic only** (unique
  `User.email`, unique `Candidate.phone`, unique
  `(candidateId, fileHash)` on resumes). Cross-candidate signals — two
  different accounts uploading the identical resume file, for instance —
  aren't surfaced anywhere. Fuzzy/similarity matching
  (`resume-processing.md`'s "Level 3", explicitly optional) hasn't been
  built.
- **Legacy `.doc` files are accepted for upload but not parsed.**
  `mammoth` only handles `.docx`; a real legacy-binary parser is a much
  heavier dependency than this assignment's scope justifies. The upload
  succeeds and the file is stored; parsing fails immediately and clearly
  (`FAILED`, a specific `parseError`) rather than silently.
- **No job-stage reorder or delete endpoint.** Stages can be appended and
  renamed, but not reordered or removed — reordering wasn't asked for,
  and deleting a stage an `Application.currentStageId` might reference is
  exactly what the schema's `onDelete: Restrict` is there to prevent.
- **A benign `pg` deprecation warning can appear in the worker's logs at
  startup** ("Calling client.query() when the client is already
  executing a query is deprecated"), when several queued jobs across
  multiple workers all run their first query right as the connection
  pool is warming up. Investigated: `@prisma/adapter-pg` uses a real
  `pg.Pool` (not a single shared client), and deliberately reproducing
  heavy concurrent load against the Prisma client directly did not
  reproduce it — the query that triggers it still completes correctly.
  Left as a known, non-blocking startup-timing quirk rather than a
  correctness issue worth chasing further.

## Future Improvements

- Real email delivery (swap `ConsoleEmailSender` for a provider).
- An explicit `outcome` field on `JobStage` (e.g.
  `SUCCESS`/`REJECTED`/`null`) so time-to-hire and similar metrics don't
  depend on stage naming.
- Redelivery-safe (idempotent) notification delivery, if duplicate
  in-app notifications turn out to matter more than expected.
- Cross-candidate and fuzzy duplicate-candidate detection.
- Job-stage reordering.
- The Next.js frontend and LiveKit realtime interviews — both explicitly
  deferred until the backend was complete (see
  [phases/15-livekit.md](phases/15-livekit.md) and
  [phases/16-final-assignment-preparation.md](phases/16-final-assignment-preparation.md)).

## Further Documentation

- [architecture/README.md](architecture/README.md) — architecture,
  domain model, state machine, auth, resume processing, ranking,
  background jobs, API design, dashboard.
- [phases/README.md](phases/README.md) — implementation checklist and
  phase-by-phase status, including an Architecture Note in most phase
  files explaining any non-obvious decision made in that phase.
- [progress.md](progress.md) — running log of completed work.
