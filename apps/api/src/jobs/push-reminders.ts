/**
 * Push notification cron jobs for Aivita mobile users.
 *
 * Runs:
 *   - Daily habit reminder at 09:00 UTC (12:00 Tashkent)
 *   - Weekly health report reminder every Monday at 09:00 UTC
 */

import cron from 'node-cron';
import { db } from '@medsoft/db';
import { aivitaUsers, aivitaDeviceTokens, habitLogs, habits, medicationSchedule, medicationLog, medicationReminderLog } from '@medsoft/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { sendPushNotification, sendWebPushNotification } from '../lib/push-notifications.js';
import { logger } from '../lib/logger.js';
import { computeFireCandidates } from '../lib/reminder-schedule.js';

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

// Дедуп — ПЕРСИСТЕНТНЫЙ (medication_reminder_log, миграция 0023): слот
// (scheduleId, fireDate, time) вставляется ДО отправки; уникальный констрейнт
// даёт at-most-once между тиками, рестартами и репликами. In-memory Map больше
// не используется. Catch-up ограничен CATCHUP_MIN: слот, просроченный сильнее,
// НЕ реанимируется (медбезопасность — старое «примите сейчас» вреднее тишины).
const CATCHUP_MIN = 30;

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
      const minutesBefore = med.reminderMinutesBefore ?? 5;

      // Слоты на [сегодня, завтра] в tz пользователя (полуночный край) с
      // ограниченным catch-up; tz-мусор внутри уходит в safeTimezone().
      const candidates = computeFireCandidates({
        times: (med.times as string[]) || [],
        tz: rawTz,
        nowUtc,
        minutesBefore,
        catchupMin: CATCHUP_MIN,
        startDate: med.startDate,
        endDate: med.endDate,
      });

      for (const cand of candidates) {
        // Check not already taken/skipped on the slot's date.
        const dayStart = new Date(`${cand.fireDate}T00:00:00`);
        const dayEnd   = new Date(`${cand.fireDate}T23:59:59`);
        const [existingLog] = await db.select().from(medicationLog)
          .where(and(
            eq(medicationLog.scheduleId, med.id),
            eq(medicationLog.userId, med.userId),
            gte(medicationLog.scheduledAt, dayStart),
            lte(medicationLog.scheduledAt, dayEnd),
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

        // Персистентный дедуп: insert-then-send. Вставка метки — последний гейт
        // перед отправкой; конфликт по unique(scheduleId, fireDate, time) значит
        // «слот уже отправлен» (другим тиком/репликой или до рестарта) → skip.
        const claimed = await db.insert(medicationReminderLog)
          .values({ scheduleId: med.id, fireDate: cand.fireDate, time: cand.time })
          .onConflictDoNothing({
            target: [
              medicationReminderLog.scheduleId,
              medicationReminderLog.fireDate,
              medicationReminderLog.time,
            ],
          })
          .returning({ id: medicationReminderLog.id });
        if (claimed.length === 0) continue; // слот уже забран — дубль не шлём

        const notifData = { scheduleId: med.id, time: cand.time, url: '/ru/medications' };
        const notifTitle = `💊 ${med.title}`;
        // Просроченный слот (catch-up ≤30 мин) — честная пометка о задержке,
        // БЕЗ «примите сейчас»: решение о приёме за пациентом/инструкцией.
        const notifBody = cand.late
          ? `${med.dosage ? med.dosage + ' · ' : ''}Напоминание (с задержкой): время приёма было в ${cand.time}`
          : `${med.dosage ? med.dosage + ' · ' : ''}Время принять в ${cand.time}`;

        await Promise.all(
          webTokens.map(t =>
            sendWebPushNotification(t.pushToken, notifTitle, notifBody, notifData)
          )
        );

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
