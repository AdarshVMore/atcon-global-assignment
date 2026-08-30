# Principles, Technology & Layout

See [README.md](README.md) for the high-level diagram.

## Technology

**Backend:** Bun, TypeScript, REST API, class-oriented architecture.

**Database:** PostgreSQL, Prisma.

**Async Processing:** Redis, background workers.

**Files:** S3-compatible object storage. Local development can use MinIO or
another S3-compatible store.

**AI / LLM:** OpenRouter SDK, cost-effective models by default.

**Future Frontend:** Next.js — intentionally deferred.

**Optional Realtime Interviews:** LiveKit — intentionally the final
optional implementation phase.

## Backend Layering

Synchronous request flow:

```
Controller → Service → Repository → Prisma → PostgreSQL
```

Asynchronous flow:

```
Service → Queue → Worker → Service / Repository → PostgreSQL
```

Controllers handle HTTP concerns. Services hold business logic.
Repositories hold persistence logic. Workers hold asynchronous processing.
Avoid excessive abstraction beyond these four roles.

## Suggested Monorepo Layout

```
apps/
  backend/
    src/
      auth/
      candidates/
      jobs/
      applications/
      interviews/
      notifications/
      dashboard/
      resume-processing/
      ranking/
      shared/
      config/
      database/
      server.ts

packages/
  database/
  shared/

architecture/
phases/
progress.md

CLAUDE.md
README.md
```

The exact structure can evolve if a simpler one is clearer. Do not create
packages merely for the sake of having a monorepo.

**Implementation note:** the actual `apps/backend/src` layout is
`modules/{auth,candidates,resumes,jobs,applications,interviews,
notifications,ranking,dashboard,health}/` for domain logic, plus
`workers/` (job processors), `queues/` (queue definitions and the
worker-creation service), `infrastructure/` (database, redis, storage,
llm clients), `middleware/` (cross-cutting HTTP concerns), `shared/`
(`errors/`, `types/`, `utils/`), and `config/`. Tests live in a
top-level `tests/` directory mirroring `src/modules/`, rather than
colocated with source files. `resumes/` is a module on its own,
separate from `candidates/` — resume upload, storage, text extraction,
and LLM extraction all live there. See
[phases/14-reliability-testing-and-cleanup.md](../phases/14-reliability-testing-and-cleanup.md)
for the earlier, flatter layout this was reorganized from, and
[README.md](../README.md#monorepo-layout) for the current full tree.
No `packages/shared` was created — with only one app (`apps/backend`)
consuming it, there's nothing to share yet; see
[phases/00-repository-and-architecture-foundation.md](../phases/00-repository-and-architecture-foundation.md).

## Data Ownership

- **PostgreSQL owns:** User, Candidate, Job, Application, Pipeline State,
  Interview, Scorecard, Notifications, Audit History.
- **Object storage owns:** Resume files.
- **Redis owns:** Temporary job/queue state only.
- **OpenRouter provides:** LLM inference.
- **LiveKit provides:** Optional realtime interview infrastructure.

## Important Architectural Principles

1. **Business state first** — persist important business state before
   triggering secondary processing.
2. **Async side effects** — expensive or failure-prone work should not
   unnecessarily block the request.
3. **Simple domain model** — use understandable entities and
   relationships.
4. **Explicit state transitions** — do not treat the application pipeline
   as arbitrary CRUD.
5. **PostgreSQL is authoritative** — do not put business truth in Redis.
6. **AI is a tool, not the architecture** — use LLMs where they add value,
   not everywhere.
7. **Cost-conscious AI** — use OpenRouter and cheaper models where
   sufficient.
8. **Practicality** — do not add infrastructure simply because it looks
   impressive.
9. **Explainability** — every major architectural decision should have a
   reason that can be explained in an interview.
10. **Assignment-first development** — required functionality takes
    priority over optional sophistication.

## Deliberately Not Building

Unless time or requirements justify them: microservices, Kubernetes,
Kafka, event sourcing, CQRS infrastructure, multiple databases, complex
distributed systems, an advanced observability platform, enterprise
dependency injection, ML-heavy duplicate detection, custom video
infrastructure, a separate analytics warehouse, or complex recommendation
infrastructure.

The goal is a strong, understandable implementation.
