/**
 * Landing CMS API
 * Public: GET /v1/landing/content/:locale — cached with Redis (5 min TTL)
 * Admin:  GET/PATCH under /v1/aivita-admin/cms/* — require auth
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, landingContent, adminUsers } from '@medsoft/db';
import { eq, and, asc } from 'drizzle-orm';
import { redis } from '../lib/redis.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLogs } from '@medsoft/db';

const VALID_LOCALES = ['ru', 'uz', 'en'] as const;
const CACHE_TTL = 300; // 5 minutes

function cacheKey(locale: string) { return `landing:${locale}`; }

// ─── Grouped content type ─────────────────────────────────────────────────────

type GroupedContent = Record<string, Record<string, string>>;

function groupContent(rows: typeof landingContent.$inferSelect[]): GroupedContent {
  return rows.reduce<GroupedContent>((acc, row) => {
    if (!acc[row.section]) acc[row.section] = {};
    acc[row.section][row.key] = row.value;
    return acc;
  }, {});
}

// ─── Public router ────────────────────────────────────────────────────────────

export const landingPublicRouter = new Hono();

landingPublicRouter.get('/content/:locale', async (c) => {
  const locale = c.req.param('locale');
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    return c.json({ error: 'Invalid locale' }, 400);
  }

  // Try cache first
  try {
    const cached = await redis.get(cacheKey(locale));
    if (cached) return c.json(JSON.parse(cached));
  } catch { /* redis down — continue */ }

  const rows = await db
    .select()
    .from(landingContent)
    .where(and(eq(landingContent.locale, locale), eq(landingContent.isPublished, true)))
    .orderBy(asc(landingContent.section), asc(landingContent.key));

  const grouped = groupContent(rows);

  // Cache result
  try { await redis.setex(cacheKey(locale), CACHE_TTL, JSON.stringify(grouped)); } catch { /* non-fatal */ }

  return c.json(grouped);
});

// ─── Admin router ─────────────────────────────────────────────────────────────

export const landingAdminRouter = new Hono();
landingAdminRouter.use('*', requireAuth);

// List all content for a locale (flat list for editing)
landingAdminRouter.get('/content', async (c) => {
  const locale = c.req.query('locale') ?? 'ru';
  const rows = await db
    .select()
    .from(landingContent)
    .where(eq(landingContent.locale, locale))
    .orderBy(asc(landingContent.section), asc(landingContent.key));
  return c.json({ data: rows });
});

// Get all locales grouped by section/key for diffing
landingAdminRouter.get('/content/all', async (c) => {
  const rows = await db
    .select()
    .from(landingContent)
    .orderBy(asc(landingContent.locale), asc(landingContent.section), asc(landingContent.key));
  return c.json({ data: rows });
});

// Update a single field
const patchSchema = z.object({
  value: z.string().min(1).max(5000),
  isPublished: z.boolean().optional(),
});

landingAdminRouter.patch('/content/:id', zValidator('json', patchSchema), async (c) => {
  const id = c.req.param('id');
  const adminId = c.get('adminId');
  const { value, isPublished } = c.req.valid('json');

  const [updated] = await db
    .update(landingContent)
    .set({
      value,
      ...(isPublished !== undefined ? { isPublished } : {}),
      updatedBy: adminId,
      updatedAt: new Date(),
    })
    .where(eq(landingContent.id, id))
    .returning();

  if (!updated) return c.json({ error: 'Not found' }, 404);

  // Invalidate cache for affected locale
  try { await redis.del(cacheKey(updated.locale)); } catch { /* non-fatal */ }

  // Audit
  await db.insert(auditLogs).values({
    actorAdminId: adminId,
    action: 'edit_landing',
    entityType: 'landing_content',
    entityId: id,
    metadata: { section: updated.section, key: updated.key, locale: updated.locale },
  }).catch(() => {});

  return c.json({ data: updated });
});

// Bulk clear cache for a locale (or all)
landingAdminRouter.post('/cache-clear', async (c) => {
  const { locale } = await c.req.json<{ locale?: string }>().catch(() => ({ locale: undefined }));
  const adminId = c.get('adminId');

  const localesToClear = locale && VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])
    ? [locale]
    : [...VALID_LOCALES];

  await Promise.all(localesToClear.map((l) => redis.del(cacheKey(l)).catch(() => {})));

  await db.insert(auditLogs).values({
    actorAdminId: adminId,
    action: 'clear_landing_cache',
    entityType: 'landing_content',
    metadata: { locales: localesToClear },
  }).catch(() => {});

  return c.json({ cleared: localesToClear });
});
