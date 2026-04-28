FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
# Force development mode so devDependencies (typescript, etc.) are installed
ENV NODE_ENV=development
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
# Copy workspace package sources BEFORE pnpm install so that symlinks
# resolve to full source (Docker COPY follows symlinks when copying node_modules).
COPY packages/shared ./packages/shared
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Workspace root files needed so pnpm resolves binaries from root node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
# hoisted linker puts everything in root node_modules — no per-package node_modules dirs exist
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin
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
