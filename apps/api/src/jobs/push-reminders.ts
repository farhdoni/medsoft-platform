/**
 * Push notification cron jobs for Aivita mobile users.
 *
 * Runs:
 *   - Daily habit reminder at 09:00 UTC (12:00 Tashkent)
 *   - Weekly health report reminder every Monday at 09:00 UTC
 */

import cron from 'node-cron';
import { db } from '@medsoft/db';
import { aivitaUsers, aivitaDeviceTokens, habitLogs, habits } from '@medsoft/db';
import { eq, and, gte, sql } from 'drizzle-orm';
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

// ─── Start crons ──────────────────────────────────────────────────────────────

export function startPushReminders() {
  // Daily at 09:00 UTC (noon Tashkent / UZT UTC+5)
  cron.schedule('0 9 * * *', sendHabitReminders, { timezone: 'UTC' });

  // Weekly on Monday at 09:00 UTC
  cron.schedule('0 9 * * 1', sendWeeklyHealthSummary, { timezone: 'UTC' });

  logger.info('[Cron] Push reminder jobs scheduled.');
}
