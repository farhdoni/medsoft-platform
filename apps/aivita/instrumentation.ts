// Next.js's supported hook for process-level setup that runs once when the
// server starts (not per-request) — see
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Exists because of the 2026-09-18 incident: aivita hung for 72 minutes
// (94% CPU, zero requests served) with nothing in the logs beyond the last
// request that was being handled when it happened — no error, no
// stacktrace, nothing to point at a cause. A crash that nobody logs is a
// crash nobody can diagnose.
//
// uncaughtException and unhandledRejection are registered with a listener
// that logs the full stack trace AND THEN exits the process (see the
// reasoning below) — this can run in the Node.js runtime only, guarded by
// NEXT_RUNTIME, since register() also fires for the Edge runtime in apps
// that use it (this one doesn't have Edge routes today, but the guard
// costs nothing and protects against a future one silently breaking this).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Deliberately log-then-exit, not log-and-keep-running: Node's own docs
  // say resuming normal operation after uncaughtException isn't safe, and
  // — more concretely for this incident — a handler that just swallows the
  // error and lets the process limp on is exactly how you'd get another
  // silent, unrecoverable hang with nothing forcing a restart. Exiting
  // lets Coolify/Docker's restart policy recover automatically, now with a
  // logged stack trace explaining why, instead of a silent freeze an
  // operator only notices from user reports or an external monitor.
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    process.exit(1);
  });
}
