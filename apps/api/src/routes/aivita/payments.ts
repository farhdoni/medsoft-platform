import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  payments, subscriptions, subscriptionPlans, userPaymentMethods, promoCodes, aivitaUsers,
} from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { clickCardCharge } from '../../lib/click.js';
import { paymeCardCharge } from '../../lib/payme.js';
import { uzumCardCharge, uzumCreatePayment } from '../../lib/uzum.js';
import { env } from '../../env.js';

export const aivitaPaymentsRouter = new Hono();
export const aivitaPaymentMethodsRouter = new Hono();
export const aivitaPromoRouter = new Hono();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function activateSubscription(userId: string, planId: number, paymentMethodId: number | null) {
  const plan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!plan.length) throw new Error('Plan not found');

  const p = plan[0];
  const now = new Date();
  const expiresAt = new Date(now);
  if (p.period === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else if (p.period === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    // one_time: 100 years
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
  }

  // Deactivate previous active subscriptions
  await db.update(subscriptions)
    .set({ status: 'cancelled' })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));

  const [sub] = await db.insert(subscriptions).values({
    userId,
    planId,
    status: 'active',
    paymentMethodId,
    startedAt: now,
    expiresAt,
    autoRenew: true,
  }).returning();

  // Update user plan
  const planTierMap: Record<string, string> = {
    free: 'free',
    premium: 'premium',
    premium_family: 'premium',
    premium_annual: 'premium',
    doctor_pro: 'plus',
    doctor_premium: 'pro',
    clinic_starter: 'plus',
    clinic_business: 'pro',
    clinic_enterprise: 'pro',
    pharmacy_business: 'plus',
    pharmacy_network: 'pro',
  };
  const newPlan = planTierMap[p.slug] ?? 'plus';
  await db.update(aivitaUsers).set({ plan: newPlan }).where(eq(aivitaUsers.id, userId));

  return sub;
}

async function chargeByToken(
  provider: string,
  cardToken: string,
  amount: number,
  orderId: string
): Promise<{ success: boolean; transactionId?: string }> {
  if (provider === 'click') return clickCardCharge({ cardToken, amount, merchantTransId: orderId });
  if (provider === 'payme') return paymeCardCharge({ cardToken, amount, orderId });
  if (provider === 'uzum') return uzumCardCharge({ cardToken, amount, orderId });
  return { success: false };
}

// ─── POST /v1/aivita/payments/create ─────────────────────────────────────────

aivitaPaymentsRouter.post('/create', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    type: string;
    planSlug?: string;
    orderId?: number;
    bookingId?: number;
    provider?: string;
    promoCode?: string;
    paymentMethodId?: number;
  };

  let amount = 0;
  let referenceId: number | undefined;
  let planId: number | undefined;

  if (body.type === 'subscription' && body.planSlug) {
    const plan = await db.select().from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.slug, body.planSlug), eq(subscriptionPlans.isActive, true)))
      .limit(1);
    if (!plan.length) return c.json({ error: 'Plan not found' }, 404);
    amount = plan[0].price;
    planId = plan[0].id;

    // Apply promo code
    if (body.promoCode && amount > 0) {
      const promo = await db.select().from(promoCodes)
        .where(and(eq(promoCodes.code, body.promoCode.toUpperCase()), eq(promoCodes.isActive, true)))
        .limit(1);
      if (promo.length) {
        const p = promo[0];
        const now = new Date();
        const validUntil = p.validUntil ? new Date(p.validUntil) : null;
        const withinUses = p.maxUses === null || p.usedCount < (p.maxUses ?? 0);
        const withinDate = !validUntil || validUntil > now;
        const applicablePlan = !p.planSlugs?.length || (p.planSlugs as string[]).includes(body.planSlug!);

        if (withinUses && withinDate && applicablePlan) {
          if (p.discountType === 'percent') {
            amount = Math.round(amount * (1 - p.discountValue / 100));
          } else {
            amount = Math.max(0, amount - p.discountValue);
          }
          await db.update(promoCodes)
            .set({ usedCount: p.usedCount + 1 })
            .where(eq(promoCodes.id, p.id));
        }
      }
    }
  }

  // Create payment record
  const [payment] = await db.insert(payments).values({
    userId,
    type: body.type,
    referenceId: referenceId ?? null,
    amount,
    currency: 'UZS',
    provider: body.provider ?? null,
    status: amount === 0 ? 'completed' : 'pending',
    metadata: { planSlug: body.planSlug, planId, promoCode: body.promoCode },
    completedAt: amount === 0 ? new Date() : null,
  }).returning();

  // If free — activate immediately
  if (amount === 0 && body.type === 'subscription' && planId) {
    await activateSubscription(userId, planId, null);
    return c.json({ payment, activated: true });
  }

  // Find existing payment method
  const methodId = body.paymentMethodId ?? null;
  let method = null;
  if (methodId) {
    const methods = await db.select().from(userPaymentMethods)
      .where(and(eq(userPaymentMethods.id, methodId), eq(userPaymentMethods.userId, userId)))
      .limit(1);
    method = methods[0] ?? null;
  } else {
    // Use default card
    const methods = await db.select().from(userPaymentMethods)
      .where(and(eq(userPaymentMethods.userId, userId), eq(userPaymentMethods.isDefault, true)))
      .limit(1);
    method = methods[0] ?? null;
  }

  if (method) {
    // Charge by token
    await db.update(payments).set({ status: 'processing', provider: method.provider, paymentMethodId: method.id }).where(eq(payments.id, payment.id));

    const result = await chargeByToken(method.provider, method.cardToken, amount, String(payment.id));
    if (result.success) {
      await db.update(payments).set({
        status: 'completed',
        completedAt: new Date(),
        providerTransactionId: result.transactionId ?? null,
      }).where(eq(payments.id, payment.id));

      if (body.type === 'subscription' && planId) {
        await activateSubscription(userId, planId, method.id);
      }
      return c.json({ payment: { ...payment, status: 'completed' }, activated: true });
    } else {
      await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));
      return c.json({ error: 'Payment failed', payment }, 402);
    }
  }

  // No saved card — return checkout URL for the chosen provider
  const provider = body.provider ?? 'click';
  let checkoutUrl = `${env.AIVITA_URL}/settings/payment-methods?addCard=1&provider=${provider}&paymentId=${payment.id}&planSlug=${body.planSlug ?? ''}`;

  if (provider === 'uzum') {
    try {
      const uzumResult = await uzumCreatePayment({
        amount,
        orderId: String(payment.id),
        description: `Подписка ${body.planSlug}`,
        returnUrl: `${env.AIVITA_URL}/settings/subscription?status=success`,
      });
      checkoutUrl = uzumResult.paymentUrl;
    } catch {
      // fallback to manual redirect
    }
  }

  return c.json({ payment, checkoutUrl, requiresRedirect: true });
});

