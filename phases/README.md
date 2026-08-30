# Development Phases

This is the implementation checklist and progress tracker, split one file
per phase. Update the relevant phase file's checkboxes as work completes,
and append a line to [progress.md](../progress.md) for each finished
subtask.

Status legend: `[ ]` not started · `[-]` in progress · `[x]` complete ·
`[!]` blocked / needs decision. Never mark a task complete merely because
code exists — it must be implemented and verified. See the
[Working Process](../CLAUDE.md#working-process-every-phase) in CLAUDE.md.

| Phase | File | Goal | Status |
|---|---|---|---|
| 0 | [00-repository-and-architecture-foundation.md](00-repository-and-architecture-foundation.md) | Understand the assignment, establish the backend monorepo foundation | [x] Complete |
| 1 | [01-postgresql-and-prisma.md](01-postgresql-and-prisma.md) | Database foundation and core domain schema | [x] Complete |
| 2 | [02-backend-foundation.md](02-backend-foundation.md) | Basic class-oriented backend structure | [ ] Not started |
| 3 | [03-authentication-and-rbac.md](03-authentication-and-rbac.md) | Authentication and Candidate/Recruiter authorization | [ ] Not started |
| 4 | [04-job-management.md](04-job-management.md) | Recruiter job creation and configurable stages | [ ] Not started |
| 5 | [05-candidate-and-resume-management.md](05-candidate-and-resume-management.md) | Candidate profiles and resume uploads | [ ] Not started |
| 6 | [06-applications.md](06-applications.md) | Candidates apply, recruiters manage applications | [ ] Not started |
| 7 | [07-application-pipeline-state-machine.md](07-application-pipeline-state-machine.md) | Configurable hiring-stage transitions | [ ] Not started |
| 8 | [08-redis-and-background-jobs.md](08-redis-and-background-jobs.md) | Asynchronous job processing infrastructure | [ ] Not started |
| 9 | [09-resume-parser-worker.md](09-resume-parser-worker.md) | Parse resumes asynchronously | [ ] Not started |
| 10 | [10-candidate-ranking.md](10-candidate-ranking.md) | Asynchronous candidate/job matching | [ ] Not started |
| 11 | [11-interviews.md](11-interviews.md) | Interview scheduling and structured scorecards | [ ] Not started |
| 12 | [12-notifications.md](12-notifications.md) | Notify users about recruitment events | [ ] Not started |
| 13 | [13-dashboard-and-analytics.md](13-dashboard-and-analytics.md) | Recruiter dashboard and pipeline health data | [ ] Not started |
| 14 | [14-reliability-testing-and-cleanup.md](14-reliability-testing-and-cleanup.md) | Reliability review, testing, cleanup | [ ] Not started |
| 15 | [15-livekit.md](15-livekit.md) | Optional realtime interview functionality | [ ] Not started |
| 16 | [16-final-assignment-preparation.md](16-final-assignment-preparation.md) | Submission and demonstration prep | [ ] Not started |
| — | [assignment-coverage-checklist.md](assignment-coverage-checklist.md) | Cross-cutting checklist to verify before submission | [ ] Not started |

Do not jump ahead and implement future phases unless required by a
dependency.
