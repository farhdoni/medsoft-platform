// External healthcheck target — see the Dockerfile's HEALTHCHECK directive
// and this task's own report for the matching Coolify panel parameters.
//
// 2026-09-18: aivita hung for 72 minutes (94-105% CPU, event loop
// apparently blocked) with nothing external polling to notice — the C1
// stream watchdog from that same release only aborts a stuck *await*, so
// it can't help at all if the block is genuinely synchronous (a blocked
// event loop can't even run its own setTimeout callback). An external
// check is the only thing that can catch that case, which is the entire
// point of this route: it does no I/O (no DB, no outbound fetch) — the
// only thing that can stop it from answering is the JS event loop itself
// being unable to run this callback, which is exactly the failure mode a
// wrapper (Docker's HEALTHCHECK, Coolify) is watching for. A response
// served from any kind of cache would silently defeat this — hence
// `dynamic = 'force-dynamic'` below and the explicit no-store header.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Module-scope — set once when this server process starts, not per
// request, so uptimeSeconds reflects the actual process lifetime.
const startedAt = Date.now();

export async function GET() {
  return Response.json(
    {
      status: 'ok',
      // Coolify sets SOURCE_COMMIT as a build ARG for every deployment;
      // wired into ENV in the Dockerfile's runner stage below. Falls back
      // to 'unknown' rather than failing the response if that ever isn't
      // set (e.g. a manual `docker build` without the ARG).
      commit: process.env.SOURCE_COMMIT ?? 'unknown',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  );
}
