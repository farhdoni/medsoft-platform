import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, clinicDemoRequests, downloadLogs } from '@medsoft/db';
import { eq, desc, count, sql, and, gte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { logger } from '../lib/logger.js';

const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TG_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? '';

// Best-effort: config presence is checked up front in the route handler
// (503 before touching the DB), so by the time this runs both vars are
// known to be set. A runtime Telegram failure here (network, bad chat id)
// still leaves the lead saved in clinic_demo_requests — visible in the
// admin queue — so it's logged, not surfaced to the client.
async function notifyTelegram(text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, '[clinic-demo-request] Telegram sendMessage вернул ошибку');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, '[clinic-demo-request] Telegram sendMessage упал');
    return false;
  }
}

// ─── Public routes ────────────────────────────────────────────────────────────

export const clinicPublicRouter = new Hono();

// POST /api/clinic-demo-request
const demoRequestSchema = z.object({
  clinicName: z.string().min(2).max(200),
  contactName: z.string().min(2).max(100),
  phone: z.string().min(7).max(20).refine(v => PHONE_RE.test(v), 'invalid_phone'),
  email: z.string().email().max(100).optional().or(z.literal('')),
  doctorsCount: z.enum(['1-5', '5-20', '20+']),
  comment: z.string().max(2000).optional(),
  locale: z.string().max(5).optional(),
  // Both optional: clinics.html, the other caller of this endpoint, sends
  // neither field and must keep working unchanged.
  connectAivita: z.boolean().optional(),
  source: z.string().max(50).optional(),
  // Honeypot: a field real users never see or fill (hidden in start.html's
  // CSS). Scrapers that auto-fill every input trip it. Any non-empty value
  // here means "not a human" — answer exactly like success so the bot has
  // no signal it was caught, but skip the DB write and the Telegram push.
  website: z.string().max(200).optional(),
});

clinicPublicRouter.post(
  '/clinic-demo-request',
  rateLimit('clinic-demo-request', 5, 600),
  zValidator('json', demoRequestSchema),
  async (c) => {
    const body = c.req.valid('json');

    if (body.website) {
      return c.json({ ok: true });
    }

    if (!TG_TOKEN || !TG_CHAT_ID) {
      logger.error(
        '[clinic-demo-request] TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID не настроены — заявка отклонена',
      );
      return c.json({ error: 'service_unavailable' }, 503);
    }

    const ip = c.req.header('x-real-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = c.req.header('user-agent') ?? null;

    const [inserted] = await db.insert(clinicDemoRequests).values({
      clinicName: body.clinicName,
      contactName: body.contactName,
      phone: body.phone,
      email: body.email || null,
      doctorsCount: body.doctorsCount,
      comment: body.comment || null,
      locale: body.locale || 'ru',
      connectAivita: body.connectAivita ?? false,
      source: body.source || null,
      ip,
      userAgent: ua,
    }).returning({ id: clinicDemoRequests.id });

    const sent = await notifyTelegram(
      `🏥 <b>Новая заявка на демо MedSoft</b>\n\n` +
      `<b>Клиника:</b> ${body.clinicName}\n` +
      `<b>Контакт:</b> ${body.contactName}\n` +
      `<b>Телефон:</b> ${body.phone}\n` +
      `<b>Email:</b> ${body.email || '—'}\n` +
      `<b>Врачей:</b> ${body.doctorsCount}\n` +
      `<b>AIVITA:</b> ${body.connectAivita ? '✅ Да' : '❌ Нет'}\n` +
      `<b>Комментарий:</b> ${body.comment || '—'}\n\n` +
      `ID заявки: #${inserted.id}`,
    );
    if (!sent) {
      logger.warn({ id: inserted.id }, '[clinic-demo-request] заявка сохранена, но Telegram-уведомление не ушло');
    }

    return c.json({ ok: true, id: inserted.id });
  },
);

// POST /api/download-log
const downloadLogSchema = z.object({
  app: z.enum(['patient', 'doctor']),
});

clinicPublicRouter.post('/download-log', zValidator('json', downloadLogSchema), async (c) => {
  const { app } = c.req.valid('json');
  const ip = c.req.header('x-real-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = c.req.header('user-agent')?.slice(0, 500) ?? null;
  await db.insert(downloadLogs).values({ app, ip, userAgent: ua });
  return c.json({ ok: true });
});

// GET /api/download/:app — log + redirect to APK
clinicPublicRouter.get('/download/:app', async (c) => {
  const app = c.req.param('app');
  if (app !== 'patient' && app !== 'doctor') return c.json({ error: 'invalid_app' }, 400);
  const ip = c.req.header('x-real-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = c.req.header('user-agent')?.slice(0, 500) ?? null;
  await db.insert(downloadLogs).values({ app, ip, userAgent: ua }).catch(() => {});
  const file = app === 'patient' ? '/downloads/aivita-patient.apk' : '/downloads/aivita-doctor.apk';
  return c.redirect(file, 302);
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

export const clinicAdminRouter = new Hono();
clinicAdminRouter.use('*', requireAuth);

// GET /v1/admin/content/clinic-requests
clinicAdminRouter.get('/clinic-requests', async (c) => {
  const status = c.req.query('status');
  const rows = await db
    .select()
    .from(clinicDemoRequests)
    .where(status ? eq(clinicDemoRequests.status, status) : undefined)
    .orderBy(desc(clinicDemoRequests.createdAt))
    .limit(200);
  return c.json({ data: rows });
});

// PUT /v1/admin/content/clinic-requests/:id
const updateStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'demo', 'converted', 'rejected']),
});

clinicAdminRouter.put('/clinic-requests/:id', zValidator('json', updateStatusSchema), async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'invalid_id' }, 400);
  const { status } = c.req.valid('json');
  const [updated] = await db
    .update(clinicDemoRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(clinicDemoRequests.id, id))
    .returning();
  if (!updated) return c.json({ error: 'not_found' }, 404);
  return c.json({ data: updated });
});

