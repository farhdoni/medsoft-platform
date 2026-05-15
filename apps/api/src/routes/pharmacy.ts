import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  pharmacies,
  pharmacyBranches,
  pharmacyProducts,
  pharmacyOrders,
  pharmacyPromotions,
  pharmacyUsers,
  aivitaUsers,
} from '@medsoft/db';
import { eq, and, desc, asc, gte, lte, ilike } from 'drizzle-orm';
import { requirePharmacyAuth } from '../middleware/pharmacy-auth.js';

export const pharmacyRouter = new Hono();
pharmacyRouter.use('*', requirePharmacyAuth);

// ─── Profile ──────────────────────────────────────────────────────────────────

pharmacyRouter.get('/profile', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const [pharmacy] = await db.select().from(pharmacies).where(eq(pharmacies.id, pharmacyId)).limit(1);
  if (!pharmacy) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: pharmacy });
});

pharmacyRouter.put('/profile', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.createdById;
  delete body.createdAt;
  delete body.commissionPercent;
  delete body.status;
  delete body.tier;
  (body as Record<string, unknown>).updatedAt = new Date();

  const [updated] = await db.update(pharmacies)
    .set(body as never)
    .where(eq(pharmacies.id, pharmacyId))
    .returning();
  return c.json({ data: updated });
});

// ─── Branches ─────────────────────────────────────────────────────────────────

pharmacyRouter.get('/branches', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const rows = await db.select().from(pharmacyBranches)
    .where(eq(pharmacyBranches.pharmacyId, pharmacyId))
    .orderBy(asc(pharmacyBranches.id));
  return c.json({ data: rows });
});

pharmacyRouter.post('/branches', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const body = await c.req.json() as {
    name?: string;
    address: string;
    lat?: string;
    lon?: string;
    phone?: string;
    workingHours?: unknown;
    deliveryEnabled?: boolean;
    deliveryRadius?: number;
    deliveryPrice?: number;
    freeDeliveryFrom?: number;
  };
  if (!body.address) return c.json({ error: 'address is required' }, 400);

  const [row] = await db.insert(pharmacyBranches).values({
    pharmacyId,
    name: body.name ?? null,
    address: body.address,
    lat: body.lat ?? null,
    lon: body.lon ?? null,
    phone: body.phone ?? null,
    workingHours: body.workingHours ?? null,
    deliveryEnabled: body.deliveryEnabled ?? false,
    deliveryRadius: body.deliveryRadius ?? null,
    deliveryPrice: body.deliveryPrice ?? 0,
    freeDeliveryFrom: body.freeDeliveryFrom ?? null,
    isActive: true,
  }).returning();
  return c.json({ data: row }, 201);
});

pharmacyRouter.put('/branches/:id', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pharmacyBranches)
    .where(and(eq(pharmacyBranches.id, id), eq(pharmacyBranches.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.pharmacyId;
  const [updated] = await db.update(pharmacyBranches)
    .set(body as never)
    .where(eq(pharmacyBranches.id, id))
    .returning();
  return c.json({ data: updated });
});

pharmacyRouter.delete('/branches/:id', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pharmacyBranches)
    .where(and(eq(pharmacyBranches.id, id), eq(pharmacyBranches.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  await db.delete(pharmacyBranches).where(eq(pharmacyBranches.id, id));
  return c.json({ data: { success: true } });
});

// ─── Products ─────────────────────────────────────────────────────────────────

pharmacyRouter.get('/products', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const { search, category, branchId, page: pageStr, limit: limStr } = c.req.query();
  const page = parseInt(pageStr ?? '1', 10);
  const limit = Math.min(parseInt(limStr ?? '50', 10), 200);
  const offset = (page - 1) * limit;

  const conds = [eq(pharmacyProducts.pharmacyId, pharmacyId)];
  if (category) conds.push(eq(pharmacyProducts.category, category) as never);
  if (branchId) conds.push(eq(pharmacyProducts.branchId, parseInt(branchId, 10)) as never);
  if (search) conds.push(ilike(pharmacyProducts.name, `%${search}%`) as never);

  const rows = await db.select().from(pharmacyProducts)
    .where(and(...(conds as Parameters<typeof and>)))
    .orderBy(asc(pharmacyProducts.name))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows, page, limit });
});

pharmacyRouter.post('/products', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const body = await c.req.json() as {
    name: string;
    innName?: string;
    dosage?: string;
    form?: string;
    price: number;
    oldPrice?: number;
    stock?: number;
    category?: string;
    imageUrl?: string;
    branchId?: number;
  };
  if (!body.name || body.price == null) return c.json({ error: 'name and price are required' }, 400);

  const [row] = await db.insert(pharmacyProducts).values({
    pharmacyId,
    branchId: body.branchId ?? null,
    name: body.name,
    innName: body.innName ?? null,
    dosage: body.dosage ?? null,
    form: body.form ?? null,
    price: body.price,
    oldPrice: body.oldPrice ?? null,
    stock: body.stock ?? 0,
    category: body.category ?? null,
    imageUrl: body.imageUrl ?? null,
    isActive: true,
  }).returning();
  return c.json({ data: row }, 201);
});

