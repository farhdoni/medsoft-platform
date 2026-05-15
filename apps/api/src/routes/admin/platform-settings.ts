import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { platformSettings } from '@medsoft/db';
import { eq } from 'drizzle-orm';

export const platformSettingsRouter = new Hono();

const DEFAULTS: Record<string, string> = {
  commission_booking:       '10',
  commission_online:        '15',
  commission_repeat:        '5',
  commission_pharmacy:      '10',
  commission_lab:           '12',
  payout_day:               'friday',
  payout_minimum:           '50000',
  payout_pharmacy_period:   'monthly',
  finance_email:            'finance@aivita.uz',
};

// ─── GET /v1/admin/settings/platform ─────────────────────────────────────────

platformSettingsRouter.get('/', async (c) => {
  const rows = await db.select().from(platformSettings);
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key && row.value !== null && row.value !== undefined) {
      map[row.key] = row.value;
    }
  }
  return c.json({ data: map });
});

// ─── PUT /v1/admin/settings/platform ─────────────────────────────────────────

platformSettingsRouter.put('/', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }
  return c.json({ success: true });
});
