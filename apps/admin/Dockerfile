FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
# Stub package.json for ALL workspace members so pnpm can build its workspace
# graph without needing the full source of every package.
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json     ./packages/db/
COPY apps/admin/package.json      ./apps/admin/
COPY apps/api/package.json        ./apps/api/
RUN pnpm install --no-frozen-lockfile --ignore-scripts
# Overwrite stubs with full source for what we actually build
COPY packages/shared ./packages/shared
COPY apps/admin      ./apps/admin
# packages/shared's package.json main/exports point at ./dist (built output,
# gitignored) — never checked in, so a fresh clone has no dist until this
# runs. Locally this went unnoticed because a previously-built dist/ was
# still sitting on disk; a clean checkout (what Coolify always builds from)
# has none. admin doesn't currently import @medsoft/shared directly (only
# lists it in next.config transpilePackages) so this hasn't broken admin's
# build yet, but build it anyway for consistency with the actual contract.
RUN pnpm --filter @medsoft/shared build
WORKDIR /app/apps/admin
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static     ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public           ./apps/admin/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/admin/server.js"]
