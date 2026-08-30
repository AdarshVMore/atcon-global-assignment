# Architecture

This system is a lightweight Applicant Tracking System (ATS) / recruitment
platform covering: job postings, candidate profiles, resumes, applications,
configurable hiring pipelines, interviews, structured scorecards,
notifications, pipeline analytics, and time-to-hire.

The architecture is intentionally practical rather than production-scale.
The assignment evaluates architecture, prioritization, engineering
reasoning, implementation quality, backend engineering, API design,
reliability, code structure, product thinking, communication, and
practicality.

For coding conventions and process rules, see the root
[CLAUDE.md](../CLAUDE.md). For the implementation checklist, see
[phases/README.md](../phases/README.md).

## Documents in this directory

- [principles.md](principles.md) — architectural approach, high-level
  diagram, technology choices, monorepo layout, and what is deliberately
  not being built.
- [data-model.md](data-model.md) — core domain entities, relationships,
  User/Job/Application/Interview models, data ownership.
- [state-machine.md](state-machine.md) — application pipeline states,
  transition rules, stage history, audit trail.
- [auth.md](auth.md) — authentication and role-based authorization.
- [resume-processing.md](resume-processing.md) — resume upload/storage/
  parsing flow, OpenRouter usage, duplicate candidate detection.
- [ranking.md](ranking.md) — asynchronous candidate/job ranking.
- [background-jobs.md](background-jobs.md) — Redis queues, worker
  reliability, notifications, interview lifecycle.
- [api-design.md](api-design.md) — REST endpoint conventions and examples.
- [dashboard.md](dashboard.md) — analytics endpoints and metrics.

## Architectural Approach

> Modular Monolith + Background Workers

The backend is one application with clearly separated domain modules. It is
NOT a microservice architecture. The goal is to stay easy to understand,
develop, test, run locally, and explain during review, while still
demonstrating asynchronous backend architecture.

## High-Level Architecture

```text
                         ┌───────────────────────┐
                         │     Future Frontend   │
                         │        Next.js        │
                         └───────────┬───────────┘
                                     │
                                  HTTPS
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      Backend API      │
                         │    Bun + TypeScript   │
                         │    Modular Monolith   │
                         │                       │
                         │ Auth / RBAC           │
                         │ Jobs                  │
                         │ Candidates            │
                         │ Applications          │
                         │ Pipeline              │
                         │ Interviews            │
                         │ Notifications         │
                         │ Dashboard             │
                         └──────┬─────────┬──────┘
                                │         │
                                │         │ async work
                                │         ▼
                                │    ┌─────────────┐
                                │    │    Redis    │
                                │    │    Queue     │
                                │    └──────┬──────┘
                                │           │
                                │     ┌─────┼──────────────┐
                                │     │     │              │
                                │     ▼     ▼              ▼
                                │  Resume  Ranking   Notification
                                │  Worker  Worker       Worker
                                │
                                ▼
                         ┌─────────────────┐
                         │   PostgreSQL    │
                         │                 │
                         │ Source of Truth │
                         └─────────────────┘

                         ┌─────────────────┐
                         │ Object Storage  │
                         │                 │
                         │ Resume Files    │
                         └─────────────────┘
```

See [principles.md](principles.md) for technology choices, the suggested
monorepo layout, and the list of deliberately-not-built infrastructure.
