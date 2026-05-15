import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { payments, doctorPayouts, doctorPayoutSettings } from '@medsoft/db';
import { eq, and, gte, lte, desc, sum, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorEarningsRouter = new Hono();

const COMMISSION_PERCENT = 20;

// ─── GET /v1/aivita/doctor/earnings ──────────────────────────────────────────

doctorEarningsRouter.get('/', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { from, to } = c.req.query();
  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = to ? new Date(to) : new Date();

  const rows = await db.select().from(payments)
    .where(and(
      eq(payments.userId, doctorId),
      eq(payments.type, 'consultation'),
      eq(payments.status, 'completed'),
      gte(payments.createdAt, fromDate),
      lte(payments.createdAt, toDate),
    ))
    .orderBy(desc(payments.createdAt));

  const totalGross = rows.reduce((s, r) => s + r.amount, 0);
  const totalCommission = Math.round(totalGross * COMMISSION_PERCENT / 100);
  const totalNet = totalGross - totalCommission;

  const payoutsHistory = await db.select().from(doctorPayouts)
    .where(eq(doctorPayouts.doctorId, doctorId))
    .orderBy(desc(doctorPayouts.createdAt))
    .limit(20);

  return c.json({
    gross: totalGross,
    commission: totalCommission,
    net: totalNet,
    commissionPercent: COMMISSION_PERCENT,
    consultations: rows.length,
    payoutsHistory,
    transactions: rows,
  });
});

// ─── GET/PUT /v1/aivita/doctor/payout-settings ───────────────────────────────

doctorEarningsRouter.get('/payout-settings', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const rows = await db.select().from(doctorPayoutSettings).where(eq(doctorPayoutSettings.doctorId, doctorId)).limit(1);
  return c.json({ data: rows[0] ?? null });
});

doctorEarningsRouter.put('/payout-settings', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { cardNumber, bankName, ownerName } = await c.req.json() as {
    cardNumber?: string; bankName?: string; ownerName?: string;
  };

  await db.insert(doctorPayoutSettings).values({
    doctorId,
    cardNumber: cardNumber ?? null,
    bankName: bankName ?? null,
    ownerName: ownerName ?? null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: doctorPayoutSettings.doctorId,
    set: { cardNumber: cardNumber ?? null, bankName: bankName ?? null, ownerName: ownerName ?? null, updatedAt: new Date() },
  });

  return c.json({ success: true });
});
