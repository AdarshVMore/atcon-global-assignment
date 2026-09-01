# Build context is the repo root — see apps/backend/Dockerfile for why
# (Bun workspace, every member's package.json needs to be present for
# `bun install --frozen-lockfile` to reconcile against the root bun.lock).
# The frontend never imports @atcon/database — it talks to the backend
# over HTTP only — so unlike the backend image, no Prisma client
# generation happens here.

FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/database/package.json packages/database/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/frontend apps/frontend
RUN cd apps/frontend && bun run build

FROM build AS runtime
WORKDIR /app/apps/frontend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["bun", "run", "start"]
