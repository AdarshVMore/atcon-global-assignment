# Frontend

Next.js (App Router) frontend for the ATS. See
[docs/frontend-architecture.md](../../docs/frontend-architecture.md) and
[docs/frontend-design.md](../../docs/frontend-design.md) for the intended
structure and design direction, and
[docs/frontend-phases.md](../../docs/frontend-phases.md) for implementation
progress.

## Local Setup

```bash
cp .env.example .env.local
bun install   # from the repo root, installs all workspaces
bun run dev   # from this directory — starts on http://localhost:3001
```

The dev server runs on port 3001, not Next's default 3000, since the
backend (`apps/backend`) already uses 3000.

## Environment Variables

- `NEXT_PUBLIC_API_URL` — base URL of the backend API (defaults to
  `http://localhost:3000` if unset).

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand.

## Commands

```
bun run dev         # start with Turbopack
bun run build        # production build
bun run start         # run the production build
bun run lint          # eslint
bun run typecheck    # tsc --noEmit
```
