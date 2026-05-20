import cron from 'node-cron';
import { db } from '@medsoft/db';
import { subscriptions, medicationSchedule, notificationSettings } from '@medsoft/db';
import { eq, and, lt, gte, lte, isNull, sql } from 'drizzle-orm';
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

// ─── Medication reminders (every hour, checks current UTC+5 hour) ─────────────

async function checkMedicationReminders() {
  logger.info('[Cron] Checking medication reminders…');
  try {
    const now = new Date();
    // Tashkent is UTC+5
    const tzOffsetMs = 5 * 60 * 60 * 1000;
    const localHour = Math.floor(((now.getTime() + tzOffsetMs) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const localMin  = Math.floor(((now.getTime() + tzOffsetMs) % (60 * 60 * 1000)) / 60000);

    const padded = `${String(localHour).padStart(2, '0')}:${String(localMin).padStart(2, '0')}`;

    const schedules = await db
      .select({
        userId: medicationSchedule.userId,
        title:  medicationSchedule.title,
        times:  medicationSchedule.times,
      })
      .from(medicationSchedule)
      .where(and(
        eq(medicationSchedule.isActive, true),
        eq(medicationSchedule.reminderEnabled, true),
        isNull(medicationSchedule.endDate),
      ));

    let sent = 0;
    for (const { userId, title, times } of schedules) {
      const matchingTime = times.find((t) => {
        const [h, m] = t.split(':').map(Number);
        return h === localHour && Math.abs(m - localMin) <= 2;
      });
      if (!matchingTime) continue;

      await createNotification(
        userId,
        'medication_reminder',
        'Время принять лекарство',
        `Не забудьте принять: ${title}`,
        { link: '/medications' }
      );
      sent++;
    }
    logger.info({ sent }, '[Cron] Medication reminders sent.');
  } catch (err) {
    logger.error({ err }, '[Cron] checkMedicationReminders failed');
  }
}

// ─── Start all notification crons ─────────────────────────────────────────────

export function startNotificationReminders() {
  // Daily at 08:00 UTC
  cron.schedule('0 8 * * *', checkSubscriptionExpiring);

  // Every hour at :00
  cron.schedule('0 * * * *', checkMedicationReminders);

  logger.info('[Cron] Notification reminder jobs started.');
}
