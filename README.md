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

## URLs

- Admin: https://admin.aivita.uz
- API: https://api.aivita.uz/v1/health
