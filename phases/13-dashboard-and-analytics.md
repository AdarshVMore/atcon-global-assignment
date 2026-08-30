# Phase 13 — Dashboard and Analytics

[← Back to index](README.md)

## Goal

Expose backend data needed for recruiter dashboard and pipeline health. See
[architecture/dashboard.md](../architecture/dashboard.md).

### Tasks

- [ ] Create dashboard overview endpoint.
- [ ] Calculate open jobs.
- [ ] Calculate total applications.
- [ ] Calculate candidates by stage.
- [ ] Calculate interview counts.
- [ ] Calculate pipeline health.
- [ ] Calculate time-to-hire.
- [ ] Add job-specific pipeline endpoint.
- [ ] Add useful filtering if time allows.
- [ ] Verify analytics against seeded/test data.

### Verification

- Metrics come from PostgreSQL.
- Application counts are correct.
- Stage counts are correct.
- Time-to-hire is calculated from meaningful timestamps.
- Dashboard data can be consumed by a future Next.js frontend.
