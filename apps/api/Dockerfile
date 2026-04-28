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
# node_modules/@medsoft/* are real directories here (Docker resolved symlinks)
# containing the full source because packages were present in deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
# Copy latest source (same commit, ensures freshness)
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node_modules/.bin/tsx", "src/index.ts"]