// GET /v1/admin/stats/downloads
clinicAdminRouter.get('/stats/downloads', async (c) => {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [patientTotal, doctorTotal, patientToday, doctorToday] = await Promise.all([
    db.select({ cnt: count() }).from(downloadLogs).where(eq(downloadLogs.app, 'patient')),
    db.select({ cnt: count() }).from(downloadLogs).where(eq(downloadLogs.app, 'doctor')),
    db.select({ cnt: count() }).from(downloadLogs).where(and(eq(downloadLogs.app, 'patient'), gte(downloadLogs.createdAt, startOfToday))),
    db.select({ cnt: count() }).from(downloadLogs).where(and(eq(downloadLogs.app, 'doctor'), gte(downloadLogs.createdAt, startOfToday))),
  ]);

  const chartRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${downloadLogs.createdAt})::date::text`,
      app: downloadLogs.app,
      cnt: count(),
    })
    .from(downloadLogs)
    .where(gte(downloadLogs.createdAt, startOf30Days))
    .groupBy(sql`date_trunc('day', ${downloadLogs.createdAt})::date::text`, downloadLogs.app)
    .orderBy(sql`1`);

  const chartMap: Record<string, { date: string; patient: number; doctor: number }> = {};
  for (const row of chartRows) {
    if (!chartMap[row.date]) chartMap[row.date] = { date: row.date, patient: 0, doctor: 0 };
    chartMap[row.date][row.app as 'patient' | 'doctor'] = Number(row.cnt);
  }

  return c.json({
    patientTotal: Number(patientTotal[0]?.cnt ?? 0),
    doctorTotal: Number(doctorTotal[0]?.cnt ?? 0),
    patientToday: Number(patientToday[0]?.cnt ?? 0),
    doctorToday: Number(doctorToday[0]?.cnt ?? 0),
    chart: Object.values(chartMap),
  });
});
