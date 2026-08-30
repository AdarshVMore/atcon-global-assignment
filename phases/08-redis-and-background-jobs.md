# Phase 8 — Redis and Background Jobs

[← Back to index](README.md)

## Goal

Introduce asynchronous job processing. See
[architecture/background-jobs.md](../architecture/background-jobs.md).

### Tasks

- [x] Configure Redis. (local Homebrew `redis`, `REDIS_URL` in config)
- [x] Choose and configure the queue implementation. (BullMQ — see
      Architecture Note)
- [x] Create queue abstraction. (`queue/queues.ts` — three named
      `Queue` instances sharing one Redis connection and
      `defaultJobOptions`)
- [x] Create worker abstraction. (`queue/createWorker.ts` — wraps
      `bullmq.Worker` with standardized completed/failed logging and an
      `onFinalFailure` hook)
- [x] Configure retries. (`attempts: 5`, exponential backoff, `delay:
      2000`)
- [x] Configure failed-job handling. (`removeOnFail` retention;
      `onFinalFailure` hook fires once all attempts are exhausted —
      distinguished from a per-attempt failure via `job.attemptsMade`)
- [x] Add worker logging. (structured log line per completed job, per
      failed attempt, and per final failure)
- [x] Create `resume.parse` queue. (wired to the real upload flow — see
      below)
- [x] Create `application.rank` queue. (queue exists; not enqueued
      into yet — that's Phase 10's explicit task)
- [x] Create `notification.send` queue. (queue exists; not enqueued
      into yet — that's Phase 12's explicit task)
- [x] Verify API can enqueue jobs. (verified live: resume upload
      enqueues a real job)
- [x] Verify workers consume jobs. (verified live with the worker
      running as a separate process)
- [x] Verify retry behavior. (`createWorker.test.ts` — real BullMQ +
      real local Redis, not mocked; asserts `attemptsMade` and that
      `onFinalFailure` fires exactly once, only after exhausting
      attempts)
- [x] Document how to run workers locally. (root README — `bun run
      worker` from `apps/backend`, separate from `bun run dev`)

### Architecture Note

**BullMQ, not a hand-rolled queue on raw Redis.** Same reasoning as
choosing `jose` over hand-rolled JWT in Phase 3: retry/backoff/
dead-letter semantics are easy to get subtly wrong, and this is
precisely the area the assignment calls out as a reliability concern.
BullMQ is the standard Redis-backed queue for this stack and gets that
correctness for free. It needs `ioredis` (added as a direct dependency,
not left as a transitive one) — the general "use `Bun.redis`, not
`ioredis`" guidance is for simple direct key-value operations, not for
a queue library that has its own driver requirement.

**Phase 8 vs. Phase 9/10/12.** All three queues exist now, but only
`resume.parse` is wired into a real business flow — the other two
explicitly belong to later phases (Phase 10: "Trigger ranking after
application creation"; Phase 12: "Queue notification jobs"). Wiring
them now would preempt tasks those phases own.

**`resumeParse.worker.ts` is a mechanical placeholder, not a shortcut.**
It proves the full contract — enqueue on upload, `UPLOADED` →
`PROCESSING` → `PARSED`/`FAILED`, idempotent against redelivery, retry
with backoff, terminal-failure handling — without doing real text
extraction or calling OpenRouter. Phase 9 replaces the middle of the
processor with real parsing logic; the surrounding contract (status
lifecycle, idempotency, retry, final-failure handling) doesn't change.

**Idempotency.** The processor returns early if the resume is already
`PARSED` (a previous delivery of the same job already finished it) or
missing (deleted). It does *not* skip when the status is already
`PROCESSING` — a crash mid-processing on attempt 1 must still let
attempt 2 actually do the work, or the resume would be stuck in
`PROCESSING` forever. Re-setting status to `PROCESSING` and then
`PARSED` again is safe since nothing else happens between those two
writes yet; Phase 9 needs to keep that same property once it adds real
side effects (the LLM call itself should be safe to repeat, or its
result should be applied idempotently).

**Enqueue failure doesn't fail the upload.** `ResumeService.uploadResume`
already durably wrote the file to MinIO and the metadata to Postgres by
the time it tries to enqueue — a Redis outage delays parsing, it
shouldn't undo a successful upload. The failure is caught and logged
(`bun test` covers this).

### Verification

- [x] API can enqueue jobs.
- [x] Workers consume jobs.
- [x] Failed jobs retry.
- [x] Duplicate execution is considered.
- [x] Redis is not used as business-state storage.
