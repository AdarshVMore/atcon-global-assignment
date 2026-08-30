# Phase 2 — Backend Foundation

[← Back to index](README.md)

## Goal

Build the basic class-oriented backend structure.

### Tasks

- [x] Create backend server. (`src/server.ts`)
- [x] Create application bootstrap. (`bootstrap()` in `src/server.ts`:
      verifies the database, then starts `Bun.serve`)
- [x] Create configuration handling. (`src/config/env.ts` — typed
      config, fails fast if `DATABASE_URL`/`JWT_SECRET` are missing)
- [x] Create database client. (`src/database/client.ts` re-exports the
      `@atcon/database` singleton and adds `verifyDatabaseConnection()`)
- [x] Create HTTP error handling. (`src/shared/http/HttpError.ts` +
      `withErrorHandling()` wrapper that maps thrown `HttpError`
      subclasses to their status code and anything else to a 500
      without leaking internals)
- [x] Create request/response types. (`src/shared/http/types.ts`)
- [x] Create controller structure. (`*.controller.ts` — thin, calls a
      service, returns a `Response`)
- [x] Create service structure. (`*.service.ts` — business/infra logic)
- [x] Create repository structure. (deferred until a module has real
      persistence logic to encapsulate — see Architecture Note below)
- [x] Create authentication infrastructure. (`src/auth/types.ts` —
      `AuthenticatedUser` shape only; registration/login/middleware are
      Phase 3's job, not duplicated here)
- [x] Create health endpoint. (`GET /health`, backed by
      `HealthController` → `HealthService` → real `SELECT 1`)
- [x] Add basic logging. (`src/shared/logger.ts`, structured JSON lines)
- [x] Add test setup. (`bun test` — `withErrorHandling.test.ts`,
      `health.controller.test.ts`)
- [x] Verify PostgreSQL connection. (bootstrap fails fast if the
      database is unreachable; `/health` returns 503 `degraded` if a
      later check fails)
- [x] Verify application startup. (`bun run start` → DB check logged,
      `GET /health` → `200 {"status":"ok"}`)

### Architecture Note

No `HealthRepository` was created. The health check is a single
`SELECT 1` with no domain persistence logic to encapsulate, so
`HealthService` talks to Prisma directly — a repository here would be an
abstraction with no practical benefit. The Controller → Service →
Repository chain gets established for real starting Phase 3
(`UserRepository`) and Phase 4 (`JobRepository`), where there's actual
query logic worth isolating.

### Verification

- [x] Backend starts.
- [x] Database connects.
- [x] Health endpoint works.
- [x] Class responsibilities are clear.
- [x] No unnecessary abstraction layers exist.