pharmacyRouter.put('/products/:id', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pharmacyProducts)
    .where(and(eq(pharmacyProducts.id, id), eq(pharmacyProducts.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.pharmacyId;
  (body as Record<string, unknown>).updatedAt = new Date();
  const [updated] = await db.update(pharmacyProducts)
    .set(body as never)
    .where(eq(pharmacyProducts.id, id))
    .returning();
  return c.json({ data: updated });
});

pharmacyRouter.delete('/products/:id', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pharmacyProducts)
    .where(and(eq(pharmacyProducts.id, id), eq(pharmacyProducts.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  await db.delete(pharmacyProducts).where(eq(pharmacyProducts.id, id));
  return c.json({ data: { success: true } });
});

// ─── Products import (CSV) ────────────────────────────────────────────────────

pharmacyRouter.post('/products/import', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const body = await c.req.text();

  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return c.json({ error: 'CSV must have header + data rows' }, 400);

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const dosageIdx = header.indexOf('dosage');
  const formIdx = header.indexOf('form');
  const priceIdx = header.indexOf('price');
  const stockIdx = header.indexOf('stock');

  if (nameIdx === -1 || priceIdx === -1) {
    return c.json({ error: 'CSV must have name and price columns' }, 400);
  }

  const toInsert = lines.slice(1).map(line => {
    const cols = line.split(',').map(v => v.trim());
    return {
      pharmacyId,
      name: cols[nameIdx] ?? '',
      dosage: dosageIdx >= 0 ? (cols[dosageIdx] ?? null) : null,
      form: formIdx >= 0 ? (cols[formIdx] ?? null) : null,
      price: priceIdx >= 0 ? parseInt(cols[priceIdx] ?? '0', 10) : 0,
      stock: stockIdx >= 0 ? parseInt(cols[stockIdx] ?? '0', 10) : 0,
      isActive: true,
    };
  }).filter(r => r.name && r.price > 0);

  if (toInsert.length === 0) return c.json({ error: 'No valid rows' }, 400);

  const inserted = await db.insert(pharmacyProducts).values(toInsert).returning({ id: pharmacyProducts.id });
  return c.json({ data: { imported: inserted.length } }, 201);
});

// ─── Orders ───────────────────────────────────────────────────────────────────

pharmacyRouter.get('/orders', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const { status, branchId, dateFrom, dateTo, page: pageStr, limit: limStr } = c.req.query();
  const page = parseInt(pageStr ?? '1', 10);
  const limit = Math.min(parseInt(limStr ?? '20', 10), 100);
  const offset = (page - 1) * limit;

  const conds = [eq(pharmacyOrders.pharmacyId, pharmacyId)];
  if (status) conds.push(eq(pharmacyOrders.status, status) as never);
  if (branchId) conds.push(eq(pharmacyOrders.branchId, parseInt(branchId, 10)) as never);
  if (dateFrom) conds.push(gte(pharmacyOrders.createdAt, new Date(dateFrom)) as never);
  if (dateTo) conds.push(lte(pharmacyOrders.createdAt, new Date(dateTo)) as never);

  const rows = await db.select().from(pharmacyOrders)
    .where(and(...(conds as Parameters<typeof and>)))
    .orderBy(desc(pharmacyOrders.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows, page, limit });
});

