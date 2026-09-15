FROM node:22-alpine AS base
# Pin pnpm to v9 (matches lockfileVersion 9.0); corepack defaults to v11 which breaks
RUN npm install -g pnpm@9

# Single stage: install deps + copy source in the same image.
# Multi-stage COPY of node_modules fails because pnpm uses symlinks for
# workspace packages (@medsoft/db, @medsoft/shared) that Docker COPY does
# not follow correctly across build stages.
FROM base AS runner
WORKDIR /app
# Install with devDeps so tsx is available at runtime
ENV NODE_ENV=development
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY patches/ patches/
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN pnpm install --no-frozen-lockfile --filter @medsoft/api...
ENV NODE_ENV=production
EXPOSE 3001

# curl isn't in this image; wget (BusyBox) is. start-period=90s covers a cold
# tsx/esbuild boot (~7s observed) plus a generous margin for a heavy pending
# migration batch — /v1/health itself hits nothing but the event loop, so
# 30s-interval polling costs nothing.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget --spider -q http://localhost:3001/v1/health || exit 1

CMD ["/app/node_modules/.bin/tsx", "apps/api/src/index.ts"]
