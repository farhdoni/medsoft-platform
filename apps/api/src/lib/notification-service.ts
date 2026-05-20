import { db } from '@medsoft/db';
import { notifications } from '@medsoft/db';

export type NotificationType =
  | 'medication_reminder'
  | 'payment_confirm'
  | 'action_required'
  | 'appointment_reminder'
  | 'message_new'
  | 'checkup_result'
  | 'outbreak_alert'
  | 'subscription_expiring'
  | 'admin_broadcast'
  | 'doctor_verification'
  | 'family_request'
  | 'order_status';

const TYPE_ICONS: Record<NotificationType, string> = {
  message_new:            '💬',
  medication_reminder:    '💊',
  payment_confirm:        '💳',
  appointment_reminder:   '📅',
  checkup_result:         '🧬',
  outbreak_alert:         '🗺️',
  subscription_expiring:  '⏰',
  order_status:           '📦',
  family_request:         '👨‍👩‍👦',
  action_required:        '✅',
  admin_broadcast:        '📢',
  doctor_verification:    '🩺',
};

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  opts?: {
    link?: string;
    icon?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    body,
    icon: opts?.icon ?? TYPE_ICONS[type] ?? null,
    link: opts?.link ?? null,
    priority: opts?.priority ?? 'normal',
    metadata: opts?.metadata ?? null,
  });
}

export async function createBroadcastNotifications(
  userIds: string[],
  title: string,
  body: string,
  opts?: { link?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: 'admin_broadcast' as NotificationType,
      title,
      body,
      icon: '📢',
      link: opts?.link ?? null,
      priority: 'normal' as const,
      metadata: opts?.metadata ?? null,
    }))
  );
}
