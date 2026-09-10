/**
 * medication-reminders.ts — единственный источник правды для напоминаний о
 * приёме лекарств (все платформы: web/android/ios).
 *
 * Раньше эта функциональность была размазана по трём независимым cron-джобам
 * (см. историю: push-reminders.ts::sendMedicationReminders — реальный пуш,
 * только web, без повторов; notification-reminders.ts::checkMedicationReminders
 * — in-app уведомление раз в час, без повторов/missed). Один и тот же приём
 * лекарства мог триггерить все три одновременно, несогласованно. Теперь
 * весь путь — здесь.
 *
 * Логика:
 *  1. Раз в минуту считает актуальные слоты приёма по всем активным
 *     medicationSchedule, с учётом ТАЙМЗОНЫ ПОЛЬЗОВАТЕЛЯ (computeFireCandidates —
 *     та же функция, что использовал push-reminders.ts; предыдущая версия этого
 *     файла сравнивала часы/минуты сервера напрямую — баг, ломающий тайминг на
 *     любом сервере не в зоне пользователя).
 *  2. Первое напоминание — в момент приёма. Если medicationSchedule.persistentReminder
 *     — повтор через +15 мин, ещё через +30 мин (итого 3 попытки).
 *  3. Прогресс (какая попытка уже отправлена на слот) — персистентно в БД
 *     (medication_reminder_log.attempt, миграция 0053), не в памяти процесса:
 *     переживает рестарт/деплой API.
 *  4. Push шлётся реальным устройствам (Expo push API для android/ios, VAPID
 *     для web) через уже рабочий sendToTokensWithPlatform — тот же путь,
 *     что используют habit-напоминания. Плюс одно in-app уведомление
 *     (колокольчик) на первую попытку.
 *  5. Только для persistentReminder-лекарств: после 3-й попытки без факта
 *     приёма — medicationLog получает status='missed'.
 */

import cron from 'node-cron';
import { db } from '@medsoft/db';
import { medicationSchedule, medicationLog, aivitaDeviceTokens, aivitaUsers } from '@medsoft/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { sendToTokensWithPlatform } from '../lib/push-notifications.js';
import { createNotification } from '../lib/notification-service.js';
import { computeFireCandidates, type FireCandidate } from '../lib/reminder-schedule.js';
import { logger } from '../lib/logger.js';

// Верхняя граница catch-up: должна перекрывать окно 3-й попытки (+30 мин) с
// небольшим запасом на случай простоя/рестарта API внутри цикла напоминаний.
const CATCHUP_MIN = 32;

export function startMedicationReminders(): void {
  cron.schedule('* * * * *', () => {
    void runReminderCheck();
  });
  logger.info('[MedReminders] Cron started — checking every minute');
}

// Явный список колонок вместо всего medicationSchedule: схема в
// packages/db/src/schema/aivita-medications.ts объявляет колонку `status`,
// которой НЕТ ни в одной применённой миграции (обнаружено этой самой живой
// проверкой — .select({med: medicationSchedule}) падает с "column
// medication_schedule.status does not exist" на честно смигрированной БД).
// Реальный дрифт schema.ts vs миграций, не наша задача его закрывать —
// просто не наступаем на отсутствующую колонку.
type MedForReminder = {
  id: string;
  userId: string;
  title: string;
  dosage: string | null;
  times: unknown;
  startDate: string;
  endDate: string | null;
  persistentReminder: boolean;
};

async function runReminderCheck(): Promise<void> {
  const nowUtc = new Date();

  try {
    const rows = await db
      .select({
        med: {
          id: medicationSchedule.id,
          userId: medicationSchedule.userId,
          title: medicationSchedule.title,
          dosage: medicationSchedule.dosage,
          times: medicationSchedule.times,
          startDate: medicationSchedule.startDate,
          endDate: medicationSchedule.endDate,
          persistentReminder: medicationSchedule.persistentReminder,
        },
        timezone: aivitaUsers.timezone,
      })
      .from(medicationSchedule)
      .innerJoin(aivitaUsers, eq(aivitaUsers.id, medicationSchedule.userId))
      .where(and(
        eq(medicationSchedule.isActive, true),
        eq(medicationSchedule.reminderEnabled, true),
      ));

    for (const { med, timezone: rawTz } of rows) {
      try {
        const candidates = computeFireCandidates({
          times: (med.times as string[]) || [],
          tz: rawTz,
          nowUtc,
          minutesBefore: 1, // первая попытка — с точностью до минуты вокруг времени приёма
          catchupMin: CATCHUP_MIN,
          startDate: med.startDate,
          endDate: med.endDate,
        });

        for (const cand of candidates) {
          await processSlot(med, cand, nowUtc);
        }
      } catch (err) {
        logger.error({ err, scheduleId: med.id }, '[MedReminders] Skipping schedule due to error');
      }
    }
  } catch (err) {
    logger.error({ err }, '[MedReminders] Error in runReminderCheck');
  }
}

