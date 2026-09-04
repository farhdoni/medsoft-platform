import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { requireRight } from '../../lib/rbac.js';
import { db } from '@medsoft/db';
import { faqItems, platformSettings } from '@medsoft/db';
import { eq, asc, inArray } from 'drizzle-orm';

// docs/rbac-model.md enforcement (feat/rbac-enforce-2, fifth pass):
// requireRight goes per-route (requireAuth stays router-wide) —
// content:read on every GET, content:manage on every mutation.
// publicFaqRouter below is untouched — it's intentionally public
// (no requireAuth), a different mount (/v1/aivita/faq), out of scope.
export const adminContentRouter = new Hono();
adminContentRouter.use('*', requireAuth);

// ─── Public FAQ (no auth) ─────────────────────────────────────────────────────

export const publicFaqRouter = new Hono();

publicFaqRouter.get('/', async (c) => {
  const rows = await db.select()
    .from(faqItems)
    .where(eq(faqItems.isActive, true))
    .orderBy(faqItems.sortOrder, faqItems.id);
  return c.json({ data: rows });
});

// ─── Landing config ───────────────────────────────────────────────────────────

const LANDING_KEYS = [
  'landing_hero_title',
  'landing_hero_subtitle',
  'landing_cta_text',
  'landing_features',
  'landing_ai_block',
  'landing_specialists_block',
  'landing_doctors_block',
];

adminContentRouter.get('/landing', requireRight('content:read'), async (c) => {
  const rows = await db.select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, LANDING_KEYS));
  const config: Record<string, string> = {};
  for (const r of rows) config[r.key] = r.value ?? '';
  return c.json({ config });
});

adminContentRouter.put('/landing', requireRight('content:manage'), async (c) => {
  const body = await c.req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    if (!LANDING_KEYS.includes(key)) continue;
    await db.insert(platformSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
  return c.json({ ok: true });
});

// ─── Social links ─────────────────────────────────────────────────────────────

const SOCIAL_KEYS = [
  'social_telegram',
  'social_whatsapp',
  'social_instagram',
  'social_facebook',
  'social_youtube',
];

adminContentRouter.get('/social', requireRight('content:read'), async (c) => {
  const rows = await db.select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, SOCIAL_KEYS));
  const links: Record<string, string> = {};
  for (const r of rows) links[r.key] = r.value ?? '';
  return c.json({ links });
});

adminContentRouter.put('/social', requireRight('content:manage'), async (c) => {
  const body = await c.req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    if (!SOCIAL_KEYS.includes(key)) continue;
    await db.insert(platformSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
  return c.json({ ok: true });
});

// ─── FAQ management ───────────────────────────────────────────────────────────

adminContentRouter.get('/faq', requireRight('content:read'), async (c) => {
  const rows = await db.select().from(faqItems).orderBy(asc(faqItems.sortOrder), asc(faqItems.id));
  return c.json({ data: rows });
});

adminContentRouter.post('/faq', requireRight('content:manage'), async (c) => {
  const body = await c.req.json() as {
    question: string;
    answer: string;
    category?: string;
    sortOrder?: number;
  };
  const [row] = await db.insert(faqItems).values({
    question: body.question,
    answer: body.answer,
    category: body.category ?? 'general',
    sortOrder: body.sortOrder ?? 0,
    isActive: true,
  }).returning();
  return c.json({ data: row }, 201);
});

adminContentRouter.put('/faq/:id', requireRight('content:manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as Partial<{
    question: string; answer: string;
    category: string; sortOrder: number; isActive: boolean;
  }>;
  const [row] = await db.update(faqItems)
    .set(body)
    .where(eq(faqItems.id, id))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

adminContentRouter.delete('/faq/:id', requireRight('content:manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(faqItems).where(eq(faqItems.id, id));
  return c.json({ ok: true });
});
