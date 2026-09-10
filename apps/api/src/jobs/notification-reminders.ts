import cron from 'node-cron';
import { db } from '@medsoft/db';
import { subscriptions } from '@medsoft/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createNotification } from '../lib/notification-service.js';
import { logger } from '../lib/logger.js';

// ─── Subscription expiring (daily at 08:00 UTC = 13:00 Tashkent) ─────────────

async function checkSubscriptionExpiring() {
  logger.info('[Cron] Checking subscriptions expiring in 3 days…');
  try {
    const now     = new Date();
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiring = await db
      .select({ userId: subscriptions.userId, expiresAt: subscriptions.expiresAt })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'active'),
        gte(subscriptions.expiresAt, now),
        lte(subscriptions.expiresAt, in3days),
      ));

    for (const { userId, expiresAt } of expiring) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      await createNotification(
        userId,
        'subscription_expiring',
        'Подписка заканчивается',
        `Ваша подписка истекает через ${daysLeft} ${daysLeft === 1 ? 'день' : 'дня'}. Продлите сейчас.`,
        { link: '/pricing', priority: 'high' }
      );
    }
    logger.info({ count: expiring.length }, '[Cron] Subscription expiry notifications sent.');
  } catch (err) {
    logger.error({ err }, '[Cron] checkSubscriptionExpiring failed');
  }
}

// Медикаментозные напоминания (было: раз в час, in-app уведомление, без
// повторов/missed, только для schedule.endDate IS NULL) — убраны отсюда.
// Единственный источник правды теперь jobs/medication-reminders.ts
// (startMedicationReminders), который шлёт и push, и это же in-app
// уведомление на первую попытку — один приём лекарства больше не триггерит
// два независимых механизма.

// ─── Start all notification crons ─────────────────────────────────────────────

export function startNotificationReminders() {
  // Daily at 08:00 UTC
  cron.schedule('0 8 * * *', checkSubscriptionExpiring);

  logger.info('[Cron] Notification reminder jobs started.');
}
