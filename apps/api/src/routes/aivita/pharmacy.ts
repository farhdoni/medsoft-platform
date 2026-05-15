import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  pharmacies,
  pharmacyBranches,
  pharmacyProducts,
  pharmacyOrders,
  pharmacyPromotions,
} from '@medsoft/db';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaPharmacyRouter = new Hono();

// ─── Haversine distance (km) ───────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GET /search?drug=лизиноприл&lat=41.31&lon=69.28 ─────────────────────────

aivitaPharmacyRouter.get('/search', async (c) => {
  const { drug, lat, lon } = c.req.query();
  if (!drug) return c.json({ error: 'drug query param is required' }, 400);

  const userLat = lat ? parseFloat(lat) : null;
  const userLon = lon ? parseFloat(lon) : null;
  const now = new Date();

  // Find products matching the drug name
  const products = await db.select().from(pharmacyProducts)
    .where(and(
      or(
        ilike(pharmacyProducts.name, `%${drug}%`),
        ilike(pharmacyProducts.innName, `%${drug}%`),
      ),
      eq(pharmacyProducts.isActive, true),
    ));

  if (products.length === 0) return c.json({ data: [] });

  // Load pharmacies, branches, promotions in parallel
  const [pharmacyRows, branchRows, promoRows] = await Promise.all([
    db.select().from(pharmacies).where(eq(pharmacies.status, 'active')),
    db.select().from(pharmacyBranches).where(eq(pharmacyBranches.isActive, true)),
    db.select().from(pharmacyPromotions).where(eq(pharmacyPromotions.isActive, true)),
  ]);

  const pharmacyMap = new Map(pharmacyRows.map(p => [p.id, p]));
  const branchMap = new Map(branchRows.map(b => [b.id, b]));

  // Active promos: check date range
  const activePromos = promoRows.filter(pr => {
    if (pr.startsAt && new Date(pr.startsAt) > now) return false;
    if (pr.endsAt && new Date(pr.endsAt) < now) return false;
    return true;
  });

  const results: Array<{
    pharmacyId: number;
    pharmacyName: string;
    pharmacyLogo?: string | null;
    productId: number;
    productName: string;
    dosage?: string | null;
    form?: string | null;
    price: number;
    oldPrice?: number | null;
    stock: number;
    branchId?: number | null;
    branchName?: string | null;
    branchAddress?: string | null;
    distanceKm?: number | null;
    deliveryEnabled: boolean;
    deliveryPrice: number;
    freeDeliveryFrom?: number | null;
    promo?: { title: string | null; discountType: string | null; discountValue: number | null } | null;
  }> = [];

  for (const product of products) {
    const pharmacy = pharmacyMap.get(product.pharmacyId);
    if (!pharmacy) continue;

    const branch = product.branchId ? branchMap.get(product.branchId) : null;

    let distanceKm: number | null = null;
    if (userLat != null && userLon != null && branch?.lat && branch?.lon) {
      distanceKm = haversineKm(userLat, userLon, parseFloat(String(branch.lat)), parseFloat(String(branch.lon)));
    }

    // Find applicable promo
    const promo = activePromos.find(pr =>
      pr.pharmacyId === product.pharmacyId &&
      (pr.productId === product.id || (pr.category && pr.category === product.category)),
    );

    results.push({
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      pharmacyLogo: pharmacy.logoUrl,
      productId: product.id,
      productName: product.name,
      dosage: product.dosage,
      form: product.form,
      price: product.price,
      oldPrice: product.oldPrice,
      stock: product.stock ?? 0,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? null,
      branchAddress: branch?.address ?? null,
      distanceKm: distanceKm != null ? Math.round(distanceKm * 100) / 100 : null,
      deliveryEnabled: branch?.deliveryEnabled ?? false,
      deliveryPrice: branch?.deliveryPrice ?? 0,
      freeDeliveryFrom: branch?.freeDeliveryFrom ?? null,
      promo: promo
        ? { title: promo.title, discountType: promo.discountType, discountValue: promo.discountValue }
        : null,
    });
  }

  // Sort by distance (nulls last), then by price
  results.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.price - b.price;
  });

  return c.json({ data: results });
});

// ─── POST /order — создать заказ ─────────────────────────────────────────────

aivitaPharmacyRouter.post('/order', requireAivitaAuth, async (c) => {
  const patientId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    pharmacyId: number;
    branchId?: number;
    items: Array<{ productId: number; name: string; qty: number; price: number }>;
    deliveryType?: string;
    deliveryAddress?: string;
    prescriptionId?: string;
  };

  if (!body.pharmacyId || !body.items?.length) {
    return c.json({ error: 'pharmacyId and items are required' }, 400);
  }

  const [pharmacy] = await db.select().from(pharmacies)
    .where(and(eq(pharmacies.id, body.pharmacyId), eq(pharmacies.status, 'active')))
    .limit(1);
  if (!pharmacy) return c.json({ error: 'Pharmacy not found or inactive' }, 404);

  const totalPrice = body.items.reduce((s, i) => s + i.qty * i.price, 0);
  const commissionPercent = parseFloat(String(pharmacy.commissionPercent ?? '10'));
  const commissionAmount = Math.round(totalPrice * commissionPercent / 100);

  const [order] = await db.insert(pharmacyOrders).values({
    pharmacyId: body.pharmacyId,
    branchId: body.branchId ?? null,
    patientId,
    prescriptionId: body.prescriptionId ?? null,
    items: body.items,
    totalPrice,
    commissionAmount,
    deliveryType: body.deliveryType ?? 'pickup',
    deliveryAddress: body.deliveryAddress ?? null,
    status: 'new',
  }).returning();

  return c.json({ data: order }, 201);
});

// ─── GET /orders — мои заказы ─────────────────────────────────────────────────

aivitaPharmacyRouter.get('/orders', requireAivitaAuth, async (c) => {
  const patientId = c.get('aivitaUserId');
  const orders = await db.select().from(pharmacyOrders)
    .where(eq(pharmacyOrders.patientId, patientId))
    .orderBy(desc(pharmacyOrders.createdAt));

  // Enrich with pharmacy names
  const pharmacyIds = [...new Set(orders.map(o => o.pharmacyId))];
  const pharmacyRows = pharmacyIds.length > 0
    ? await db.select({ id: pharmacies.id, name: pharmacies.name, logoUrl: pharmacies.logoUrl })
        .from(pharmacies)
    : [];
  const pharmacyMap = new Map(pharmacyRows.map(p => [p.id, p]));

  const enriched = orders.map(o => ({
    ...o,
    pharmacyName: pharmacyMap.get(o.pharmacyId)?.name ?? null,
    pharmacyLogo: pharmacyMap.get(o.pharmacyId)?.logoUrl ?? null,
  }));

  return c.json({ data: enriched });
});
