# AIVITA — Architecture

## Monorepo: `medsoft-platform` (GitHub: farhdoni/medsoft-platform)

pnpm workspaces. `pnpm-workspace.yaml` globs `apps/*` and `packages/*`.

```
medsoft-platform/
├── apps/
│   ├── aivita/          Next.js 15 + React 19 — patient AND doctor cabinets (all 30+ features live here)
│   ├── api/             Hono + Drizzle ORM + TypeScript — the backend API
│   ├── admin/           Next.js — admin panel (50+ pages)
│   ├── landing/         Static HTML/CSS/JS — aivita.uz, served by nginx
│   ├── mobile-patient/  Expo (React Native) — thin WebView wrapper around app.aivita.uz
│   └── mobile-doctor/   Expo — WebView wrapper around app.aivita.uz/ru/doctor-home
├── packages/
│   ├── db/              Drizzle schema + migrations
│   └── shared/          Zod schemas + shared constants
└── archived/
    └── aivita-mobile/   DEPRECATED native Expo app. Do not develop; kept for history only.
```

**Mobile apps are WebView wrappers**, not native UIs. New web features in `apps/aivita` appear in the
APKs automatically after a rebuild — no native code changes needed. The patient wrapper package is
`uz.aivita.app`; the doctor wrapper is `uz.aivita.doctor`. Build APKs via EAS (`eas build -p android
--profile preview` → APK). Compiling APKs locally is not possible without the Android SDK; use EAS
(Expo account `farhodni`) or the GitHub Actions workflow.

## Branch model

- `main` — canonical, what Coolify auto-deploys. ALWAYS work from here.
- `master` — deprecated stale subset; slated for deletion. Do not use; never merge `master` into `main`.

## Stack

- Frontend: Next.js 15 (App Router) + React 19 + Tailwind + TypeScript. Routes use `[locale]` segments.
- API: Hono + Drizzle ORM + TypeScript. Routes under `apps/api/src/routes/aivita/*`, `.../admin/*`, `.../payments/*`.
- DB: PostgreSQL 16 + Redis 7.
- AI: Anthropic Claude API, model `claude-sonnet` (4-5 / 4-6) across all AI endpoints.
- Mobile: Expo / React Native WebView wrappers.
- Deploy: Coolify on Contabo VPS, auto-deploy from `main`.

## Domains & ports (production)

| Domain | What | Server binding |
|--------|------|----------------|
| aivita.uz | Landing (static) | nginx static |
| app.aivita.uz | Patient/doctor app | 127.0.0.1:3080 |
| api.aivita.uz | API | 127.0.0.1:3001 (dev API_PORT=4000) |
| admin.aivita.uz | Admin panel | Coolify container |
| start.aivita.uz | MedSoft START (separate repo) | 127.0.0.1:3003 web + :8080 api |

nginx ports are fixed — do not change API (3001) or frontend (3080) bindings.

## Data model (Drizzle, `packages/db/src/schema`)

Core tables include: patients (deposit wallet, EHR: allergies/chronic/meds, blood group, PINFL, minor
+ guardian), doctors, clinics, appointments (telemedicine_video/chat, offline, home_visit), transactions
(providers: click/payme/uzcard/humo/internal_deposit), ai_logs (intent/outcome, model, latency),
sos_calls (geo + EHR snapshot + dispatch), audit_logs, admin_users (+ sessions, TOTP 2FA).

## MedSoft integration (AIVITA ↔ clinics)

- AIVITA → MedSoft: `POST /aivita/referral` (patient + medical record), plus `GET /aivita/doctors`, `/slots`, `/services`.
- MedSoft → AIVITA: webhooks `appointment.completed`, `lab_results.ready`, `medical_record.created`, `invoice.paid`.
- Auth header: `X-Aivita-Key`. Fallback: polling every 15 min for on-premise clinics behind NAT.
- Medical-record numbering: AIVITA `AI-2026-XXXXX`; MedSoft `{CLINIC_PREFIX}-{YEAR}-{XXXXX}`; linked via `clinic_patient_links` + `patient_external_ids`.
