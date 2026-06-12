/**
 * Push notification cron jobs for Aivita mobile users.
 *
 * Runs:
 *   - Daily habit reminder at 09:00 UTC (12:00 Tashkent)
 *   - Weekly health report reminder every Monday at 09:00 UTC
 */

import cron from 'node-cron';
import { fromZonedTime } from 'date-fns-tz';
import { db } from '@medsoft/db';
import { aivitaUsers, aivitaDeviceTokens, habitLogs, habits, medicationSchedule, medicationLog } from '@medsoft/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { sendPushNotification, sendWebPushNotification } from '../lib/push-notifications.js';
import { logger } from '../lib/logger.js';
import { safeTimezone } from '../lib/timezone.js';

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

// In-process dedup: tracks last push timestamp per `${scheduleId}:${time}`.
// Prevents duplicate sends when two consecutive 5-min cron ticks both fall
// inside the reminder window (window = minutesBefore+1 min ≈ 6 min > cron period).
const _reminderSentAt = new Map<string, number>();

async function sendMedicationReminders() {
  logger.info('[Cron] Sending medication reminders…');

  try {
    const nowUtc = new Date();

    // Fetch active meds + owner timezone in one JOIN to avoid N+1 queries.
    // aivita_users.timezone is an IANA identifier (e.g. "Asia/Tashkent",
    // "Europe/Moscow"). fromZonedTime() handles DST automatically.
    const rows = await db
      .select({
        med: medicationSchedule,
        timezone: aivitaUsers.timezone,
      })
      .from(medicationSchedule)
      .innerJoin(aivitaUsers, eq(aivitaUsers.id, medicationSchedule.userId))
      .where(and(
        eq(medicationSchedule.isActive, true),
        eq(medicationSchedule.reminderEnabled, true),
      ));

    let sent = 0;

    for (const { med, timezone: rawTz } of rows) {
      // Per-user try/catch: a single bad row must never abort the entire run.
      try {
      // Guard: safeTimezone returns a valid IANA string or 'Asia/Tashkent'.
      const tz = safeTimezone(rawTz);

      // "Today" in the user's local timezone (YYYY-MM-DD calendar date).
      const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz })
        .format(nowUtc); // sv-SE locale always formats as "YYYY-MM-DD"

      // startDate / endDate are stored as calendar dates — compare in user's tz.
      if (med.startDate && todayStr < med.startDate) continue;
      if (med.endDate && todayStr > med.endDate) continue;

      const times = (med.times as string[]) || [];

      for (const time of times) {
        // Convert "HH:mm in user's timezone" → UTC using date-fns-tz.
        // fromZonedTime correctly handles DST transitions (e.g. Europe/Berlin
        // on spring-forward night: 02:30 local simply doesn't exist → clamps).
        const scheduledUtc = fromZonedTime(`${todayStr}T${time}:00`, tz);

        const minutesBefore = med.reminderMinutesBefore ?? 5;
        const diffMin = (scheduledUtc.getTime() - nowUtc.getTime()) / 60_000;

        // Fire when the scheduled time is 0 … minutesBefore+1 minutes away.
        if (diffMin < 0 || diffMin > minutesBefore + 1) continue;

        // Dedup: skip if this slot was already pushed during the current window.
        const dedupKey = `${med.id}:${time}`;
        const lastSent = _reminderSentAt.get(dedupKey);
        if (lastSent !== undefined && nowUtc.getTime() - lastSent < (minutesBefore + 2) * 60_000) continue;

        // Check not already taken/skipped today (compare against UTC-day boundary).
        const todayStart = new Date(`${todayStr}T00:00:00`);
        const todayEnd   = new Date(`${todayStr}T23:59:59`);
        const [existingLog] = await db.select().from(medicationLog)
          .where(and(
            eq(medicationLog.scheduleId, med.id),
            eq(medicationLog.userId, med.userId),
            gte(medicationLog.scheduledAt, todayStart),
            lte(medicationLog.scheduledAt, todayEnd),
          ))
          .limit(1);

        if (existingLog && (existingLog.status === 'taken' || existingLog.status === 'skipped')) continue;

        // Mobile (ios/android) devices schedule reminders locally via expo-notifications.
        // Server push is sent ONLY to web (VAPID) subscriptions.
        const tokens = await db
          .select({
            pushToken: aivitaDeviceTokens.pushToken,
            platform:  aivitaDeviceTokens.platform,
          })
          .from(aivitaDeviceTokens)
          .where(eq(aivitaDeviceTokens.userId, med.userId));

        const webTokens = tokens.filter(t => t.platform === 'web');
        if (webTokens.length === 0) continue;

        const notifData = { scheduleId: med.id, time, url: '/ru/medications' };
        const notifTitle = `💊 ${med.title}`;
        const notifBody  = `${med.dosage ? med.dosage + ' · ' : ''}Время принять в ${time}`;

        await Promise.all(
          webTokens.map(t =>
            sendWebPushNotification(t.pushToken, notifTitle, notifBody, notifData)
          )
        );

        _reminderSentAt.set(dedupKey, nowUtc.getTime());
        sent++;
      }
      } catch (userErr) {
        // Log and skip — do not let one user's bad data abort the entire run.
        logger.error({ err: userErr, scheduleId: med.id, userId: med.userId },
          '[Cron] Skipping medication schedule due to unexpected error');
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