// ─── GET /v1/aivita/payments/history ─────────────────────────────────────────

aivitaPaymentsRouter.get('/history', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(50);
  return c.json({ data: rows });
});

// ─── GET /v1/aivita/subscription ─────────────────────────────────────────────

aivitaPaymentsRouter.get('/subscription', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select({
    subscription: subscriptions,
    plan: subscriptionPlans,
  })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return c.json({ data: rows[0] ?? null });
});

// ─── POST /v1/aivita/subscription/cancel ─────────────────────────────────────

aivitaPaymentsRouter.post('/subscription/cancel', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(subscriptions)
    .set({ autoRenew: false })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
  return c.json({ success: true });
});

// ─── GET /v1/aivita/payment-methods ──────────────────────────────────────────

aivitaPaymentMethodsRouter.get('/', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(userPaymentMethods)
    .where(eq(userPaymentMethods.userId, userId))
    .orderBy(desc(userPaymentMethods.createdAt));
  return c.json({ data: rows.map(r => ({ ...r, cardToken: undefined })) });
});

// ─── POST /v1/aivita/payment-methods/add ─────────────────────────────────────

aivitaPaymentMethodsRouter.post('/add', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const { provider, cardToken, cardLastFour, cardType } = await c.req.json() as {
    provider: string; cardToken: string; cardLastFour?: string; cardType?: string;
  };

  if (!provider || !cardToken) return c.json({ error: 'provider and cardToken are required' }, 400);

  // If first card — set as default
  const existing = await db.select().from(userPaymentMethods).where(eq(userPaymentMethods.userId, userId)).limit(1);
  const isDefault = existing.length === 0;

  const [method] = await db.insert(userPaymentMethods).values({
    userId,
    provider,
    cardToken,
    cardLastFour: cardLastFour ?? null,
    cardType: cardType ?? null,
    isDefault,
  }).returning();

  return c.json({ data: { ...method, cardToken: undefined } });
});

// ─── DELETE /v1/aivita/payment-methods/:id ────────────────────────────────────

aivitaPaymentMethodsRouter.delete('/:id', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const id = parseInt(c.req.param('id'));
  await db.delete(userPaymentMethods)
    .where(and(eq(userPaymentMethods.id, id), eq(userPaymentMethods.userId, userId)));
  return c.json({ success: true });
});

// ─── POST /v1/aivita/payment-methods/:id/set-default ─────────────────────────

aivitaPaymentMethodsRouter.post('/:id/set-default', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const id = parseInt(c.req.param('id'));
  // Unset all
  await db.update(userPaymentMethods)
    .set({ isDefault: false })
    .where(eq(userPaymentMethods.userId, userId));
  // Set chosen
  await db.update(userPaymentMethods)
    .set({ isDefault: true })
    .where(and(eq(userPaymentMethods.id, id), eq(userPaymentMethods.userId, userId)));
  return c.json({ success: true });
});

// ─── POST /v1/aivita/promo/validate ──────────────────────────────────────────

aivitaPromoRouter.post('/validate', requireAivitaAuth, async (c) => {
  const { code, planSlug } = await c.req.json() as { code: string; planSlug?: string };

  const promo = await db.select().from(promoCodes)
    .where(and(eq(promoCodes.code, code.toUpperCase()), eq(promoCodes.isActive, true)))
    .limit(1);

  if (!promo.length) return c.json({ valid: false, error: 'Промокод не найден' });

  const p = promo[0];
  const now = new Date();
  const validUntil = p.validUntil ? new Date(p.validUntil) : null;

  if (p.maxUses !== null && p.usedCount >= (p.maxUses ?? 0)) {
    return c.json({ valid: false, error: 'Промокод исчерпан' });
  }
  if (validUntil && validUntil < now) {
    return c.json({ valid: false, error: 'Промокод истёк' });
  }
  if (planSlug && p.planSlugs?.length && !(p.planSlugs as string[]).includes(planSlug)) {
    return c.json({ valid: false, error: 'Промокод не применим к этому тарифу' });
  }

  return c.json({
    valid: true,
    discountType: p.discountType,
    discountValue: p.discountValue,
    code: p.code,
  });
});

// ─── GET /v1/aivita/plans ─────────────────────────────────────────────────────

aivitaPaymentsRouter.get('/plans', async (c) => {
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  return c.json({ data: rows });
});
