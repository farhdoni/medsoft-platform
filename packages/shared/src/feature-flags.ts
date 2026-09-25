/**
 * Soft 3D redesign feature flag — per-account, not per-build.
 *
 * The app is one deployment serving every user (including the phone app,
 * which just opens app.aivita.uz in a WebView), so a build-time flag can't
 * scope this to test accounts — it would be on or off for literally
 * everyone at once. Instead this checks a signed-in account's email
 * against a small allowlist.
 *
 * Lives in @medsoft/shared (not just apps/aivita/lib/soft3d/flag.ts, which
 * now just re-exports this) because apps/api needs the exact same decision
 * for server-side enforcement (see onboarding-ladder.ts's consent guard,
 * Part B) — two independent copies of an allowlist parser would drift.
 * Reads SOFT3D_TEST_ACCOUNTS from whichever process calls it, so this env
 * var needs to be set on BOTH the aivita and api services in Coolify, not
 * just aivita.
 *
 * Why an env var and not a DB column: Part A's own rules said not to touch
 * the database at all. A `soft3dEnabled` column would need a migration;
 * this needs none, ships with the same deploy as the code that reads it,
 * and is trivially auditable (one line in Coolify's env config, not a
 * query). If the flag graduates to a real staged rollout later, a DB
 * column with an admin toggle is the natural next step — this just isn't
 * that yet.
 */

const raw = process.env.SOFT3D_TEST_ACCOUNTS ?? '';

const allowlist = new Set(
  raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export function isSoft3dEnabled(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowlist.has(email.trim().toLowerCase());
}
