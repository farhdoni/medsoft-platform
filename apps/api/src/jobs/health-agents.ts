/**
 * AI Health Monitoring Agents — cron jobs.
 *
 * vitals_monitor:     every 30 minutes — check latest vitals for anomalies
 * medication_tracker: every hour       — check for missed medications
 * weekly_checkup:     Monday 04:00 UTC — weekly health checkup reminder
 */

import cron from 'node-cron';
import { db } from '@medsoft/db';
import {
  aivitaUsers, agentAlerts, agentSettings, vitals, medicationSchedule, medicationLog,
} from '@medsoft/db';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { createNotification } from '../lib/notification-service.js';
import { logger } from '../lib/logger.js';

// ─── Vitals thresholds (defaults) ────────────────────────────────────────────

const DEFAULTS = {
  pulse_high: 100,
  pulse_low: 50,
  systolic_high: 140,
  systolic_low: 90,
  diastolic_high: 90,
  diastolic_low: 60,
  spo2_low: 94,
  sugar_high: 11.1,
  sugar_low: 3.3,
  temp_high: 37.5,
  temp_low: 36.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function insertAlert(
  userId: string,
  agentType: string,
  severity: 'info' | 'warning' | 'critical',
  title: string,
  description: string,
  recommendation: string,
  relatedData?: Record<string, unknown>
) {
  try {
    await db.insert(agentAlerts).values({
      userId,
      agentType,
      severity,
      title,
      description,
      recommendation,
      relatedData: relatedData ?? {},
    });

    // Also push in-app notification for warning/critical
    if (severity !== 'info') {
      await createNotification(userId, 'action_required', title, description, { link: '/ru/health-agents' });
    }
  } catch (err) {
    logger.warn({ err, userId }, '[HealthAgents] Failed to insert alert');
  }
}

async function getSettings(userId: string) {
  const [row] = await db.select().from(agentSettings).where(eq(agentSettings.userId, userId)).limit(1);
  return row?.alertThresholds ?? {};
}

// ─── Vitals Monitor ────────────────────────────────────────────────────────────

async function runVitalsMonitor() {
  logger.info('[HealthAgents] vitals_monitor start');
  const since = new Date(Date.now() - 35 * 60000); // 35 min window

  try {
    // Find all distinct users who logged vitals in last 35 min
    const recentVitals = await db.select({
      userId: vitals.userId,
      type: vitals.type,
      value: vitals.value,
      recordedAt: vitals.recordedAt,
    })
      .from(vitals)
      .where(gte(vitals.recordedAt, since));

    const byUser = new Map<string, typeof recentVitals>();
    for (const v of recentVitals) {
      const list = byUser.get(v.userId) ?? [];
      list.push(v);
      byUser.set(v.userId, list);
    }

    for (const [userId, userVitals] of byUser) {
      const thresholds = await getSettings(userId);
      const t = { ...DEFAULTS, ...thresholds };

      for (const v of userVitals) {
        const val = (v.value as Record<string, unknown>)?.value;
        if (typeof val !== 'number') continue;

        let severity: 'warning' | 'critical' | null = null;
        let title = '';
        let description = '';
        let recommendation = '';

        if (v.type === 'heart_rate') {
          if (val > t.pulse_high + 20) { severity = 'critical'; title = `Критическая тахикардия: ${val} уд/мин`; description = `Пульс значительно превышает норму (>${t.pulse_high + 20} уд/мин).`; recommendation = 'Немедленно обратитесь к кардиологу или вызовите скорую помощь.'; }
          else if (val > t.pulse_high) { severity = 'warning'; title = `Высокий пульс: ${val} уд/мин`; description = `Пульс выше нормы (>>${t.pulse_high} уд/мин).`; recommendation = 'Отдохните, измерьте давление. Если сохраняется — обратитесь к врачу.'; }
          else if (val < t.pulse_low) { severity = 'warning'; title = `Низкий пульс: ${val} уд/мин`; description = `Пульс ниже нормы (<${t.pulse_low} уд/мин).`; recommendation = 'Избегайте резких движений. При головокружении — обратитесь к врачу.'; }
        } else if (v.type === 'spo2') {
          if (val < t.spo2_low - 4) { severity = 'critical'; title = `Критическое SpO2: ${val}%`; description = 'Насыщение кислородом критически низкое.'; recommendation = 'Вызовите скорую помощь немедленно.'; }
          else if (val < t.spo2_low) { severity = 'warning'; title = `Низкое SpO2: ${val}%`; description = `Насыщение кислородом ниже нормы (<${t.spo2_low}%).`; recommendation = 'Обеспечьте свежий воздух, измерьте повторно. При сохранении — обратитесь к врачу.'; }
        } else if (v.type === 'temperature') {
          if (val > 39.0) { severity = 'critical'; title = `Высокая температура: ${val}°C`; description = 'Температура тела критически высокая.'; recommendation = 'Примите жаропонижающее, обратитесь к врачу.'; }
          else if (val > t.temp_high) { severity = 'warning'; title = `Температура: ${val}°C`; description = `Температура выше нормы (>${t.temp_high}°C).`; recommendation = 'Пейте больше воды, отдыхайте. При ухудшении — обратитесь к врачу.'; }
        } else if (v.type === 'blood_sugar') {
          if (val > t.sugar_high) { severity = 'warning'; title = `Высокий сахар: ${val} ммоль/л`; description = 'Уровень глюкозы выше нормы.'; recommendation = 'Ограничьте углеводы, проконсультируйтесь с эндокринологом.'; }
          else if (val < t.sugar_low) { severity = 'critical'; title = `Низкий сахар: ${val} ммоль/л`; description = 'Гипогликемия — уровень сахара критически низкий.'; recommendation = 'Срочно съешьте быстрые углеводы (сок, сахар). При потере сознания — вызовите скорую.'; }
        }

        if (severity) {
          await insertAlert(userId, 'vitals_monitor', severity, title, description, recommendation, {
            vitalType: v.type, value: val, recordedAt: v.recordedAt,
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, '[HealthAgents] vitals_monitor error');
  }
  logger.info('[HealthAgents] vitals_monitor done');
}

// ─── Medication Tracker ────────────────────────────────────────────────────────

async function runMedicationTracker() {
  logger.info('[HealthAgents] medication_tracker start');
  const now = new Date();
  const currentHour = `${String(now.getUTCHours() + 5).padStart(2, '0')}:00`; // Tashkent UTC+5
  const todayStr = new Date(now.getTime() + 5 * 3600000).toISOString().slice(0, 10);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  try {
    // Active schedules whose time window includes current hour
    const activeSchedules = await db.select({
      id: medicationSchedule.id,
      userId: medicationSchedule.userId,
      title: medicationSchedule.title,
      times: medicationSchedule.times,
    })
      .from(medicationSchedule)
      .where(and(
        eq(medicationSchedule.isActive, true),
        gte(medicationSchedule.endDate, todayStr),
      ));

    for (const s of activeSchedules) {
      const times = (s.times ?? []) as string[];
      // Check if any scheduled time falls within current hour
      const dueTime = times.find((t) => t.startsWith(currentHour.slice(0, 2)));
      if (!dueTime) continue;

      // Build the scheduled_at timestamp for today + dueTime
      const [h, m] = dueTime.split(':').map(Number);
      const scheduledAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h - 5, m ?? 0, 0); // UTC

      // Check log for "taken" or "skipped" status today
      const [log] = await db.select({ id: medicationLog.id, status: medicationLog.status })
        .from(medicationLog)
        .where(and(
          eq(medicationLog.scheduleId, s.id),
          gte(medicationLog.scheduledAt, dayStart)
        ))
        .limit(1);

      const isTaken = log?.status === 'taken' || log?.status === 'skipped';
      if (!isTaken) {
        await insertAlert(
          s.userId,
          'medication_tracker',
          'warning',
          `Не принято лекарство: ${s.title}`,
          `Запланированный приём "${s.title}" в ${dueTime} не был отмечен.`,
          'Примите лекарство сейчас или отметьте как пропущенное в расписании медикаментов.',
          { scheduleId: s.id, scheduledAt: scheduledAt.toISOString(), dueTime }
        );
      }
    }
  } catch (err) {
    logger.error({ err }, '[HealthAgents] medication_tracker error');
  }
  logger.info('[HealthAgents] medication_tracker done');
}

// ─── Weekly Checkup ────────────────────────────────────────────────────────────

async function runWeeklyCheckup() {
  logger.info('[HealthAgents] weekly_checkup start');
  try {
    const users = await db.select({ id: aivitaUsers.id })
      .from(aivitaUsers)
      .where(isNull(aivitaUsers.deletedAt));

    for (const user of users) {
      // Check if user has agent settings with weeklyCheckupEnabled
      const [settings] = await db.select({ weeklyCheckupEnabled: agentSettings.weeklyCheckupEnabled })
        .from(agentSettings)
        .where(eq(agentSettings.userId, user.id))
        .limit(1);

      if (settings && !settings.weeklyCheckupEnabled) continue;

      await insertAlert(
        user.id,
        'weekly_checkup',
        'info',
        'Время для еженедельного чекапа',
        'Прошла неделя — самое время проверить ключевые показатели здоровья.',
        'Измерьте давление, пульс и вес. Заполните дневник питания и привычек. Запустите AI-анализ здоровья.',
        { weekOf: new Date().toISOString().slice(0, 10) }
      );
    }
  } catch (err) {
    logger.error({ err }, '[HealthAgents] weekly_checkup error');
  }
  logger.info('[HealthAgents] weekly_checkup done');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function startHealthAgents() {
  // Vitals monitor: every 30 minutes
  cron.schedule('*/30 * * * *', () => { void runVitalsMonitor(); });

  // Medication tracker: every hour at :05
  cron.schedule('5 * * * *', () => { void runMedicationTracker(); });

  // Weekly checkup: Monday 04:00 UTC
  cron.schedule('0 4 * * 1', () => { void runWeeklyCheckup(); });

  logger.info('[HealthAgents] Cron jobs registered: vitals_monitor, medication_tracker, weekly_checkup');
}
