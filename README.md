# MedSoft Platform

Monorepo for MedSoft admin panel and API.

## Structure

```
apps/admin    → Next.js 15 admin panel (admin.aivita.uz)
apps/api      → Hono API (api.aivita.uz)
packages/db   → Drizzle ORM schema + migrations
packages/shared → Shared Zod schemas and types
```

## Quick Start

```bash
pnpm install
cp .env.example .env
# fill in .env values

# Run migrations
cd packages/db && pnpm migrate

# Dev
pnpm dev
```

`pnpm install` alone is enough — no separate build step needed before
`pnpm typecheck`, `pnpm dev`, or building an individual app. `packages/db`
and `packages/shared` are consumed by the apps through their compiled
`dist/` output (not their `src/`), so a root `postinstall` hook
(`scripts/bootstrap-workspace-libs.mjs`) builds both automatically right
after install. If you ever see `Cannot find module '@medsoft/db'` (or
`@medsoft/shared`) from a typecheck or dev server, re-run `pnpm install`
at the repo root, or build them directly:

```bash
pnpm --filter @medsoft/shared build
pnpm --filter @medsoft/db build
```

## URLs

- Admin: https://admin.aivita.uz
- API: https://api.aivita.uz/v1/health