async function processSlot(
  med: MedForReminder,
  cand: FireCandidate,
  nowUtc: Date,
): Promise<void> {
  const minutesSince = (nowUtc.getTime() - cand.scheduledUtc.getTime()) / 60_000;

  let targetAttempt: 1 | 2 | 3 | null = null;
  if (minutesSince < 15) {
    targetAttempt = 1;
  } else if (med.persistentReminder && minutesSince < 30) {
    targetAttempt = 2;
  } else if (med.persistentReminder && minutesSince <= CATCHUP_MIN) {
    targetAttempt = 3;
  }
  if (targetAttempt === null) return; // не persistent и первое окно уже прошло — больше ничего не делаем

  // Уже отмечено (принял/пропустил) — повторам конец, независимо от таймингов.
  const dayStart = new Date(`${cand.fireDate}T00:00:00`);
  const dayEnd = new Date(`${cand.fireDate}T23:59:59`);
  const [log] = await db.select().from(medicationLog)
    .where(and(
      eq(medicationLog.scheduleId, med.id),
      eq(medicationLog.userId, med.userId),
      gte(medicationLog.scheduledAt, dayStart),
      lte(medicationLog.scheduledAt, dayEnd),
    ))
    .limit(1);
  if (log && (log.status === 'taken' || log.status === 'skipped')) return;

  // Персистентный claim: слот двигается на targetAttempt, только если он ещё
  // не дошёл до этой (или более поздней) попытки. At-most-once между тиками,
  // рестартами и репликами — тот же принцип, что был в 0023, расширенный на
  // прогрессию попыток вместо одноразовой отметки.
  const claimed = await db.execute(sql`
    INSERT INTO medication_reminder_log (schedule_id, fire_date, time, attempt, sent_at)
    VALUES (${med.id}, ${cand.fireDate}, ${cand.time}, ${targetAttempt}, now())
    ON CONFLICT (schedule_id, fire_date, time)
    DO UPDATE SET attempt = ${targetAttempt}, sent_at = now()
    WHERE medication_reminder_log.attempt < ${targetAttempt}
    RETURNING id
  `);
  if (Array.from(claimed).length === 0) return; // попытка уже отправлена раньше

  await sendReminder(med, cand, targetAttempt);

  if (targetAttempt === 3 && !log) {
    await db.insert(medicationLog).values({
      scheduleId: med.id,
      userId: med.userId,
      scheduledAt: cand.scheduledUtc,
      status: 'missed',
    }).onConflictDoNothing();
  }
}

async function sendReminder(
  med: MedForReminder,
  cand: FireCandidate,
  attempt: 1 | 2 | 3,
): Promise<void> {
  const title = attempt === 1 ? `💊 Время принять ${med.title}` : `⏰ Напоминание: ${med.title}`;
  const body = attempt === 1
    ? `${med.dosage ?? ''} — ${cand.time}`.trim()
    : attempt === 2
      ? 'Вы ещё не отметили приём. Не забудьте!'
      : 'Последнее напоминание. Отметьте приём в приложении.';
  const data = {
    scheduleId: med.id,
    time: cand.time,
    action: 'medication_reminder',
    persistent: med.persistentReminder ?? false,
    attempt,
    url: '/ru/medications',
  };

  try {
    const tokens = await db.select({
      pushToken: aivitaDeviceTokens.pushToken,
      platform: aivitaDeviceTokens.platform,
    }).from(aivitaDeviceTokens).where(eq(aivitaDeviceTokens.userId, med.userId));

    if (tokens.length > 0) {
      await sendToTokensWithPlatform(tokens, title, body, data);
    }
  } catch (err) {
    logger.error({ err, scheduleId: med.id }, '[MedReminders] Push send failed');
  }

  // In-app уведомление (колокольчик) — только на первую попытку, чтобы не спамить.
  if (attempt === 1) {
    try {
      await createNotification(med.userId, 'medication_reminder', title, body, {
        link: '/ru/medications',
      });
    } catch (err) {
      logger.error({ err, scheduleId: med.id }, '[MedReminders] In-app notification failed');
    }
  }
}
