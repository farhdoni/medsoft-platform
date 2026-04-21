# MedSoft Platform — monorepo

pnpm workspaces monorepo for MedSoft Admin Panel.

## Structure

- `apps/admin` — Next.js 15 admin panel (admin.aivita.uz)
- `apps/api` — Hono API (api.aivita.uz)
- `packages/db` — Drizzle ORM schema + migrations
- `packages/shared` — Shared Zod schemas and types

## Setup

```bash
pnpm install
cp .env.example .env
# Fill .env with real values

# Generate JWT keys
node -e "const {generateKeyPairSync}=require('crypto');const{privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});console.log(privateKey.export({type:'pkcs8',format:'pem'}));console.log('---');console.log(publicKey.export({type:'spki',format:'pem'}))"

# Run migrations
cd packages/db && pnpm migrate

# Start dev
pnpm --filter @medsoft/api dev
pnpm --filter @medsoft/admin dev
```
