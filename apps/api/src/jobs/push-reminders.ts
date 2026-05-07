/**
 * Push notification cron jobs for Aivita mobile users.
 *
 * Runs:
 *   - Daily habit reminder at 09:00 UTC (12:00 Tashkent)
 *   - Weekly health report reminder every Monday at 09:00 UTC
 */

import cron from 'node-cron';
import { db } from '@medsoft/db';
import { aivitaUsers, aivitaDeviceTokens, habitLogs, habits, medicationSchedule, medicationLog } from '@medsoft/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { sendPushNotification } from '../lib/push-notifications.js';
import { logger } from '../lib/logger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUsersWithDeviceTokens(): Promise<
  Array<{ userId: string; pushTokens: string[] }>
> {
  const rows = await db
    .select({
      userId: aivitaDeviceTokens.userId,
      pushToken: aivitaDeviceTokens.pushToken,
    })
    .from(aivitaDeviceTokens)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, aivitaDeviceTokens.userId))
    .where(eq(aivitaUsers.deletedAt, sql`null`));

  // Group by userId
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const tokens = map.get(row.userId) ?? [];
    tokens.push(row.pushToken);
    map.set(row.userId, tokens);
  }

  return Array.from(map.entries()).map(([userId, pushTokens]) => ({ userId, pushTokens }));
}

// ─── Daily habit reminder ─────────────────────────────────────────────────────

async function sendHabitReminders() {
  logger.info('[Cron] Sending daily habit reminders…');
  const today = new Date().toISOString().slice(0, 10);

  try {
    const users = await getUsersWithDeviceTokens();
    let sent = 0;

    for (const { userId, pushTokens } of users) {
      // Count active habits for this user
      const activeHabits = await db
        .select({ id: habits.id })
        .from(habits)
        .where(and(eq(habits.userId, userId), eq(habits.isActive, true)));

      if (activeHabits.length === 0) continue;

      // Count today's completed logs
      const todayLogs = await db
        .select({ id: habitLogs.id })
        .from(habitLogs)
        .where(and(
          eq(habitLogs.userId, userId),
          eq(habitLogs.date, today),
        ));

      const total = activeHabits.length;
      const done = todayLogs.length;

      if (done >= total) continue; // Already completed all habits

      const remaining = total - done;
      await sendPushNotification(
        pushTokens,
        '✅ Привычки на сегодня',
        `Осталось ${remaining} из ${total} привычек. Не забудь отметить!`,
        { screen: 'habits', date: today },
      );
      sent++;
    }

    logger.info({ sent }, '[Cron] Habit reminders sent.');
  } catch (err) {
    logger.error({ err }, '[Cron] Failed to send habit reminders');
  }
}

// ─── Weekly health summary ─────────────────────────────────────────────────────

async function sendWeeklyHealthSummary() {
  logger.info('[Cron] Sending weekly health summary notifications…');

  try {
    const users = await getUsersWithDeviceTokens();

    for (const { pushTokens } of users) {
      await sendPushNotification(
        pushTokens,
        '📊 Ваш еженедельный отчёт готов',
        'Посмотри, как изменился твой Health Score за неделю',
        { screen: 'test' },
      );
    }

    logger.info({ count: users.length }, '[Cron] Weekly health summary sent.');
  } catch (err) {
    logger.error({ err }, '[Cron] Failed to send weekly summary');
  }
}

// ─── Medication reminders ─────────────────────────────────────────────────────

async function sendMedicationReminders() {
  logger.info('[Cron] Sending medication reminders…');

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get all active medications with reminder enabled
    const activeMeds = await db.select().from(medicationSchedule)
      .where(and(
        eq(medicationSchedule.isActive, true),
        eq(medicationSchedule.reminderEnabled, true),
      ));

    let sent = 0;

    for (const med of activeMeds) {
      // Check date range
      if (med.startDate && todayStr < med.startDate) continue;
      if (med.endDate && todayStr > med.endDate) continue;

      const times = (med.times as string[]) || [];

      for (const time of times) {
        const [h, m] = time.split(':').map(Number);
        const scheduled = new Date();
        scheduled.setHours(h, m, 0, 0);

        // Check if we're within the reminder window (default 5 min before)
        const minutesBefore = med.reminderMinutesBefore ?? 5;
        const diff = (scheduled.getTime() - now.getTime()) / 60000;
        if (diff < 0 || diff > minutesBefore + 1) continue;

        // Check not already taken today
        const todayStart = new Date(`${todayStr}T00:00:00`);
        const todayEnd = new Date(`${todayStr}T23:59:59`);
        const [existingLog] = await db.select().from(medicationLog)
          .where(and(
            eq(medicationLog.scheduleId, med.id),
            eq(medicationLog.userId, med.userId),
            gte(medicationLog.scheduledAt, todayStart),
            lte(medicationLog.scheduledAt, todayEnd),
          ))
          .limit(1);

        if (existingLog && (existingLog.status === 'taken' || existingLog.status === 'skipped')) continue;

        // Get user device tokens
        const tokens = await db.select({ pushToken: aivitaDeviceTokens.pushToken })
          .from(aivitaDeviceTokens)
          .where(eq(aivitaDeviceTokens.userId, med.userId));

        if (tokens.length === 0) continue;

        await sendPushNotification(
          tokens.map(t => t.pushToken),
          `💊 ${med.title}`,
          `${med.dosage ? med.dosage + ' · ' : ''}Время принять в ${time}`,
          { scheduleId: med.id, time, url: '/ru/medications' },
        );
        sent++;
      }
    }

    logger.info({ sent }, '[Cron] Medication reminders sent.');
  } catch (err) {
    logger.error({ err }, '[Cron] Failed to send medication reminders');
  }
}

// ─── Start crons ──────────────────────────────────────────────────────────────

export function startPushReminders() {
  // Daily at 09:00 UTC (noon Tashkent / UZT UTC+5)
  cron.schedule('0 9 * * *', sendHabitReminders, { timezone: 'UTC' });

  // Weekly on Monday at 09:00 UTC
  cron.schedule('0 9 * * 1', sendWeeklyHealthSummary, { timezone: 'UTC' });

  // Medication reminders — run every 5 minutes
  cron.schedule('*/5 * * * *', sendMedicationReminders, { timezone: 'UTC' });

  logger.info('[Cron] Push reminder jobs scheduled.');
}
