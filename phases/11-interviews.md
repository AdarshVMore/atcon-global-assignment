# Phase 11 — Interviews

[← Back to index](README.md)

## Goal

Implement interview scheduling and structured scorecards. See
[architecture/background-jobs.md](../architecture/background-jobs.md#interviews)
and [architecture/data-model.md](../architecture/data-model.md#interview-model).

### Tasks

- [x] Schedule interview. (`POST /applications/:applicationId/interviews`,
      job-owning recruiter only)
- [x] Associate interview with application. (`Interview.applicationId`,
      required at creation)
- [x] Associate interviewer. (`interviewerId` — must reference an
      existing `RECRUITER` user if given; defaults to the scheduling
      recruiter otherwise)
- [x] Store scheduled time. (`scheduledAt`, must be a valid future
      date)
- [x] Store meeting information. (`meetingUrl`, `notes` — both
      optional)
- [x] Implement rescheduling. (`POST /interviews/:interviewId/reschedule`
      — `SCHEDULED`/`RESCHEDULED` → `RESCHEDULED` with a new
      `scheduledAt`)
- [x] Implement cancellation. (`POST /interviews/:interviewId/cancel`
      — → `CANCELLED`, terminal)
- [x] Implement interview completion. (`POST
      /interviews/:interviewId/complete` — → `COMPLETED`, terminal)
- [x] Create structured scorecard. (`InterviewScorecard` —
      technicalScore/communicationScore/problemSolvingScore (1-5 each),
      recommendation enum, optional feedback)
- [x] Submit scorecard. (`POST /interviews/:interviewId/scorecard` —
      only once the interview is `COMPLETED`)
- [x] Prevent invalid duplicate scorecard submissions. (checked before
      insert, `InterviewScorecard.interviewId` unique constraint as
      the DB-level backstop — same pattern as every other duplicate
      check in this codebase)
- [x] Add interview tests. (`interview.service.test.ts` — ownership,
      validation, status transitions)
- [x] Add scorecard tests. (completed-only gate, score-range
      validation, recommendation validation, duplicate rejection)

### Architecture Note

**Status transitions are explicit actions, not arbitrary `PATCH`.**
Mirrors the Job status pattern from Phase 4: `PATCH
/interviews/:interviewId` only ever touches `durationMinutes`/
`meetingUrl`/`notes` (and only while `SCHEDULED`/`RESCHEDULED`);
`scheduledAt` changes go through the dedicated `/reschedule` action
specifically because a date change is the one edit worth its own
audit-worthy verb. `/cancel` and `/complete` are both terminal — once
in either state, `assertMutable` rejects every further mutation with a
409 naming the current status.

**Interview ownership = job ownership, not "whoever is
`interviewerId`".** `interviewerId` is descriptive metadata (who's
actually conducting it), not an access-control boundary — only the
recruiter who owns the job can schedule, edit, reschedule, cancel,
complete, or submit a scorecard, same ownership model as every other
write in this codebase (Job, Application). A more elaborate
"interviewer-specific" permission tier isn't justified by anything in
the task list and would be a new, one-off access model.

**Scorecard requires `COMPLETED` first.** Not explicitly required by
the task list, but a natural reading of the lifecycle — feedback about
an interview that hasn't happened yet doesn't make sense. Keeps
`Interview.status` meaningful as more than a label.

**Score range is 1-5.** The schema doesn't constrain
`technicalScore`/`communicationScore`/`problemSolvingScore` beyond
`Int`; a 1-5 Likert-style range is a defensible, common default,
enforced in `interviews/validation.ts`, not the schema — same
"boundary validation lives in the service, not a new dependency"
approach as everywhere else in this codebase.

### Verification

- [x] Recruiter can schedule interview (verified live).
- [x] Interview is linked to application (`applicationId` on every
      response; `GET /applications/:applicationId/interviews` lists
      them).
- [x] Interview lifecycle is understandable (verified live end to end:
      scheduled → scorecard blocked pre-completion (409) → completed →
      scorecard accepted (201) → duplicate rejected (409)).
- [x] Scorecard is structured (fixed fields, validated ranges/enum —
      verified live and in tests).
- [x] Scorecard submission is authorized (candidate blocked from
      scheduling with 403; ownership enforced on every mutation, tested
      and verified live).
