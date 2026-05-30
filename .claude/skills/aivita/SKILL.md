---
name: aivita
description: >
  Project context, architecture, design system, and engineering rules for AIVITA — the AI health
  platform for Uzbekistan (monorepo `medsoft-platform`: patient/doctor web cabinet `apps/aivita`,
  Hono API `apps/api`, admin panel, landing, and Expo WebView mobile wrappers). ALWAYS consult this
  skill before writing or editing ANY code, schema, screen, or config in this project — whenever the
  user mentions AIVITA, aivita.uz, app.aivita.uz, api.aivita.uz, admin.aivita.uz, medsoft-platform,
  the patient or doctor cabinet, Health Score, the AI chat/checkup/symptom-checker, the mobile APKs,
  or the MedSoft integration. It encodes conventions (branch model, "0 TS errors", "never push without
  permission", nginx ports, i18n, Soft Clay Matte design tokens, payment model) that are NOT guessable
  and easy to get wrong from memory. Use it even for small changes; consistency is the whole point.
---

# AIVITA — Project Skill

AIVITA is an **AI-first health ecosystem for Uzbekistan**. The product thesis drives every decision:
the app collects the deepest possible picture of a patient's health, the AI turns it into fast,
effective guidance, and real doctors/clinics plug in (doctor cabinet inside AIVITA + MedSoft
automation for clinics). Results flow back via integration and enrich the health picture again.

**North-star filter for any feature or change.** It must serve at least one of:
1. collect more / higher-quality health data,
2. shorten the path from "something feels off" to effective help,
3. strengthen the doctor/clinic side of the ecosystem.
If a change serves none of these, question its priority before building it.

## Golden rules (do not violate)

- **Never `git push`, merge to `main`, deploy, SSH, run prod migrations, or operate Coolify/Portainer/n8n without explicit permission.** Coolify auto-deploys `main` on the Contabo VPS, so merging to `main` *is* deploying. Prepare commands/diffs; the user runs anything that touches the live system.
- **`main` is the only source of truth.** `master` is a deprecated stale subset (scheduled for deletion). Always work from `main`.
- **Zero TypeScript errors and a passing build before any commit.** Run typecheck/build first.
- **Design changes require a preview the user approves before they hit code.** Build a self-contained HTML/React preview, present it, wait for "ok", then implement.
- **No secrets in the repo or in this skill.** DB passwords, API keys, the Telegram bot token, JWT keys, payment secrets live only in env / a vault / Coolify secrets. If a secret appears in committed code, flag it and rotate it.
- **i18n is mandatory:** every user-facing string ships in `ru`, `uz`, `en` (next-intl; locale via `NEXT_LOCALE` cookie and `[locale]` route segment).
- **AI model is `claude-sonnet` (4-5 / 4-6) for ALL AI endpoints** — chat, checkup, symptom-checker, nutrition, scribe. Not Haiku. Consult the `product-self-knowledge` skill for correct Anthropic API usage (tool use, streaming, limits).

## Reference files — read the relevant one before working

- **`references/architecture.md`** — monorepo layout, stack, domains/ports, branch model, MedSoft integration. Read before touching structure, the API, deployment, or the integration.
- **`references/design-system.md`** — Soft Clay Matte tokens, fonts, layout, component rules, and the legacy-vs-canon note. Read before any UI/visual work.
- **`references/conventions.md`** — commit/deploy flow, copy formats (streak/adherence/medication course), logo rules, performance/offload guidance. Read before front-end or content work.
- **`references/payments.md`** — the agreed payment model (patient wallet + batch payouts) and webhook security requirements. Read before any payments work.

## Typical workflow in this project

1. Re-clone `main` of `medsoft-platform` (public read) — it is always current; don't rely on a stale local copy.
2. Read the relevant reference file(s) above.
3. Make changes on a feature branch, never directly on `main`.
4. Typecheck + build; keep it green.
5. For UI: produce an approved preview first.
6. Hand the user a clean diff/branch + exact commands; they push/deploy.
