/**
 * Public landing API
 * GET  /api/landing-config  — editable config (cached 60s)
 * POST /api/waitlist        — add to waitlist
 */
import { Hono } from 'hono';
import { db, landingWaitlist, landingConfig } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { redis } from '../lib/redis.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_CONFIG = {
  hero_title: 'Давай <span class="gradient">знакомиться!</span>',
  hero_subtitle: 'Медкарта, AI-чекап и забота о всей семье — в одном приложении',
  ai_block_title: 'Я твой AI ассистент здоровья!',
  ai_block_subtitle: 'Буду следить за твоим здоровьем, улучшать его и делать совершеннее!',
  social_links: {
    telegram: 'https://t.me/aivita_uz',
    whatsapp: 'https://wa.me/998000000000',
    instagram: 'https://instagram.com/aivita.uz',
    facebook: 'https://facebook.com/aivita.uz',
    youtube: 'https://youtube.com/@aivita_uz',
  },
  app_links: { appstore: '', googleplay: '' },
  waitlist_enabled: true,
  yandex_metrika_id: '',
  gtm_id: '',
  cookie_text: 'Мы используем cookies для улучшения сервиса',
};

export const landingApiRouter = new Hono();

landingApiRouter.get('/landing-config', async (c) => {
  try {
    const cached = await redis.get('landing:config');
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      });
    }
  } catch { /* non-fatal */ }

  let payload: Record<string, unknown> = DEFAULT_CONFIG;
  try {
    const rows = await db.select().from(landingConfig).where(eq(landingConfig.key, 'current')).limit(1);
    if (rows[0]?.payload) payload = rows[0].payload as Record<string, unknown>;
  } catch { /* use defaults */ }

  try { await redis.setex('landing:config', 60, JSON.stringify(payload)); } catch { /* non-fatal */ }

  return c.json(payload, 200, {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  });
});

landingApiRouter.post('/waitlist', async (c) => {
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }

  const name = String(body.name ?? '').trim().slice(0, 100);
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200);
  const phone = String(body.phone ?? '').trim().slice(0, 40) || null;
  const locale = String(body.locale ?? 'ru').slice(0, 5);
  const source = String(body.source ?? 'landing').slice(0, 50);

  if (!name || name.length < 2) return c.json({ error: 'invalid_name' }, 400);
  if (!EMAIL_RE.test(email)) return c.json({ error: 'invalid_email' }, 400);

  const ua = c.req.header('user-agent') ?? '';
  const ip =
    c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    '';

  try {
    await db.insert(landingWaitlist).values({ name, email, phone, locale, source, userAgent: ua, ip })
      .onConflictDoNothing();
  } catch (e) {
    console.error('[waitlist] db insert failed', e);
    return c.json({ error: 'storage_failed' }, 500);
  }

  return c.json({ ok: true });
});
