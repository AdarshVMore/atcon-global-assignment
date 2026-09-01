# Phase 6 — Applications

[← Back to index](README.md)

## Goal

Allow candidates to apply to jobs and recruiters to manage applications.

### Tasks

- [x] Apply to published job. (`POST /jobs/:jobId/applications`,
      candidate only)
- [x] Validate job status. (only `PUBLISHED` jobs are visible/applyable
      — same visibility rule as Phase 4, a non-published job just
      isn't found)
- [x] Prevent duplicate application to same job. (checked before
      insert, and the `Application_candidateId_jobId_key` unique
      constraint from Phase 1 is the backstop if two requests race)
- [x] Create Application record. (plus its initial
      `ApplicationStageHistory` row, in one transaction — see below)
- [x] Get application. (`GET /applications/:applicationId`)
- [x] List applications for recruiter. (`GET /applications`, optional
      `?jobId=` filter scoped to jobs they own)
- [x] List applications for candidate. (`GET /applications` — same
      endpoint, branches on role)
- [x] Enforce candidate/application ownership. (candidate only sees/
      lists their own; a mismatched candidate gets 404)
- [x] Enforce recruiter/job ownership. (recruiter only sees
      applications for jobs they own; `?jobId=` for a job they don't
      own → 404)
- [x] Implement deterministic candidate duplicate detection. (see
      Architecture Note — largely already covered by Phase 1/3's
      `User.email` and `Candidate.phone` uniqueness)
- [x] Add application tests. (`application.service.test.ts` — job
      status, duplicate application, resume ownership, first-stage
      selection, view/list ownership on both sides)
- [x] Verify application transaction behavior. (`Application` +
      `ApplicationStageHistory` created together in one
      `prisma.$transaction`; verified live that both rows exist after
      one `POST`)

### Architecture Note

**Resume is required to apply.** The schema left `Application.resumeId`
nullable (Phase 1 decision, kept deliberately flexible), but this phase
requires it in the request body — applying without ever having
submitted a resume doesn't match realistic ATS behavior, and downstream
phases (ranking, resume-based screening) need something to work with.
The field stays nullable at the schema level since that's cheap
flexibility; the "required to apply" rule lives in
`ApplicationService.applyToJob`, not the database.

**Application + initial stage history is one transaction.**
`state-machine.md` says stage history "must not be silently bypassed" —
that applies to the very first stage assignment too, not just later
transitions. `ApplicationRepository.create` wraps both inserts in a
single `prisma.$transaction`, so an application can never exist without
a matching history entry (`fromStage: null → toStage: <first stage>`).

**Deterministic candidate duplicate detection, scope carried over from
Phase 5.** Level 1 (email/phone) is already enforced globally by the
`User.email` and `Candidate.phone` unique constraints — there's no new
mechanism to add here. What Phase 6 adds is duplicate-*application*
prevention (same candidate, same job), which is a different thing and
is fully covered above. Cross-candidate signals (two accounts, same
resume hash, applying to the same job) still aren't surfaced anywhere —
same known gap noted in Phase 5, not revisited here since nothing new
in this phase changes that calculus.

**One list endpoint, not two.** `GET /applications` branches on
`viewer.role` (candidate → own applications; recruiter → applications
across jobs they own, optionally narrowed with `?jobId=`) rather than
separate recruiter/candidate routes — same pattern as `GET /jobs` from
Phase 4.

**Later addition — `GET /applications/:applicationId/candidate`.**
Added after this phase's original live-verification pass, once the
frontend's Candidates/Pipeline work (Phase 13 in
[docs/frontend-phases.md](../docs/frontend-phases.md)) needed a
candidate's actual profile and resumes, not just their id. Lives in
`CandidateService.getProfileForRecruiter`, not here — access is scoped
through the application relationship (must belong to a job this
recruiter owns) the same way every other per-application endpoint in
this file is, so it was a natural fit for that existing authorization
pattern rather than a new one.

### Verification

- [x] Candidate can apply (verified live, including the initial stage
      history row).
- [x] Candidate cannot apply twice to the same job (409, verified
      live).
- [x] Recruiter can view applicants for their jobs (`GET /applications`
      and `GET /applications/:id`, verified live).
- [x] Candidate can only access their own applications (verified in
      tests: a non-owning candidate gets 404 on both get and list).
- [x] Duplicate detection is predictable (same message whether caught
      by the pre-check or the DB constraint race-condition fallback).
