FROM node:22-alpine AS base
# Pin pnpm to v9 (matches lockfileVersion 9.0); corepack defaults to v11 which breaks
RUN npm install -g pnpm@9

# ─── builder: full install (with devDeps) + compile db/shared/api to dist ──────
FROM base AS builder
WORKDIR /app
# Coolify injects NODE_ENV=production as a build ARG/ENV on every stage (it's
# the runtime env var, but Docker ARGs/ENVs from earlier in the file leak
# forward). pnpm treats NODE_ENV=production as an implicit --prod during
# install, silently skipping devDependencies — including typescript, which
# the build step below needs. Force it back for this stage; the runner stage
# below sets NODE_ENV=production again for the actual runtime. The old
# single-stage Dockerfile had this same line for the same reason — lost when
# this stage was split out, which is exactly what broke the first deploy
# attempt (`tsc: not found`).
ENV NODE_ENV=development
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY patches/ patches/
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN pnpm install --no-frozen-lockfile --filter @medsoft/api...
# db/shared must be compiled before api — api resolves them via their
# package.json main/exports, which point at ./dist, not ./src.
RUN pnpm --filter @medsoft/shared build \
 && pnpm --filter @medsoft/db build \
 && pnpm --filter @medsoft/api build

# `pnpm deploy` (not `pnpm prune --prod` / a second `--filter --prod` install —
# both tried and rejected, see git history) is pnpm's own purpose-built answer
# to "isolate one workspace package + its prod deps for Docker". Under this
# repo's node-linker=hoisted + shamefully-hoist=true (.npmrc), a plain
# `--filter @medsoft/api... --prod` install does NOT scope down: it hoists
# from the whole lockfile, so next/react-native/@expo/lucide-react — every
# other app's deps — land in node_modules regardless of the filter (measured:
# 1.36GB, ~300MB of it unrelated frontend/mobile weight). `deploy` sidesteps
# hoisting entirely: it materializes @medsoft/api's OWN resolved dependency
# subgraph (workspace deps included, as real files, not symlinks) into an
# isolated directory. Marked "Experimental!" by pnpm 9 — noted, not a blocker
# for a local/CI build step.
#
# root package.json's pnpm.patchedDependencies (react-native-health-connect,
# for the mobile apps) has no target in @medsoft/api's own dependency graph —
# deploy's isolated resolution fails hard (ERR_PNPM_PATCH_NOT_APPLIED) if a
# declared patch's package isn't present, unlike the hoisted install above,
# which happens to pull in the whole workspace graph anyway. Strip it before
# deploy; this only touches this build layer's copy of package.json.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.pnpm.patchedDependencies;fs.writeFileSync('package.json',JSON.stringify(p,null,2))" \
 && pnpm --filter=@medsoft/api deploy --prod /app/deploy

# ─── runner: no pnpm, no devDeps, no .ts source — just compiled dist + prod deps
FROM node:22-alpine AS runner
WORKDIR /app

# Deploy output lands flat (package.json, dist/, node_modules/ at its root) —
# nest it back under apps/api/ so the migration runner's __dirname-relative
# path math (3 levels up from apps/api/dist/index.js -> repo root) still
# holds, same as running node straight from a checked-out repo.
WORKDIR /app/apps/api
COPY --from=builder /app/deploy ./

# Migration runner reads these from disk at runtime (path.resolve from
# apps/api/dist/index.js, 3 levels up -> /app/packages/db/migrations).
COPY packages/db/migrations /app/packages/db/migrations

ENV NODE_ENV=production
EXPOSE 3001

# curl isn't in this image; wget (BusyBox) is. start-period=90s covers a
# generous margin for a heavy pending migration batch — /v1/health itself
# hits nothing but the event loop, so 30s-interval polling costs nothing.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget --spider -q http://localhost:3001/v1/health || exit 1

CMD ["node", "dist/index.js"]
