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
# Copy node_modules from deps stage (tsx runs TS directly — no compile step)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
# Copy source code
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
# Docker COPY follows symlinks, so node_modules/@medsoft/* only got the package.json
# snapshot from the deps stage (no src/). Re-create symlinks to the real source.
RUN rm -rf /app/node_modules/@medsoft/db /app/node_modules/@medsoft/shared \
    && ln -s /app/packages/db    /app/node_modules/@medsoft/db \
    && ln -s /app/packages/shared /app/node_modules/@medsoft/shared
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node_modules/.bin/tsx", "src/index.ts"]
