FROM node:22-alpine AS base
RUN npm install -g pnpm@9

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# root "postinstall" (scripts/bootstrap-workspace-libs.mjs) needs to exist
# for `pnpm install` below to find it — it no-ops here anyway (no
# tsconfig.build.json yet at this stub-only layer, see that script's own
# comment) but a missing file makes postinstall itself fail the whole step.
COPY scripts/bootstrap-workspace-libs.mjs scripts/bootstrap-workspace-libs.mjs
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
# Coolify passes this as a build ARG on every deployment — converting it to
# an ENV here is what makes it readable at runtime via process.env in
# app/api/health/route.ts. Defaults to 'unknown', never fails the build.
ARG SOURCE_COMMIT=unknown
ENV SOURCE_COMMIT=$SOURCE_COMMIT
# Found while verifying the HEALTHCHECK below: Next.js standalone's own
# server.js binds to `process.env.HOSTNAME || '0.0.0.0'` — and Docker
# ALWAYS sets HOSTNAME to the container's short ID by default, so that
# fallback never triggers. The server ends up listening only on the
# container's assigned network IP, never on loopback — external traffic
# through Docker's own port-mapping/NAT still reaches it fine (that's why
# this went unnoticed), but anything hitting localhost/127.0.0.1 FROM
# INSIDE the same container — exactly what a Docker HEALTHCHECK CMD does —
# gets connection refused. This ENV overrides Docker's own HOSTNAME for
# the running process, same fix as the well-documented public issues for
# this exact Next.js-standalone-in-Docker gotcha.
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/aivita/.next/standalone ./
COPY --from=builder /app/apps/aivita/.next/static ./apps/aivita/.next/static
COPY --from=builder /app/apps/aivita/public ./apps/aivita/public
EXPOSE 3000
# wget (BusyBox), not curl — this image doesn't have curl (see apps/api's
# Dockerfile, same reasoning). /api/health does no I/O of its own (see that
# route's comment) — a stuck response here means the event loop itself
# can't run the callback, which is the actual failure mode from the
# 2026-09-18 incident. start-period=30s is generous relative to this app's
# own observed ~100-300ms cold start.
#
# 127.0.0.1, not localhost — verified live: BusyBox wget resolves
# "localhost" to the IPv6 loopback (::1) first in this image, but the
# HOSTNAME fix above only put the server on the IPv4 any-address
# (0.0.0.0:3000), not the IPv6 one — "localhost" got connection-refused
# even with the server correctly listening, while an explicit 127.0.0.1
# worked immediately. Sidesteps the resolution question entirely.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/aivita/server.js"]
