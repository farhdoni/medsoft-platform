/**
 * medication-reminders.ts
 * Runs every minute. Checks medication schedules and:
 *  1. Sends browser notification to user's device tokens
 *  2. Persistent reminder: re-notifies at +15min, +30min if not taken
 *  3. Marks as 'missed' after 3 notifications with no action
 */

import cron from 'node-cron';
import { db } from '@medsoft/db';
import { medicationSchedule, medicationLog, aivitaDeviceTokens } from '@medsoft/db';
import { eq, and, gte, lte } from 'drizzle-orm';

// In-memory tracking of pending reminders: key = `${scheduleId}:${date}:${time}`, value = reminderCount
const pendingReminders = new Map<string, number>();

export function startMedicationReminders(): void {
  // Run every minute
  cron.schedule('* * * * *', () => {
    void runReminderCheck();
  });

  console.log('[MedReminders] Cron started — checking every minute');
}

async function runReminderCheck(): Promise<void> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    // Get all active medications with reminders enabled
    const meds = await db.select().from(medicationSchedule)
      .where(and(
        eq(medicationSchedule.isActive, true),
        eq(medicationSchedule.reminderEnabled, true),
      ));

    for (const med of meds) {
      if (!med.startDate || today < med.startDate) continue;
      if (med.endDate && today > med.endDate) continue;

      const times = (med.times as string[]) || [];
      if (times.length === 0) continue;

      for (const time of times) {
        const key = `${med.id}:${today}:${time}`;
        const reminderCount = pendingReminders.get(key) ?? 0;

        // Check if already taken
        const scheduledAt = new Date(`${today}T${time}:00`);
        const [log] = await db.select().from(medicationLog)
          .where(and(
            eq(medicationLog.scheduleId, med.id),
            eq(medicationLog.userId, med.userId),
            gte(medicationLog.scheduledAt, new Date(`${today}T00:00:00`)),
            lte(medicationLog.scheduledAt, new Date(`${today}T23:59:59`)),
          ))
          .limit(1);

        if (log && (log.status === 'taken' || log.status === 'skipped')) {
          // Done — clear from pending
          pendingReminders.delete(key);
          continue;
        }

        // Check timing windows
        const minutesSinceScheduled = Math.floor((now.getTime() - scheduledAt.getTime()) / 60000);

        const shouldRemind =
          // First reminder: at scheduled time (±1 min)
          (Math.abs(minutesSinceScheduled) <= 1 && reminderCount === 0) ||
          // Persistent: 15 min later
          (med.persistentReminder && minutesSinceScheduled >= 15 && minutesSinceScheduled <= 17 && reminderCount === 1) ||
          // Persistent: 30 min later
          (med.persistentReminder && minutesSinceScheduled >= 30 && minutesSinceScheduled <= 32 && reminderCount === 2);

        if (!shouldRemind) continue;

        // Build voice text for speech synthesis on client
        const doseStr = [med.dosage, med.foodInstruction as string | undefined].filter(Boolean).join(', ');
        const voiceText = reminderCount === 0
          ? `Время принять ${med.title}${doseStr ? '. ' + doseStr : ''}`
          : undefined;

        // Send notification
        await sendDeviceNotification(med.userId, {
          title: reminderCount === 0 ? `💊 Время принять ${med.title}` : `⏰ Напоминание: ${med.title}`,
          body: reminderCount === 0
            ? `${med.dosage ?? ''} — ${time}`.trim()
            : reminderCount === 1
              ? 'Вы ещё не отметили приём. Не забудьте!'
              : 'Последнее напоминание. Примите или пропустите лекарство.',
          data: {
            scheduleId: med.id,
            time,
            action: 'medication_reminder',
            voiceText,
            persistent: med.persistentReminder ?? false,
            sound: 'medication',
          },
        });

        pendingReminders.set(key, reminderCount + 1);

        // After 3 reminders without action — mark as missed
        if (reminderCount >= 2) {
          pendingReminders.delete(key);

          if (!log) {
            await db.insert(medicationLog).values({
              scheduleId: med.id,
              userId: med.userId,
              scheduledAt,
              status: 'missed',
            }).onConflictDoNothing();
          }
        }
      }
    }
  } catch (err) {
    console.error('[MedReminders] Error in runReminderCheck:', err);
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendDeviceNotification(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    const tokens = await db.select().from(aivitaDeviceTokens)
      .where(eq(aivitaDeviceTokens.userId, userId));

    if (tokens.length === 0) return;

    // Log the notification (actual push delivery handled by push service)
    console.log(`[MedReminders] Notification for user ${userId.slice(0, 8)}…:`, payload.title);

    // For web push, we'd call the Web Push API or FCM here.
    // Since we're using browser Notification API (PWA), the client polls for pending reminders.
    // Token-based push for native apps (FCM/APNs) would go here:
    /*
    for (const token of tokens) {
      if (token.platform === 'android') {
        await sendFcmNotification(token.pushToken, payload);
      } else if (token.platform === 'ios') {
        await sendApnsNotification(token.pushToken, payload);
      }
    }
    */
  } catch (err) {
    console.error('[MedReminders] sendDeviceNotification error:', err);
  }
}
