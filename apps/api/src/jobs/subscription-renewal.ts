import cron from 'node-cron';
import { db } from '@medsoft/db';
import { subscriptions, subscriptionPlans, userPaymentMethods, payments, aivitaUsers } from '@medsoft/db';
import { eq, and, lt, gte, lte } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { clickCardCharge } from '../lib/click.js';
import { paymeCardCharge } from '../lib/payme.js';
import { uzumCardCharge } from '../lib/uzum.js';

async function chargeByToken(
  provider: string, cardToken: string, amount: number, orderId: string
): Promise<{ success: boolean; transactionId?: string }> {
  if (provider === 'click') return clickCardCharge({ cardToken, amount, merchantTransId: orderId });
  if (provider === 'payme') return paymeCardCharge({ cardToken, amount, orderId });
  if (provider === 'uzum') return uzumCardCharge({ cardToken, amount, orderId });
  return { success: false };
}

async function renewSubscription() {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find subscriptions expiring in 3 days with autoRenew=true
  const expiring = await db.select({
    sub: subscriptions,
    plan: subscriptionPlans,
    method: userPaymentMethods,
  })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .leftJoin(userPaymentMethods, eq(subscriptions.paymentMethodId, userPaymentMethods.id))
    .where(and(
      eq(subscriptions.status, 'active'),
      eq(subscriptions.autoRenew, true),
      lt(subscriptions.expiresAt, threeDaysLater),
      gte(subscriptions.expiresAt, now),
    ));

  logger.info({ count: expiring.length }, 'Subscription renewal: processing');

  for (const { sub, plan, method } of expiring) {
    if (!plan || !method) {
      // No payment method — mark past_due
      await db.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, sub.id));
      continue;
    }

    // Create pending payment
    const [payment] = await db.insert(payments).values({
      userId: sub.userId,
      type: 'subscription',
      amount: plan.price,
      currency: 'UZS',
      provider: method.provider,
      paymentMethodId: method.id,
      status: 'processing',
      metadata: { renewal: true, subscriptionId: sub.id, planId: plan.id },
    }).returning();

    try {
      const result = await chargeByToken(method.provider, method.cardToken, plan.price, String(payment.id));

      if (result.success) {
        // Extend expiry
        const newExpiry = new Date(sub.expiresAt);
        if (plan.period === 'annual') {
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        } else {
          newExpiry.setMonth(newExpiry.getMonth() + 1);
        }

        await db.update(subscriptions).set({ expiresAt: newExpiry }).where(eq(subscriptions.id, sub.id));
        await db.update(payments).set({
          status: 'completed',
          completedAt: new Date(),
          providerTransactionId: result.transactionId ?? null,
        }).where(eq(payments.id, payment.id));

        logger.info({ subId: sub.id, userId: sub.userId }, 'Subscription renewed');
      } else {
        await db.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, sub.id));
        await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));
        logger.warn({ subId: sub.id }, 'Subscription renewal failed — past_due');
      }
    } catch (err) {
      await db.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, sub.id));
      await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));
      logger.error({ err, subId: sub.id }, 'Subscription renewal error');
    }
  }

  // Expire past-due subscriptions older than 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const expired = await db.update(subscriptions)
    .set({ status: 'expired' })
    .where(and(eq(subscriptions.status, 'past_due'), lt(subscriptions.expiresAt, threeDaysAgo)))
    .returning();

  if (expired.length > 0) {
    // Downgrade users to free
    for (const sub of expired) {
      await db.update(aivitaUsers).set({ plan: 'free' }).where(eq(aivitaUsers.id, sub.userId));
    }
    logger.info({ count: expired.length }, 'Subscriptions expired, users downgraded to free');
  }
}

export function startSubscriptionRenewal() {
  // Run daily at 09:00
  cron.schedule('0 9 * * *', () => {
    renewSubscription().catch((err) => logger.error({ err }, 'Subscription renewal cron error'));
  });
  logger.info('Subscription renewal cron scheduled (daily 09:00)');
}
