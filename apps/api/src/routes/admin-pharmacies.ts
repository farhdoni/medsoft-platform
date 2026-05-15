import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  pharmacies,
  pharmacyUsers,
  pharmacyOrders,
  aivitaUsers,
} from '@medsoft/db';
import { eq, desc, and, gte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export const adminPharmaciesRouter = new Hono();
adminPharmaciesRouter.use('*', requireAuth);

// ─── POST / — создать аптеку + аккаунт ────────────────────────────────────────

adminPharmaciesRouter.post('/', async (c) => {
  const body = await c.req.json() as {
    name: string;
    legalName?: string;
    inn?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    description?: string;
    commissionPercent?: number;
    tier?: string;
    // Данные для аккаунта оператора аптеки
    directorEmail?: string;
    directorName?: string;
  };

  if (!body.name) return c.json({ error: 'name is required' }, 400);

  // 1. Создать запись аптеки
  const [pharmacy] = await db.insert(pharmacies).values({
    name: body.name,
    legalName: body.legalName ?? null,
    inn: body.inn ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    logoUrl: body.logoUrl ?? null,
    description: body.description ?? null,
    commissionPercent: body.commissionPercent != null ? String(body.commissionPercent) : '10',
    status: 'active',
    tier: body.tier ?? 'starter',
    createdById: null,
  }).returning();

  let directorAccount = null;

  // 2. Создать aivita-аккаунт директора, если передан email
  if (body.directorEmail) {
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const [user] = await db.insert(aivitaUsers).values({
      email: body.directorEmail,
      name: body.directorName ?? body.name,
      provider: 'email',
      passwordHash,
      role: 'patient',
      plan: 'free',
      locale: 'ru',
      onboardingCompleted: true,
    }).onConflictDoUpdate({
      target: aivitaUsers.email,
      set: { name: body.directorName ?? body.name },
    }).returning({ id: aivitaUsers.id, email: aivitaUsers.email });

    await db.insert(pharmacyUsers).values({
      pharmacyId: pharmacy.id,
      userId: user.id,
      role: 'director',
    }).onConflictDoNothing();

    directorAccount = { userId: user.id, email: user.email, tempPassword };
  }

  return c.json({ data: { pharmacy, directorAccount } }, 201);
});

// ─── GET / — список всех аптек ────────────────────────────────────────────────

adminPharmaciesRouter.get('/', async (c) => {
  const { status, tier } = c.req.query();

  const rows = await db.select().from(pharmacies)
    .where(
      status ? eq(pharmacies.status, status) : undefined,
    )
    .orderBy(desc(pharmacies.createdAt));

  const filtered = tier ? rows.filter(r => r.tier === tier) : rows;
  return c.json({ data: filtered });
});

// ─── PUT /:id — редактировать (комиссия, статус, тариф) ───────────────────────

adminPharmaciesRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json() as Partial<{
    name: string;
    commissionPercent: number;
    status: string;
    tier: string;
    legalName: string;
    inn: string;
    phone: string;
    email: string;
    description: string;
  }>;

  const [existing] = await db.select().from(pharmacies).where(eq(pharmacies.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name != null) updates.name = body.name;
  if (body.commissionPercent != null) updates.commissionPercent = String(body.commissionPercent);
  if (body.status != null) updates.status = body.status;
  if (body.tier != null) updates.tier = body.tier;
  if (body.legalName != null) updates.legalName = body.legalName;
  if (body.inn != null) updates.inn = body.inn;
  if (body.phone != null) updates.phone = body.phone;
  if (body.email != null) updates.email = body.email;
  if (body.description != null) updates.description = body.description;

  const [updated] = await db.update(pharmacies)
    .set(updates as never)
    .where(eq(pharmacies.id, id))
    .returning();

  return c.json({ data: updated });
});

// ─── GET /:id/stats ───────────────────────────────────────────────────────────

adminPharmaciesRouter.get('/:id/stats', async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  const [pharmacy] = await db.select().from(pharmacies).where(eq(pharmacies.id, id)).limit(1);
  if (!pharmacy) return c.json({ error: 'Not found' }, 404);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const orders = await db.select().from(pharmacyOrders)
    .where(and(
      eq(pharmacyOrders.pharmacyId, id),
      gte(pharmacyOrders.createdAt, thirtyDaysAgo),
    ));

  const ordersCount = orders.length;
  const revenue = orders.reduce((s, o) => s + o.totalPrice, 0);
  const commission = orders.reduce((s, o) => s + o.commissionAmount, 0);
  const avgCheck = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    const s = o.status ?? 'new';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return c.json({
    data: {
      pharmacy,
      period: '30d',
      ordersCount,
      revenue,
      commission,
      avgCheck,
      byStatus,
    },
  });
});
