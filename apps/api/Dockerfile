FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
# Force development mode so devDependencies (tsx, typescript) are installed
ENV NODE_ENV=development
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --no-frozen-lockfile

FROM node:22-alpine AS runner
RUN corepack enable pnpm
WORKDIR /app
ENV NODE_ENV=production
# Copy all source and node_modules (tsx runs TS directly)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node_modules/.bin/tsx", "src/index.ts"]
