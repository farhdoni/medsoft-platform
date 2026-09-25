/**
 * Soft 3D redesign feature flag — per-account, not per-build.
 *
 * The app is one deployment serving every user (including the phone app,
 * which just opens app.aivita.uz in a WebView), so a build-time flag can't
 * scope this to test accounts — it would be on or off for literally
 * everyone at once. Instead this checks a signed-in account's email
 * against a small allowlist.
 *
 * Pure and environment-agnostic on purpose — this package is built with
 * its own tsconfig (no `process` global, no Node types: it's meant to be
 * usable from the browser-side aivita app too, not just apps/api), and it
 * shouldn't assume Node's env-access mechanism regardless. Each caller
 * reads its own SOFT3D_TEST_ACCOUNTS and passes it in — see
 * apps/aivita/lib/soft3d/flag.ts and apps/api/src/lib/consent-gate.ts for
 * the two thin wrappers that do that (each process reads its own copy of
 * the env var, so it needs to be set on BOTH the aivita and api services
 * in Coolify, not just one).
 *
 * Why an env var and not a DB column: Part A's own rules said not to touch
 * the database at all. A `soft3dEnabled` column would need a migration;
 * this needs none, ships with the same deploy as the code that reads it,
 * and is trivially auditable (one line in Coolify's env config, not a
 * query). If the flag graduates to a real staged rollout later, a DB
 * column with an admin toggle is the natural next step — this just isn't
 * that yet.
 */

export function isSoft3dEnabled(email: string | null | undefined, allowlistCsv: string | null | undefined): boolean {
  if (!email) return false;

  const allowlist = new Set(
    (allowlistCsv ?? '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length > 0),
  );

  return allowlist.has(email.trim().toLowerCase());
}
