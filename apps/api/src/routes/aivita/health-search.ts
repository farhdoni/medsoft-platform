/**
 * Anonymous health-search logging — infrastructure for a "search by health
 * topic" feature, not tied to any specific UI input yet (none of
 * apps/aivita's screens have a free-text search box today; symptom-checker
 * is a fixed body-map + picklist). Whichever screen adds one later logs to
 * this the same way MessengerHubClient's search calls its own endpoint.
 *
 * Deliberately outside requireAivitaAuth: the whole point is a frequency
 * count with no user_id/patient_id, so there is nothing here for a session
 * to gate — logging is rate-limited by IP instead (same posture as the
 * public clinic-demo-request form).
 *
 * Public:
 *   POST /v1/aivita/health-search/log → { query: string } → anonymous upsert
 *   GET  /v1/aivita/health-search/top → [{query, count, lastSearchedAt}]
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { healthSearchQueries } from '@medsoft/db';
import { desc, sql } from 'drizzle-orm';
import { rateLimit } from '../../middleware/rate-limit.js';

export const healthSearchRouter = new Hono();

/** Trim, collapse whitespace, lowercase, cap length — the same query typed
 * with different spacing/case aggregates into one row instead of scattering
 * across near-duplicates. */
function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 200);
}

const logSchema = z.object({
  query: z.string().trim().min(1).max(300),
});

healthSearchRouter.post(
  '/log',
  rateLimit('health-search-log', 30, 300), // 30 searches / 5 min / IP — generous for a real session, blunt against scripted spam
  zValidator('json', logSchema),
  async (c) => {
    const normalized = normalizeQuery(c.req.valid('json').query);
    if (!normalized) return c.json({ ok: true }); // whitespace-only after trim — nothing to log, not an error

    await db
      .insert(healthSearchQueries)
      .values({ queryNormalized: normalized })
      .onConflictDoUpdate({
        target: healthSearchQueries.queryNormalized,
        set: {
          count: sql`${healthSearchQueries.count} + 1`,
          lastSearchedAt: new Date(),
        },
      });

    return c.json({ ok: true });
  },
);

healthSearchRouter.get('/top', async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 20, 1), 100);

  const rows = await db
    .select({
      query: healthSearchQueries.queryNormalized,
      count: healthSearchQueries.count,
      lastSearchedAt: healthSearchQueries.lastSearchedAt,
    })
    .from(healthSearchQueries)
    .orderBy(desc(healthSearchQueries.count))
    .limit(limit);

  return c.json({ data: rows });
});
