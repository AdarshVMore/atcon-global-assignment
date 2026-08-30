# API Reference

Base URL: `http://localhost:3000` (local dev, see the root
[README.md](../README.md)). All responses are JSON.

All endpoints except `POST /auth/register`, `POST /auth/login`, and
`GET /health` require an `Authorization: Bearer <token>` header, where
`<token>` is the JWT returned from register/login. Endpoints marked
**(recruiter)** or **(candidate)** additionally require that role — a
mismatched role gets `403`. "Owner" means the recruiter who created the
job a resource belongs to (directly, or via its application/interview).

Errors are always `{ "error": { "message": string } }` with a matching
HTTP status: `400` invalid input, `401` missing/invalid token, `403`
wrong role or not the owner of a resource that's confirmed to exist,
`404` not found (or hidden — see the ownership note below), `409`
conflict (duplicate, invalid state transition), `500` unexpected error.

A non-owner attempting to **view** a resource they don't own gets `404`
(their access isn't distinguished from the resource not existing at
all). A non-owner attempting to **mutate** a resource that's already
been confirmed to exist for them some other way gets `403`. See each
module's phase file under [phases/](../phases/README.md) for the
reasoning behind specific cases.

---

## Health

### `GET /health`

No auth required. Checks the database connection.

```json
200 { "status": "ok" }
503 { "status": "degraded" }
```

---

## Auth

### `POST /auth/register`

```json
{ "email": string, "password": string, "name": string, "role": "CANDIDATE" | "RECRUITER", "phone"?: string }
```

`phone` is only used when `role` is `CANDIDATE`. Registering as
`CANDIDATE` also creates a linked `Candidate` profile row in the same
transaction.

```json
201 { "user": { "id", "email", "name", "role" }, "token": string }
409 duplicate email
```

### `POST /auth/login`

```json
{ "email": string, "password": string }
```

```json
200 { "user": { "id", "email", "name", "role" }, "token": string }
401 invalid credentials (same message whether the email doesn't exist or the password is wrong)
```

### `GET /me`

Current user's profile, derived from the token.

```json
200 { "user": { "id", "email", "name", "role" } }
```

---

## Jobs

### `GET /jobs`

Recruiters see their own jobs in any status. Everyone else sees only
`PUBLISHED` jobs.

```json
200 { "jobs": Job[] }
```

### `POST /jobs` (recruiter)

```json
{ "title": string, "description": string, "requirements": string, "stages"?: { "name": string, "isTerminal"?: boolean }[] }
```

`stages` defaults to a 6-stage pipeline (Applied, Screening, Interview,
Offer, Hired, Rejected) when omitted. Stage names must be unique within
the job.

```json
201 Job
```

### `GET /jobs/:jobId`

Owner sees any status; everyone else only if `PUBLISHED` (otherwise
`404`).

### `PATCH /jobs/:jobId` (recruiter, owner)

```json
{ "title"?: string, "description"?: string, "requirements"?: string }
```

`409` if the job is `CLOSED`.

### `POST /jobs/:jobId/publish` (recruiter, owner)

`DRAFT → PUBLISHED`. `409` if not currently `DRAFT`, or if the job has
no stages.

### `POST /jobs/:jobId/close` (recruiter, owner)

`→ CLOSED` (archive). `409` if already `CLOSED`. There is no hard-delete
endpoint — see the root README's Tradeoffs section.

### `POST /jobs/:jobId/stages` (recruiter, owner)

```json
{ "name": string, "isTerminal"?: boolean }
```

Appends a stage at the end of the pipeline. `409` on a duplicate name
or a `CLOSED` job.

### `PATCH /jobs/:jobId/stages/:stageId` (recruiter, owner)

```json
{ "name"?: string, "isTerminal"?: boolean }
```

Rename and/or retoggle terminal status. No reorder/delete endpoint.

### `GET /jobs/:jobId/pipeline` (recruiter, owner)

Per-stage application counts for one job.

```json
200 { "jobId", "jobTitle", "totalApplications", "stages": [{ "stageId", "stageName", "order", "isTerminal", "applicationCount" }] }
```

---

## Candidates

### `GET /candidates/me` (candidate)

```json
200 { "id", "phone", "createdAt", "updatedAt", "user": { "id", "email", "name" } }
```

