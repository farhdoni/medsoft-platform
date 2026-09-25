/**
 * Soft 3D redesign feature flag — per-account, not per-build.
 *
 * The app is one deployment serving every user (including the phone app,
 * which just opens app.aivita.uz in a WebView), so a build-time flag can't
 * scope this to test accounts — it would be on or off for literally
 * everyone at once. Instead this checks the signed-in session's email
 * against a small allowlist.
 *
 * Why an env var and not a DB column: Part A's own rules say not to touch
 * the database. A `soft3dEnabled` column would need a migration; this
 * needs none, ships with the same deploy as the code that reads it, and is
 * trivially auditable (one line in Coolify's env config, not a query). If
 * the flag graduates to a real staged rollout later, a DB column with an
 * admin toggle is the natural next step — this just isn't that yet.
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
