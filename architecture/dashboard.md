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
