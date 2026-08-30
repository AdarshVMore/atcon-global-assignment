# Phase 0 — Repository and Architecture Foundation

[← Back to index](README.md)

## Goal

Understand the assignment and establish the backend monorepo foundation.

### Tasks

- [x] Read the assignment PDF completely.
- [x] Read `CLAUDE.md`.
- [x] Read `architecture/README.md`.
- [x] Inspect the existing repository before modifying anything.
- [x] Inspect existing Git configuration.
- [x] Confirm Git `user.name`. (`AdarshVMore`)
- [x] Confirm Git `user.email`. (`skullcrushermore@gmail.com`)
- [x] Confirm no Claude identity/co-author configuration is present.
- [x] Initialize Bun workspace monorepo if required.
- [x] Create `apps/backend`.
- [x] Create `packages/database` only if useful. (created — Prisma
      schema/client land here in Phase 1)
- [x] Create `packages/shared` only if useful. (skipped — no second
      consumer exists yet; only `apps/backend` runs today. Revisit once
      a real cross-package sharing need appears.)
- [x] Configure TypeScript.
- [x] Configure Bun scripts.
- [x] Configure environment variables.
- [x] Add `.gitignore`.
- [x] Add basic README.
- [x] Add basic backend bootstrap.
- [x] Confirm backend starts.
- [x] Confirm TypeScript checking works.
- [x] Update this phase status.
- [x] Create checkpoint commit.

### Architecture Note

The repository previously had `server/` (an untouched `bun init` scaffold
with no real code) and an empty `client/` directory, which didn't match
the documented `apps/backend` + `packages/*` layout. Both were removed —
nothing in them was worth preserving — and the documented layout was
built fresh instead of adjusting the docs to match a placeholder.

### Verification

- [x] Backend starts (`bun run start` in `apps/backend`, `GET /health`
      returns `{"status":"ok"}`).
- [x] TypeScript passes (`bunx tsc --noEmit` in `apps/backend`, exit 0).
- [x] Monorepo structure is understandable.
- [x] No unnecessary packages were introduced.
- [x] Git identity is the user's existing identity.