### `PATCH /candidates/me` (candidate)

```json
{ "phone"?: string }
```

`409` if the phone number is already used by another account.

### `GET /candidates/me/resumes` (candidate)

```json
200 { "resumes": Resume[] }
```

### `POST /candidates/me/resumes` (candidate)

`multipart/form-data` with a `file` field (PDF or `.docx`, ≤5MB).
Legacy `.doc` is accepted at upload but fails to parse (see
[resume-processing.md](../architecture/resume-processing.md)).

```json
201 Resume  // status: "UPLOADED", parsing runs asynchronously
409 duplicate — you've already uploaded this exact file
```

---

## Applications

### `POST /jobs/:jobId/applications` (candidate)

```json
{ "resumeId": string }  // must be one of your own uploaded resumes
```

Starts at the job's first pipeline stage. `409` on a duplicate
application to the same job.

```json
201 Application
```

### `GET /applications`

Candidates get their own applications. Recruiters get applications
across jobs they own, optionally narrowed with `?jobId=<id>` (must be a
job they own, else `404`).

```json
200 { "applications": Application[] }
```

### `GET /applications/:applicationId`

Visible to the owning candidate or the owning recruiter.

### `GET /applications/:applicationId/history`

```json
200 { "history": ApplicationStageHistory[] }
```

### `PATCH /applications/:applicationId/stage` (recruiter, owner)

```json
{ "stageId": string, "reason"?: string }
```

Valid moves: to the immediate next stage by `order`, or to any terminal
stage (see [state-machine.md](../architecture/state-machine.md)).
`409` if the current stage is already terminal, or the move is invalid.

---

## Interviews

### `POST /applications/:applicationId/interviews` (recruiter, owner)

```json
{ "scheduledAt": string /* ISO date, must be in the future */, "durationMinutes": number /* 15-480 */, "interviewerId"?: string, "meetingUrl"?: string, "notes"?: string }
```

`interviewerId` defaults to the scheduling recruiter; if given, must be
an existing `RECRUITER` user.

### `GET /applications/:applicationId/interviews`

Same visibility as the application itself.

### `GET /interviews/:interviewId`

### `PATCH /interviews/:interviewId` (recruiter, owner)

```json
{ "durationMinutes"?: number, "meetingUrl"?: string, "notes"?: string }
```

`409` if the interview is `CANCELLED` or `COMPLETED`.

### `POST /interviews/:interviewId/reschedule` (recruiter, owner)

```json
{ "scheduledAt": string }
```

`→ RESCHEDULED`.

### `POST /interviews/:interviewId/cancel` (recruiter, owner)

`→ CANCELLED` (terminal).

### `POST /interviews/:interviewId/complete` (recruiter, owner)

`→ COMPLETED` (terminal).

### `POST /interviews/:interviewId/scorecard` (recruiter, owner)

Only once the interview is `COMPLETED`; one scorecard per interview.

```json
{
  "technicalScore": number,      // 1-5
  "communicationScore": number,  // 1-5
  "problemSolvingScore": number, // 1-5
  "recommendation": "STRONG_YES" | "YES" | "NO" | "STRONG_NO",
  "feedback"?: string
}
```

```json
201 InterviewScorecard
409 a scorecard has already been submitted for this interview
```

---

## Notifications

### `GET /notifications`

Own notifications, newest first.

```json
200 { "notifications": Notification[] }
```

### `PATCH /notifications/:notificationId/read`

Marks one as read. `403` if it isn't yours.

---

## Dashboard

### `GET /dashboard/overview` (recruiter)

Metrics scoped to the requesting recruiter's own jobs.

```json
200 {
  "openJobs": number,
  "totalApplications": number,
  "applicationsByStage": [{ "stageId", "stageName", "isTerminal", "count" }],
  "interviewCounts": { "SCHEDULED": number, "RESCHEDULED": number, "CANCELLED": number, "COMPLETED": number },
  "pipelineHealth": { "activeApplications": number, "terminalApplications": number, "staleApplications": number },
  "timeToHireDays": number | null
}
```

`timeToHireDays` is `null` until at least one application has reached a
stage named "Hired" — see
[dashboard.md](../architecture/dashboard.md)'s implementation note.
