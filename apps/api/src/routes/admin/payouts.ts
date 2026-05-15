import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorPayouts, pharmacyPayouts, payments, aivitaUsers, doctorPayoutSettings } from '@medsoft/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export const adminPayoutsRouter = new Hono();

const COMMISSION_PERCENT = 20;

// ─── GET /v1/admin/payouts/doctors ───────────────────────────────────────────

adminPayoutsRouter.get('/doctors', async (c) => {
  const { period, status } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(doctorPayouts.status, status));

  const rows = await db.select({
    payout: doctorPayouts,
    doctorName: aivitaUsers.name,
    doctorEmail: aivitaUsers.email,
  })
    .from(doctorPayouts)
    .leftJoin(aivitaUsers, eq(doctorPayouts.doctorId, aivitaUsers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(doctorPayouts.createdAt));

  return c.json({ data: rows });
});

// ─── POST /v1/admin/payouts/doctors/generate ─────────────────────────────────

adminPayoutsRouter.post('/doctors/generate', async (c) => {
  const { period, from, to } = await c.req.json() as { period: string; from?: string; to?: string };

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = to ? new Date(to) : new Date();

  // Find all doctors with completed consultations in period
  const doctorEarnings = await db.select({
    doctorId: payments.userId,
    doctorName: aivitaUsers.name,
    total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    cnt: sql<number>`count(*)`,
  })
    .from(payments)
    .leftJoin(aivitaUsers, eq(payments.userId, aivitaUsers.id))
    .where(and(
      eq(payments.type, 'consultation'),
      eq(payments.status, 'completed'),
      gte(payments.createdAt, fromDate),
      lte(payments.createdAt, toDate),
    ))
    .groupBy(payments.userId, aivitaUsers.name);

  const created = [];
  for (const d of doctorEarnings) {
    const gross = Number(d.total);
    const commission = Math.round(gross * COMMISSION_PERCENT / 100);
    const net = gross - commission;

    if (net <= 0) continue;

    // Get doctor payout settings
    const settings = await db.select().from(doctorPayoutSettings)
      .where(eq(doctorPayoutSettings.doctorId, d.doctorId))
      .limit(1);

    const [payout] = await db.insert(doctorPayouts).values({
      doctorId: d.doctorId,
      amount: net,
      period,
      cardNumber: settings[0]?.cardNumber ?? null,
      bankName: settings[0]?.bankName ?? null,
      status: 'pending',
    }).returning();
    created.push(payout);
  }

  return c.json({ created, count: created.length });
});

// ─── POST /v1/admin/payouts/doctors/:id/mark-paid ────────────────────────────

adminPayoutsRouter.post('/doctors/:id/mark-paid', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.update(doctorPayouts)
    .set({ status: 'completed', paidAt: new Date() })
    .where(eq(doctorPayouts.id, id));
  return c.json({ success: true });
});

// ─── GET /v1/admin/payouts/pharmacies ────────────────────────────────────────

adminPayoutsRouter.get('/pharmacies', async (c) => {
  const rows = await db.select().from(pharmacyPayouts).orderBy(desc(pharmacyPayouts.createdAt));
  return c.json({ data: rows });
});

// ─── POST /v1/admin/payouts/pharmacies/generate ──────────────────────────────

adminPayoutsRouter.post('/pharmacies/generate', async (c) => {
  const { period, pharmacyId, amount, bankAccount, mfo, inn } = await c.req.json() as {
    period: string; pharmacyId: number; amount: number;
    bankAccount?: string; mfo?: string; inn?: string;
  };

  const [payout] = await db.insert(pharmacyPayouts).values({
    pharmacyId,
    amount,
    period,
    bankAccount: bankAccount ?? null,
    mfo: mfo ?? null,
    inn: inn ?? null,
    status: 'pending',
  }).returning();

  return c.json({ data: payout });
});

// ─── POST /v1/admin/payouts/pharmacies/:id/mark-paid ─────────────────────────

adminPayoutsRouter.post('/pharmacies/:id/mark-paid', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.update(pharmacyPayouts)
    .set({ status: 'completed', paidAt: new Date() })
    .where(eq(pharmacyPayouts.id, id));
  return c.json({ success: true });
});
