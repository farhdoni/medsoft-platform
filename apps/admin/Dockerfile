FROM node:22-alpine AS base
RUN corepack enable pnpm

# deps + build in one stage to avoid cross-stage pnpm symlink issues
FROM base AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin
RUN pnpm install --no-frozen-lockfile
WORKDIR /app/apps/admin
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/admin/server.js"]
