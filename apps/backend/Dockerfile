# Builds the backend API and worker from the same image — docker-compose
# picks which one a given container runs by overriding `command`. Build
# context is the repo root (not this directory), since this is a Bun
# workspace: the backend depends on packages/database as a workspace
# package, and `bun install` needs every workspace member's package.json
# present to reconcile against the root bun.lock, even ones this image
# never runs code from.

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
COPY packages/database packages/database
COPY apps/backend apps/backend

# prisma generate reads the schema and emits client code — it doesn't
# connect to a database — but the config file (prisma7.config.ts) calls
# process.loadEnvFile(".env") and reads DATABASE_URL unconditionally, so
# both need to at least exist at build time.
RUN touch packages/database/.env
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN cd packages/database && bunx prisma generate

FROM build AS runtime
WORKDIR /app/apps/backend
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
