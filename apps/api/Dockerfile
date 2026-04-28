FROM node:22-alpine AS base
RUN corepack enable pnpm

# Single stage: install deps + copy source in the same image.
# Multi-stage COPY of node_modules fails because pnpm uses symlinks for
# workspace packages (@medsoft/db, @medsoft/shared) that Docker COPY does
# not follow correctly across build stages.
FROM base AS runner
WORKDIR /app
# Install with devDeps so tsx is available at runtime
ENV NODE_ENV=development
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN pnpm install --no-frozen-lockfile
ENV NODE_ENV=production
EXPOSE 3001
CMD ["/app/node_modules/.bin/tsx", "apps/api/src/index.ts"]
