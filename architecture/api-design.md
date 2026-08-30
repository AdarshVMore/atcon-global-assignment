# API Design

Use resource-oriented REST. Prefer clear resource endpoints over
vague, action-heavy ones (e.g. `/jobs` + `PATCH /applications/:id/stage`
rather than `/check-candidate` or `/do-ranking`). Business actions can
have dedicated endpoints when they represent meaningful domain
operations.

## Example Routes

```
POST   /auth/register
POST   /auth/login

GET    /jobs
POST   /jobs
GET    /jobs/:jobId
PATCH  /jobs/:jobId

GET    /candidates/:candidateId
PATCH  /candidates/:candidateId
POST   /candidates/:candidateId/resumes

POST   /jobs/:jobId/applications

GET    /applications/:applicationId
GET    /applications/:applicationId/history
PATCH  /applications/:applicationId/stage

POST   /applications/:applicationId/interviews

GET    /interviews/:interviewId
PATCH  /interviews/:interviewId

POST   /interviews/:interviewId/scorecard

GET    /dashboard/overview
GET    /jobs/:jobId/pipeline
```

Exact routes can evolve as implementation details become clearer. See
[dashboard.md](dashboard.md) for the analytics endpoints.
