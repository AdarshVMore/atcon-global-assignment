# Phase 1 — PostgreSQL and Prisma

[← Back to index](README.md)

## Goal

Create the database foundation and core domain schema.

### Tasks

- [x] Configure PostgreSQL. (local Homebrew `postgresql@15`, `atcon_ats`
      database, `postgres` role)
- [x] Configure Prisma. (v7.10.0, pinned — `prisma init` defaulted to the
      `8.0.0-rc.12` prerelease, downgraded to the latest stable release)
- [x] Configure Prisma within the Bun monorepo. (`packages/database`,
      `prisma7.config.ts`, driver adapter `@prisma/adapter-pg` — Prisma 7
      requires an explicit adapter instead of an implicit `DATABASE_URL`
      connection)
- [x] Create User model.
- [x] Create Candidate model.
- [x] Create Recruiter relationship/role model if needed. (skipped a
      separate Recruiter table — `User.role` plus `Job.recruiterId ->
      User.id` is sufficient and avoids an unnecessary 1:1 table)
- [x] Create Job model.
- [x] Create JobStage model.
- [x] Create Application model.
- [x] Create ApplicationStageHistory model.
- [x] Create Resume model.
- [x] Create Interview model.
- [x] Create InterviewScorecard model.
- [x] Create Notification model.
- [x] Create AuditLog model.
- [x] Add relationships.
- [x] Add appropriate unique constraints. (`User.email`,
      `Candidate.userId`, `Candidate.phone`, `(jobId, order)` and
      `(jobId, name)` on `JobStage`, `(candidateId, jobId)` on
      `Application`, `InterviewScorecard.interviewId`)
- [x] Add useful indexes. (foreign key lookups on `Job`, `Application`,
      `ApplicationStageHistory`, `Resume`, `Interview`; `Resume.fileHash`
      for duplicate lookups; `Notification(userId, isRead)`;
      `AuditLog(resourceType, resourceId)`)
- [x] Create initial migration. (`20260830023340_init`)
- [x] Generate Prisma client. (`packages/database/src/generated/prisma`,
      re-exported from `packages/database/src/index.ts` as `prisma`)
- [x] Add seed data where useful. (`prisma/seed.ts` — idempotent
      upserts: one recruiter, one candidate with a resume-less
      application, one job with 6 stages)
- [x] Verify migration from a clean database. (`atcon_ats` was created
      empty moments before `migrate dev --name init` ran against it —
      that already is the clean-database case; skipped an additional
      `migrate reset` since Prisma's CLI flags that as a destructive
      action requiring explicit user consent, and it wasn't needed to
      prove the same thing.)

### Verification

- [x] Database can be initialized cleanly.
- [x] Prisma client works (`prisma.job.count()` via `@atcon/database`
      from `apps/backend`).
- [x] Relationships are understandable.
- [x] Important uniqueness constraints exist.
- [x] Schema matches [architecture/data-model.md](../architecture/data-model.md).
