/**
 * Split out of aivita-admin.ts (docs/routes-split-plan.md) — the
 * "aivita:content_read/manage" group (2 routes). Still mounted at
 * /v1/aivita-admin, so external paths are unchanged. No permission
 * checks added here.
 */
import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { platformSettings } from '@medsoft/db';
import { sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from './aivita-admin-audit.js';

const router = new Hono();
router.use('*', requireAuth);

const HOME_DEFAULTS: Record<string, string> = {
  aivita_home_show_doctors: 'true',
  aivita_home_show_ai_checkup: 'true',
  aivita_home_announcement_text: '',
  aivita_home_announcement_active: 'false',
  aivita_home_announcement_color: '#6BA3D6',
  aivita_home_hero_greeting_ru: 'Добро пожаловать',
  aivita_home_hero_greeting_uz: 'Xush kelibsiz',
  aivita_doctor_home_hero_sub_ru: 'Ваш AI-кабинет врача',
  aivita_doctor_home_hero_sub_uz: 'Shifokor AI kabinetingiz',
  aivita_home_maintenance: 'false',
  aivita_home_maintenance_msg: 'Проводятся технические работы',
};

// GET /v1/aivita-admin/home-settings
router.get('/home-settings', async (c) => {
  const rows = await db.select().from(platformSettings)
    .where(sql`${platformSettings.key} LIKE 'aivita_%'`);
  const map: Record<string, string> = { ...HOME_DEFAULTS };
  for (const r of rows) if (r.key) map[r.key] = r.value ?? '';
  return c.json({ data: map });
});

// PUT /v1/aivita-admin/home-settings
router.put('/home-settings', async (c) => {
  const adminId = c.get('adminId') as string;
  const body = await c.req.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('aivita_')) continue;
    await db.insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }
  await auditLog(adminId, 'home_settings_update', 'platform_settings', null, body as Record<string, unknown>, c.req);
  return c.json({ success: true });
});

export { router as aivitaAdminHomeSettingsRouter };
