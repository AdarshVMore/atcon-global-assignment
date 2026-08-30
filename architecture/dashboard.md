# Dashboard / Analytics

The dashboard uses plain backend APIs, e.g.:

```
GET /dashboard/overview
GET /jobs/:jobId/pipeline
GET /jobs/:jobId/analytics
```

## Metrics

- Open Jobs
- Total Applications
- Applications by Stage
- Interviews
- Time-to-Hire
- Pipeline Health

Use PostgreSQL queries/aggregations directly. Do not introduce a separate
analytics database.

## Time-to-Hire

Calculated from meaningful application timestamps, at minimum:

```
Hired At - Applied At
```

If more detail is useful, derive time spent in each stage from
`ApplicationStageHistory` (see [state-machine.md](state-machine.md)):

```
Applied → Screening → Interview → Offer → Hired

Time in each stage + Total time to hire
```

**Implementation note (Phase 13):** since `JobStage.isTerminal` doesn't
distinguish a successful hire from a rejection (stages are configurable
per job — see [state-machine.md](state-machine.md)'s implementation
note), time-to-hire is computed by matching the *name* "Hired"
(case-insensitive) on the stage an application transitioned into, via
`ApplicationStageHistory`, not a structural flag. This works with every
job built on Phase 4's default pipeline naming; a job whose recruiter
renamed that stage wouldn't be counted. Also scoped to the requesting
recruiter's own jobs — there's no admin/platform role, so a
cross-recruiter view isn't meaningful or supported. See
[phases/13-dashboard-and-analytics.md](../phases/13-dashboard-and-analytics.md).
