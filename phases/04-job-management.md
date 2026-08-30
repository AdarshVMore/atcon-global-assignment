# Phase 4 — Job Management

[← Back to index](README.md)

## Goal

Allow recruiters to create and manage jobs and configurable stages. See
[architecture/data-model.md](../architecture/data-model.md#job-model).

### Tasks

- [x] Create job. (`POST /jobs`, recruiter-only; accepts an optional
      `stages` array, defaults to a 6-stage pipeline — Applied,
      Screening, Interview, Offer, Hired, Rejected — when omitted)
- [x] Update job. (`PATCH /jobs/:jobId`, owner only, blocked once
      `CLOSED`)
- [x] Archive/delete job where appropriate. (`POST /jobs/:jobId/close`
      — see Architecture Note; no hard-delete endpoint)
- [x] Publish job. (`POST /jobs/:jobId/publish` — only from `DRAFT`,
      only with at least one stage)
- [x] List jobs. (`GET /jobs` — recruiters see their own jobs in any
      status, everyone else sees only `PUBLISHED` jobs)
- [x] Get job details. (`GET /jobs/:jobId` — same visibility rule,
      per-resource)
- [x] Create job stages. (`POST /jobs/:jobId/stages`, owner only,
      rejects duplicate names, blocked once `CLOSED`)
- [x] Update job stages where appropriate. (`PATCH
      /jobs/:jobId/stages/:stageId` — rename and/or toggle
      `isTerminal`; no reorder/delete endpoint, see Architecture Note)
- [x] Validate recruiter access. (ownership check on every mutation;
      `requireRole([Role.RECRUITER], ...)` on write routes)
- [x] Add job tests. (`job.service.test.ts` — creation, default stages,
      ownership, publish/close state transitions)
- [x] Add job-stage tests. (duplicate stage names on create and on
      add, stage mutations blocked on a closed job)

### Architecture Note

**No hard-delete for jobs.** `Application.jobId` cascades on delete, so
removing a job would silently destroy candidate applications. "Archive"
is instead a status transition to `CLOSED` via `POST /jobs/:jobId/close`
— consistent with treating status as an explicit, validated state
machine rather than arbitrary CRUD (same principle CLAUDE.md applies to
the Application pipeline). A `CLOSED` job can't be edited, re-published,
or have its stages changed.

**No stage reorder/delete endpoint.** Stages carry an explicit `order`,
but nothing yet reorders or removes them — `POST .../stages` appends
at the end, `PATCH .../stages/:stageId` only renames or retoggles
`isTerminal`. Reordering isn't in the task list, and deleting a stage
that an `Application.currentStageId` might already reference is exactly
the kind of unsafe operation the schema's `onDelete: Restrict` on that
relation is there to prevent. Revisit if a future phase needs it.

**Job visibility.** All job routes require authentication (no
unauthenticated public browsing) — the assignment doesn't call for a
public job board, and keeping every route behind `requireAuth` avoids a
second access-control model. A non-owning viewer (any role) gets
`404 Not Found` for a non-`PUBLISHED` job rather than `403`, so a
recruiter can't probe for the existence of another recruiter's drafts.

### Verification

- [x] Recruiter can manage jobs (create, update, publish, close, add
      stage, rename stage — verified live).
- [x] Candidates can view published jobs (verified live: 404 while
      `DRAFT`, 200 after `publish`).
- [x] Job stages are configurable (custom stage list at creation,
      stages appended and renamed after — verified live and in tests).
- [x] Job authorization works (403 for a candidate calling
      recruiter-only routes; ownership enforced in the service layer
      with dedicated tests — verified live and in tests).
