# Project Instructions

## Project

This project is a lightweight Applicant Tracking System (ATS) / recruitment
platform built for the Full Stack Developer case study. Read the assignment
PDF completely before making implementation decisions.

The assignment is intentionally lightweight, not production-scale. It exists
to demonstrate backend engineering quality, practical API design, auth,
state-machine modelling, file upload/parsing, duplicate detection, async
jobs, notifications, audit trail, database design, dashboard thinking,
reliability, and readable architecture — not infrastructure complexity.

For domain concepts, diagrams, and per-area design decisions, see
[architecture/README.md](architecture/README.md).

For the implementation checklist and current progress, see
[phases/README.md](phases/README.md) and [progress.md](progress.md).

---

## Current Scope

Developing the BACKEND only. Do not implement the frontend yet.

The future frontend will use Next.js; styling/visual design is deferred.
Do not spend effort on frontend styling, UI design, component systems,
state management, or visual polish. Design the backend so a Next.js
frontend can consume it cleanly later.

Development order: **backend first, frontend later, LiveKit last.** Do not
begin frontend work until the backend is sufficiently complete. Do not
begin LiveKit until required interview/scorecard functionality works
without it. Do not polish optional features while required capabilities
remain incomplete.

---

## Technology & Structure

Stack: Bun, TypeScript, PostgreSQL, Prisma, Redis, REST API, background
workers, OpenRouter SDK for LLM calls, Git.

Monorepo layout:

```
apps/
  backend/
packages/
  database/
  shared/
```

Only create packages when they have a real purpose — keep the monorepo
simple. See [architecture/README.md](architecture/README.md) for the
suggested internal `apps/backend/src` module layout.

Backend architecture is a **modular monolith** (not microservices), using
Controller → Service → Repository → Prisma → PostgreSQL for sync work, and
Service → Queue → Worker → Service/Repository → PostgreSQL for async work.
Use simple constructor-based dependency injection — no DI framework.

---

## Commands

Run from `apps/backend` once the workspace is scaffolded (Phase 0):

```
bun install          # install dependencies
bun run dev           # start backend with hot reload
bun test              # run test suite
bunx tsc --noEmit     # TypeScript check
bunx prisma migrate dev   # run migrations (packages/database)
```

Exact script names should be finalized during Phase 0 and kept in sync with
`apps/backend/package.json`. Update this section if scripts change.

---

## TypeScript

Use TypeScript properly with explicit domain types and interfaces. Do not
use `any` unless genuinely unavoidable. Do not introduce Zod or another
runtime validation library yet — TypeScript types are sufficient for this
version. If runtime validation becomes clearly necessary later, document
the reason before introducing a library.

---

## Code Style

Prefer straightforward control flow, meaningful names, small focused
classes, simple functions, clear responsibilities, explicit dependencies,
and readable database queries.

Avoid unnecessary abstractions, generic utility layers, design patterns for
their own sake, factories everywhere, interfaces with no practical benefit,
excessive dependency injection, and premature optimization.

Prefer domain-meaningful class names (`ApplicationService`,
`CandidateRepository`, `InterviewService`) over vague ones (`DataManager`,
`Processor`, `HandlerManager`, `CoreService`).

Service methods use clear verbs: `createJob()`, `applyToJob()`,
`moveApplicationToStage()`, `scheduleInterview()`, `submitScorecard()`,
`parseResume()`. Avoid vague names (`processData()`, `handleThing()`)
unless the operation genuinely has that meaning. Avoid unnecessary
abbreviations.

The code should read like it was written by a thoughtful human engineer,
not like AI-generated code.

---

## Comments

Avoid comments by default — code should explain itself through naming and
structure. When genuinely necessary, use a short one-line comment (e.g.
`// Prevent duplicate processing when a job is retried.`). Avoid large
explanatory comments, comments restating obvious code, or comments on
every function.

---

## Error Handling & Reliability

Handle authentication failures, authorization failures, invalid resources,
invalid state transitions, duplicate applications, missing resources,
background job failures, external service failures, and LLM failures. Do
not build a giant global error abstraction unless necessary. LLM failures
should degrade gracefully.

Background workers must assume jobs can retry, run more than once, and
partially fail, and that external/LLM services can time out. Important
workers should be idempotent where practical — do not assume exactly-once
execution.

