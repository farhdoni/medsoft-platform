FROM node:22-alpine AS base
RUN npm install -g pnpm@9

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
# Coolify injects NODE_ENV=production as a build ARG/ENV — pnpm treats that
# as an implicit --prod during install and silently skips devDependencies.
# admin's Dockerfile already guards against this; aivita's build didn't hit
# it directly (next.config has typescript.ignoreBuildErrors: true, so a
# missing typescript package doesn't fail next build) but set it for parity
# and to not depend on that config staying that way.
ENV NODE_ENV=development
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches/ patches/
COPY apps/aivita/package.json apps/aivita/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --no-frozen-lockfile --filter aivita...

COPY . .
# packages/shared's package.json main/exports point at ./dist (gitignored,
# never checked in) — a fresh clone has none until this runs. This is the
# confirmed cause of the first deploy attempt's failure here ("Module not
# found: Can't resolve '@medsoft/shared'"): it worked locally only because a
# previously-built dist/ happened to still be on disk from earlier testing.
RUN pnpm --filter @medsoft/shared build
RUN pnpm --filter aivita build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/aivita/.next/standalone ./
COPY --from=builder /app/apps/aivita/.next/static ./apps/aivita/.next/static
COPY --from=builder /app/apps/aivita/public ./apps/aivita/public
EXPOSE 3000
CMD ["node", "apps/aivita/server.js"]
