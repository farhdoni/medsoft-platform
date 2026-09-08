/**
 * Admin-facing analytics summary for /reports in apps/admin — a Yandex
 * Metrika top-line summary (iframe vs Reporting API decision below) plus the
 * health-search aggregate (packages/db/src/schema/aivita.ts:healthSearchQueries).
 *
 * Metrika dashboard: Reporting API, not an iframe.
 *   Yandex Metrika's own dashboard UI does not support unauthenticated
 *   embedding — it is a login-walled Yandex product with no public-share
 *   mode (unlike, say, a Grafana panel), and most login-walled dashboards
 *   also refuse to be framed at all (X-Frame-Options/CSP on Yandex's own
 *   side). Framing it would show admin staff a Yandex login screen, not a
 *   dashboard, unless every one of them separately manages a Yandex account
 *   with access to this counter — not a real option for MedSoft staff.
 *   The Reporting API (server-to-server, an OAuth token) returns plain
 *   numbers this route renders as native cards matching the rest of the
 *   admin panel, and it degrades to an honest "not connected" state instead
 *   of a fake number when the token or counter isn't configured — same
 *   posture as the payment-provider "mock mode" badge elsewhere in
 *   apps/admin/src/app/(admin)/finance/settings.
 */
import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { landingConfig, healthSearchQueries } from '@medsoft/db';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = new Hono();
router.use('*', requireAuth);

const METRIKA_TOKEN = process.env.YANDEX_METRIKA_TOKEN;

type MetrikaSummary =
  | { configured: false }
  | { configured: true; visits: number; users: number; pageviews: number; periodDays: number };

async function fetchMetrikaSummary(): Promise<MetrikaSummary> {
  if (!METRIKA_TOKEN) return { configured: false };

  const [row] = await db.select().from(landingConfig).where(eq(landingConfig.key, 'current')).limit(1);
  const counterId = (row?.payload as Record<string, unknown> | undefined)?.yandex_metrika_id;
  if (!counterId || !String(counterId).trim()) return { configured: false };

  const periodDays = 30;
  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.searchParams.set('ids', String(counterId));
  url.searchParams.set('metrics', 'ym:s:visits,ym:s:users,ym:s:pageviews');
  url.searchParams.set('date1', `${periodDays}daysAgo`);
  url.searchParams.set('date2', 'today');

  try {
    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${METRIKA_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { configured: false };
    const json = (await res.json()) as { data?: Array<{ metrics: number[] }> };
    const metrics = json.data?.[0]?.metrics;
    if (!metrics) return { configured: false };
    const [visits, users, pageviews] = metrics;
    return { configured: true, visits: visits ?? 0, users: users ?? 0, pageviews: pageviews ?? 0, periodDays };
  } catch {
    return { configured: false };
  }
}

router.get('/metrika-summary', async (c) => {
  return c.json({ data: await fetchMetrikaSummary() });
});

router.get('/health-search-summary', async (c) => {
  const [totals] = await db
    .select({
      uniqueQueries: sql<number>`count(*)::int`,
      totalSearches: sql<number>`coalesce(sum(${healthSearchQueries.count}), 0)::int`,
    })
    .from(healthSearchQueries);

  const top = await db
    .select({
      query: healthSearchQueries.queryNormalized,
      count: healthSearchQueries.count,
      lastSearchedAt: healthSearchQueries.lastSearchedAt,
    })
    .from(healthSearchQueries)
    .orderBy(desc(healthSearchQueries.count))
    .limit(20);

  return c.json({
    data: {
      uniqueQueries: totals?.uniqueQueries ?? 0,
      totalSearches: totals?.totalSearches ?? 0,
      top,
    },
  });
});

export const aivitaAdminAnalyticsRouter = router;
