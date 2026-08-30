# ATS / Recruitment Platform

A lightweight Applicant Tracking System built for the Full Stack Developer
case study. Covers job postings, candidate profiles, resumes, applications,
configurable hiring pipelines, interviews, structured scorecards,
notifications, and pipeline analytics.

This assignment is intentionally lightweight, not production-scale — it
demonstrates backend engineering quality rather than infrastructure
complexity. See [architecture/README.md](architecture/README.md) for design
decisions and [phases/README.md](phases/README.md) for implementation
progress.

## Status

Backend under active development. Frontend and LiveKit are deferred until
the backend is complete (see [CLAUDE.md](CLAUDE.md#current-scope)).

## Tech Stack

Bun, TypeScript, PostgreSQL, Prisma, Redis, REST API, background workers,
OpenRouter SDK for LLM calls.

## Monorepo Layout

```
apps/
  backend/       # REST API, background workers
packages/
  database/      # Prisma schema and client
architecture/     # design docs
phases/            # implementation checklist
```

## Local Setup

Requires Bun, PostgreSQL, and Redis running locally.

```bash
bun install
cp apps/backend/.env.example apps/backend/.env
cp packages/database/.env.example packages/database/.env
# fill in DATABASE_URL, REDIS_URL, JWT_SECRET, OPENROUTER_API_KEY, etc.
```

## Running

```bash
cd packages/database
bunx prisma migrate dev   # create/apply a migration
bunx prisma db seed       # seed a recruiter, candidate, job, and application

cd ../../apps/backend
bun run dev               # start backend with hot reload
bun test                  # run test suite
bunx tsc --noEmit         # TypeScript check
```

## Environment Variables

See [apps/backend/.env.example](apps/backend/.env.example) for the full
list: server port, PostgreSQL connection string, Redis connection string,
JWT signing secret, OpenRouter API key/model, and S3-compatible object
storage credentials for resume files.

## Further Documentation

- [architecture/README.md](architecture/README.md) — architecture,
  domain model, state machine, auth, resume processing, ranking,
  background jobs, API design, dashboard.
- [phases/README.md](phases/README.md) — implementation checklist and
  phase-by-phase status.
- [progress.md](progress.md) — running log of completed work.

Tradeoffs, assumptions, and known limitations will be documented here as
the implementation progresses (see Phase 16).