---

## Database

Use PostgreSQL through Prisma. Use database constraints where appropriate
(don't rely solely on application-level uniqueness checks). Use
transactions when multiple changes must remain consistent. Repositories
contain persistence logic; services contain business logic. Do not hide
simple database operations behind unnecessary abstractions.

---

## Testing

Do not attempt 100% coverage. Prioritize business-critical behavior:
authentication, authorization, application creation, duplicate
applications, valid/invalid stage transitions, stage history, resume
processing, background job retry/idempotency, interview scheduling,
scorecard submission, and important ranking behavior. Tests should be
readable.

---

## Documentation

Maintain a useful README covering: what the system does, architecture,
tech stack, local setup, environment variables, database/Redis setup,
running backend/workers, OpenRouter configuration, API overview,
tradeoffs, assumptions, known limitations, and future improvements. No
marketing language.

---

## Git Rules

The repository must contain ONLY the user's existing Git identity as
commit author. Do NOT add Claude Code as author, co-author, contributor,
or commit trailer, and do NOT change the user's Git name/email.

Before the first commit: inspect current git config, confirm `user.name`
and `user.email` are present, and use that existing identity. If missing,
stop and ask — never invent or configure an identity.

Do not amend or rewrite existing commits unless explicitly instructed.
Commit messages describe the actual work (`feat: add application
pipeline`, `fix: prevent duplicate applications`, `test: add application
transition tests`). Only create commits when the user requests it.

**Commit checkpoint:** don't commit after every file. Continue implementing
a coherent piece of functionality, then commit after roughly 7-8 meaningful
files change OR when a feature/module is complete (module-completion
overrides the file count). Before committing: run relevant tests, run
TypeScript checks, run linting if configured, inspect the diff, update
[progress.md](progress.md) and the relevant [phases/](phases/README.md)
file, then commit. Don't commit simply because 7-8 files changed if the
work is incomplete or broken.

while writting any commit or any comment: Act like a normal, thoughtful person who's knowledgeable but doesn't write like a robot. I want your responses to feel conversational, relatable, and human. Not like a formal essay or a customer support script.
Please avoid the following common mistakes:
- Don't follow the same rigid structure in every reply (intro, bullets, summary).
- Don't over-explain. Be confise when the answer is simple
- avoid using repetitive connector like, "however", on the other hand or never less
Keep the tone balanced - not overly cheerful or overly formal.
- Don't confidently state anything you're unsure about. If something might be wrong, say so.
- Don't flatter me unnecessarily.

---

## Working Process (every phase)

1. Inspect the current repository state.
2. Re-read this file.
3. Read [architecture/README.md](architecture/README.md) for the relevant
   concern.
4. Read the current phase file under [phases/](phases/README.md).
5. Understand the intended business behavior.
6. Implement only the relevant scope — do not jump ahead to future phases
   unless required by a dependency.
7. Run checks (tests, TypeScript, lint).
8. Verify behavior.
9. Update the phase file's checkboxes and append to
   [progress.md](progress.md).
10. Commit when the checkpoint rule is satisfied.
11. Continue to the next phase.

Use these checkbox states in phase files: `[ ]` not started, `[-]` in
progress, `[x]` complete, `[!]` blocked / needs decision. Never mark
something complete merely because code exists — it must be implemented
and verified.

---

## Architectural Changes

Do not silently change the architecture. If implementation reveals that an
architectural decision needs to change: stop, explain the problem, propose
the change, update the relevant file(s) under
[architecture/](architecture/README.md) once the decision is clear, then
continue implementation. Do not gradually introduce architectural
complexity without documenting why.

---

## Assignment Priority

When making tradeoffs, prioritize in this order: (1) required assignment
functionality, (2) correct business behavior, (3) readable architecture,
(4) reliability, (5) tests, (6) documentation, (7) optional enhancements.
Optional features must never block core assignment completion.

---

## Decision Making

When something is ambiguous: prefer the simplest reasonable
implementation, stay aligned with the assignment, preserve existing
architecture, avoid unnecessary dependencies, and document important
assumptions. Only ask the user when the decision materially affects
architecture, data integrity, security, or scope — do not stop for minor
decisions that can be reasonably made from these principles.
