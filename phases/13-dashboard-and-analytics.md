# Phase 13 — Dashboard and Analytics

[← Back to index](README.md)

## Goal

Expose backend data needed for recruiter dashboard and pipeline health. See
[architecture/dashboard.md](../architecture/dashboard.md).

### Tasks

- [x] Create dashboard overview endpoint. (`GET /dashboard/overview`,
      recruiter-only, scoped to the requesting recruiter's own jobs —
      see Architecture Note)
- [x] Calculate open jobs. (count of `PUBLISHED` jobs owned by the
      recruiter)
- [x] Calculate total applications. (count of applications across
      those jobs)
- [x] Calculate candidates by stage. (every `JobStage` across the
      recruiter's jobs, with its application count — including
      zero-count stages, verified live)
- [x] Calculate interview counts. (grouped by `InterviewStatus`, all
      four statuses always present even at zero)
- [x] Calculate pipeline health. (`activeApplications` /
      `terminalApplications` / `staleApplications` — see Architecture
      Note for the "stale" definition)
- [x] Calculate time-to-hire. (average `changedAt - appliedAt` across
      transitions into a stage named "Hired" — see Architecture Note
      on why name-matching, not a schema flag)
- [x] Add job-specific pipeline endpoint. (`GET /jobs/:jobId/pipeline`
      — ordered stages with counts for one job, ownership-checked)
- [ ] Add useful filtering if time allows. (not done — optional per its
      own wording; nothing else in this phase was blocked by skipping
      it)
- [x] Verify analytics against seeded/test data. (verified live against
      the dev database's real jobs/applications/interviews, including
      pushing one application through to `Hired` to check
      `timeToHireDays`)

### Architecture Note

**Dashboard is scoped to the requesting recruiter's own jobs, not
platform-wide.** There's no admin/platform-operator role in this
system — only `CANDIDATE` and `RECRUITER` — so "the dashboard" can only
sensibly mean "my pipeline." A global cross-recruiter view would leak
one recruiter's hiring activity to another, which nothing in the
architecture doc asks for and the auth model doesn't support anyway.

**Time-to-hire uses a stage *named* "Hired" (case-insensitive), not a
schema flag.** `JobStage.isTerminal` deliberately doesn't distinguish
"succeeded" from "failed" terminal stages (a Phase 7 simplification,
documented there) — stages are configurable per job, so there's no
structural way to know which terminal stage represents a hire.
Matching on `JobStage.name` against `"Hired"` is a naming convention,
not a strict contract: it works because Phase 4's default pipeline
(and every job seeded/tested so far) uses that name. A job whose
recruiter renamed the terminal "success" stage to something else
wouldn't be counted — documented as a real limitation of this
approach, not silently glossed over. A future schema addition (an
explicit `outcome` field on `JobStage`, e.g. `HIRED`/`REJECTED`/`null`)
would remove the ambiguity; not done here since it's a schema change
this phase doesn't strictly need.

**"Stale" is a fixed 14-day threshold on `Application.updatedAt`.**
`updatedAt` already gets bumped by every `moveToStage` call, so it's a
correct proxy for "time in current stage" without needing a separate
timestamp. 14 days is a reasonable, arbitrary default — not specified
by the architecture doc — documented here rather than left unexplained
in the code.

**Aggregation happens in Prisma queries plus small in-process
reductions (e.g. averaging time-to-hire across a handful of rows), not
raw SQL.** `background-jobs.md`'s "use PostgreSQL queries/aggregations
directly, don't introduce a separate analytics database" is satisfied
by Prisma's query builder — it still executes as SQL against Postgres.
Raw `$queryRaw` wasn't needed for anything here and would trade
readability for no real benefit at this data scale.

### Verification

- [x] Metrics come from PostgreSQL (every figure verified live against
      the real dev database, not computed client-side or cached).
- [x] Application counts are correct (`totalApplications`,
      `openJobs` — verified live against known seeded/test data).
- [x] Stage counts are correct (verified live, including a job-specific
      pipeline showing zero-count stages alongside populated ones).
- [x] Time-to-hire is calculated from meaningful timestamps (verified
      live: pushed a real application through Applied → Hired and
      watched `timeToHireDays` go from `null` to a real number).
- [x] Dashboard data can be consumed by a future Next.js frontend
      (plain JSON over REST, no server-rendered HTML or coupling to
      any particular frontend).
