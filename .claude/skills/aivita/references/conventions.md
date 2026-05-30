# AIVITA — Engineering Conventions

## Commit & deploy flow

- Work on a feature branch off `main`. Never commit directly to `main`.
- Before committing: zero TypeScript errors (`pnpm -r typecheck`) and a passing build.
- Conventional-style commit messages (`feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`).
- **Never push or merge without explicit user permission.** Coolify auto-deploys `main`, so a merge to `main` ships to production immediately. Hand over a clean branch/diff + the exact `git` commands; the user executes the push and any server-side step.
- nginx port bindings are fixed: API `127.0.0.1:3001`, frontend `127.0.0.1:3080`. Do not change.

## Copy / formatting standards (user-facing)

- Streak: `🔥 X дней без пропуска!`
- Adherence: `📊 Выполнение: X%`
- Medication course: a progress bar plus `X/Y дней`.
- All strings localized in ru / uz / en.

## Security hygiene

- No secrets in committed code. Use env vars / Coolify secrets. `docker-compose.yml` must reference `${VAR}`, never literal passwords, and bind internal services (Postgres 5432, Redis 6379) to `127.0.0.1` only.
- Payment webhooks must verify the caller and validate amount vs. stored order (see `payments.md`).
- Admin actions are auditable (`audit_logs`); keep that intact.
- If any credential has ever been committed or pasted in plaintext, treat it as compromised and rotate it.

## Performance: offload to the client where safe

Goal: reduce server load and latency, scaling work to the device's capability (`navigator.deviceMemory`,
`hardwareConcurrency`) with graceful degradation for low-end Android (common in UZ).

Safe to move to the device:
- image preprocessing (resize/compress nutrition & document photos before upload),
- aggressive caching via PWA / service worker; local-first data with background sync,
- heavy rendering/computation in web workers,
- lightweight on-device ML (e.g. TensorFlow.js) for pre-filtering/OCR.

Must stay server-side:
- the medical AI (claude-sonnet) — never on-device, for safety, consistency, and feasibility,
- anything that authorizes payments or touches PII beyond what the user already holds.

## When unsure

Apply the north-star filter (more/better health data · faster effective help · stronger doctor/clinic
side). Prefer perfecting the core loop (AI triage → medical card + QR → real doctor → results back)
over adding breadth. Flag, don't silently fix, anything that looks like a security hole.