pharmacyRouter.put('/orders/:id/status', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const { status } = await c.req.json() as { status: string };

  const allowed = ['new', 'confirmed', 'assembled', 'ready', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return c.json({ error: 'Invalid status' }, 400);

  const [existing] = await db.select().from(pharmacyOrders)
    .where(and(eq(pharmacyOrders.id, id), eq(pharmacyOrders.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const [updated] = await db.update(pharmacyOrders)
    .set({ status, updatedAt: new Date() })
    .where(eq(pharmacyOrders.id, id))
    .returning();
  return c.json({ data: updated });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

pharmacyRouter.get('/analytics', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const { period = '30d' } = c.req.query();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const fromDate = new Date(Date.now() - days * 86400_000);

  const orders = await db.select().from(pharmacyOrders)
    .where(and(
      eq(pharmacyOrders.pharmacyId, pharmacyId),
      gte(pharmacyOrders.createdAt, fromDate),
    ));

  const ordersCount = orders.length;
  const revenue = orders.reduce((s, o) => s + o.totalPrice, 0);
  const commission = orders.reduce((s, o) => s + o.commissionAmount, 0);
  const avgCheck = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // Top products by qty
  const productQty: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of orders) {
    const items = (order.items ?? []) as Array<{ productId: number; name: string; qty: number; price: number }>;
    for (const item of items) {
      const key = String(item.productId);
      if (!productQty[key]) productQty[key] = { name: item.name, qty: 0, revenue: 0 };
      productQty[key].qty += item.qty;
      productQty[key].revenue += item.qty * item.price;
    }
  }
  const topProducts = Object.entries(productQty)
    .map(([id, v]) => ({ productId: parseInt(id, 10), ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return c.json({ data: { ordersCount, revenue, avgCheck, commission, topProducts, period, days } });
});

// ─── Finance ──────────────────────────────────────────────────────────────────

pharmacyRouter.get('/finance', async (c) => {
  const pharmacyId = c.get('pharmacyId');

  const orders = await db.select().from(pharmacyOrders)
    .where(eq(pharmacyOrders.pharmacyId, pharmacyId))
    .orderBy(desc(pharmacyOrders.createdAt));

  const totalRevenue = orders.reduce((s, o) => s + o.totalPrice, 0);
  const totalCommission = orders.reduce((s, o) => s + o.commissionAmount, 0);
  const balance = totalRevenue - totalCommission;

  const transactions = orders.slice(0, 50).map(o => ({
    orderId: o.id,
    date: o.createdAt,
    totalPrice: o.totalPrice,
    commissionAmount: o.commissionAmount,
    net: o.totalPrice - o.commissionAmount,
    status: o.status,
  }));

  return c.json({ data: { balance, totalRevenue, totalCommission, transactions } });
});

// ─── Promotions ───────────────────────────────────────────────────────────────

pharmacyRouter.get('/promotions', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const rows = await db.select().from(pharmacyPromotions)
    .where(eq(pharmacyPromotions.pharmacyId, pharmacyId))
    .orderBy(desc(pharmacyPromotions.id));
  return c.json({ data: rows });
});

pharmacyRouter.post('/promotions', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const body = await c.req.json() as {
    title?: string;
    discountType: string;
    discountValue: number;
    productId?: number;
    category?: string;
    startsAt?: string;
    endsAt?: string;
  };

  const [row] = await db.insert(pharmacyPromotions).values({
    pharmacyId,
    title: body.title ?? null,
    discountType: body.discountType,
    discountValue: body.discountValue,
    productId: body.productId ?? null,
    category: body.category ?? null,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    isActive: true,
  }).returning();
  return c.json({ data: row }, 201);
});

pharmacyRouter.put('/promotions/:id', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pharmacyPromotions)
    .where(and(eq(pharmacyPromotions.id, id), eq(pharmacyPromotions.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.pharmacyId;
  const [updated] = await db.update(pharmacyPromotions)
    .set(body as never)
    .where(eq(pharmacyPromotions.id, id))
    .returning();
  return c.json({ data: updated });
});

pharmacyRouter.delete('/promotions/:id', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pharmacyPromotions)
    .where(and(eq(pharmacyPromotions.id, id), eq(pharmacyPromotions.pharmacyId, pharmacyId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  await db.delete(pharmacyPromotions).where(eq(pharmacyPromotions.id, id));
  return c.json({ data: { success: true } });
});

// ─── Users (сотрудники) ───────────────────────────────────────────────────────

pharmacyRouter.get('/users', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const rows = await db
    .select({
      id: pharmacyUsers.id,
      pharmacyId: pharmacyUsers.pharmacyId,
      userId: pharmacyUsers.userId,
      role: pharmacyUsers.role,
      createdAt: pharmacyUsers.createdAt,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
    })
    .from(pharmacyUsers)
    .innerJoin(aivitaUsers, eq(pharmacyUsers.userId, aivitaUsers.id))
    .where(eq(pharmacyUsers.pharmacyId, pharmacyId));
  return c.json({ data: rows });
});

pharmacyRouter.post('/users', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const role = c.get('pharmacyRole');
  if (role !== 'director' && role !== 'manager') {
    return c.json({ error: 'Only director/manager can add users' }, 403);
  }

  const { userId, userRole } = await c.req.json() as { userId: string; userRole?: string };
  if (!userId) return c.json({ error: 'userId is required' }, 400);

  const [user] = await db.select().from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  if (!user) return c.json({ error: 'User not found' }, 404);

  const [row] = await db.insert(pharmacyUsers).values({
    pharmacyId,
    userId,
    role: userRole ?? 'operator',
  }).onConflictDoNothing().returning();

  return c.json({ data: row }, 201);
});

pharmacyRouter.delete('/users/:userId', async (c) => {
  const pharmacyId = c.get('pharmacyId');
  const myRole = c.get('pharmacyRole');
  if (myRole !== 'director' && myRole !== 'manager') {
    return c.json({ error: 'Only director/manager can remove users' }, 403);
  }

  const userId = c.req.param('userId');
  await db.delete(pharmacyUsers)
    .where(and(eq(pharmacyUsers.pharmacyId, pharmacyId), eq(pharmacyUsers.userId, userId)));
  return c.json({ data: { success: true } });
});
