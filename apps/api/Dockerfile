FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
# Force development mode so devDependencies (tsx, typescript) are installed
ENV NODE_ENV=development
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
# Copy workspace package sources BEFORE pnpm install so that the symlinks
# pnpm creates (e.g. node_modules/@medsoft/db -> /app/packages/db) resolve
# to the full source tree. Docker COPY later follows those symlinks and
# therefore copies the real src/ into the runner image.
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api/package.json ./apps/api/
RUN pnpm install --no-frozen-lockfile

FROM node:22-alpine AS runner
RUN corepack enable pnpm
WORKDIR /app
ENV NODE_ENV=production
# hoisted linker puts everything in root node_modules — no per-package node_modules dirs exist
COPY --from=deps /app/node_modules ./node_modules
# Copy latest source (same commit, ensures freshness)
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
WORKDIR /app
EXPOSE 3001
CMD ["/app/node_modules/.bin/tsx", "apps/api/src/index.ts"]
