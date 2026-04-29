FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aivita/package.json apps/aivita/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter aivita build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/aivita/.next/standalone ./
COPY --from=builder /app/apps/aivita/.next/static ./apps/aivita/.next/static
COPY --from=builder /app/apps/aivita/public ./apps/aivita/public
EXPOSE 3000
CMD ["node", "apps/aivita/server.js"]
