# Data Model

See [README.md](README.md) for how this fits the overall architecture.

## Core Domain Entities

```
User
Candidate
Recruiter
Job
JobStage
Application
ApplicationStageHistory
Resume
Interview
InterviewScorecard
Notification
AuditLog
```

## Conceptual Relationships

```
User
 ├── Candidate
 └── Recruiter

Job
 ├── JobStage[]
 └── Application[]

Candidate
 ├── Resume[]
 └── Application[]

Application
 ├── Candidate
 ├── Job
 ├── Current Stage
 ├── Stage History[]
 ├── Interview[]
 └── Ranking Result

Interview
 └── Scorecard
```

## User Model

The system supports two primary roles: **Candidate** and **Recruiter**.
Authorization happens in the backend — the frontend is never treated as a
security boundary. See [auth.md](auth.md).

## Job Model

A Job represents a published or draft recruitment opening and owns its
hiring pipeline:

```
Job
 │
 ├── title
 ├── description
 ├── requirements
 ├── status
 │
 └── stages
      ├── Applied
      ├── Screening
      ├── Interview
      ├── Offer
      └── Hired
```

Stages must be configurable per Job — do not hard-code a single global
pipeline.

## Application Model

An Application connects a Candidate and a Job, and owns the candidate's
position in the hiring pipeline:

```
Application
 ├── candidateId
 ├── jobId
 ├── currentStageId
 ├── appliedAt
 ├── rankingScore
 └── stage history
```

The Application is authoritative business state. See
[state-machine.md](state-machine.md) for how it transitions and
[ranking.md](ranking.md) for `rankingScore`.

## Interview Model

```
Application
    │
    ▼
Interview
    │
    ▼
Scorecard
```

Scorecards should be structured rather than free-form only. Example
fields: `technicalScore`, `communicationScore`, `problemSolvingScore`,
`recommendation`, `feedback`. Exact fields can be adjusted to keep the
implementation simple.
