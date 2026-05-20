'use client';

import { useRouter } from 'next/navigation';
import type { NotificationRecord } from './data';

const TYPE_ICON: Record<string, string> = {
  message_new:           '💬',
  medication_reminder:   '💊',
  payment_confirm:       '💳',
  appointment_reminder:  '📅',
  checkup_result:        '🧬',
  outbreak_alert:        '🗺️',
  subscription_expiring: '⏰',
  order_status:          '📦',
  family_request:        '👨‍👩‍👦',
  action_required:       '✅',
  admin_broadcast:       '📢',
  doctor_verification:   '🩺',
  habit_reminder:        '🌿',
  ai_insight:            '🤖',
  streak:                '🔥',
  test_due:              '📋',
  family_alert:          '👨‍👩‍👦',
};

const PRIORITY_RING: Record<string, string> = {
  urgent: 'border-l-4 border-l-red-400',
  high:   'border-l-4 border-l-orange-400',
  normal: '',
  low:    '',
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'вчера';
  return `${days} дн назад`;
}

interface Props {
  notification: NotificationRecord;
  locale: string;
}

export function NotificationItem({ notification: n, locale }: Props) {
  const router = useRouter();
  const isUnread = !n.isRead && !n.readAt;

  async function handleClick() {
    if (isUnread) {
      await fetch(`/api/proxy/notifications/${n.id}/read`, { method: 'PUT' }).catch(() => {});
    }
    if (n.link) {
      router.push(`/${locale}${n.link}`);
    }
  }

  const icon = n.icon ?? TYPE_ICON[n.type] ?? '🔔';
  const priorityClass = PRIORITY_RING[n.priority] ?? '';

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 p-4 rounded-card border transition-all ${priorityClass} ${
        isUnread
          ? 'bg-white border-border-soft'
          : 'bg-bg-app border-transparent opacity-60'
      } ${n.link ? 'cursor-pointer hover:shadow-sm hover:-translate-y-px' : 'cursor-default'}`}
    >
      {/* Unread dot */}
      <div className="pt-2 flex-shrink-0 w-2">
        <div className={`w-2 h-2 rounded-full ${isUnread ? 'bg-accent-rose' : 'bg-transparent'}`} />
      </div>

      {/* Icon tile */}
      <div className="w-10 h-10 rounded-[12px] flex-shrink-0 flex items-center justify-center bg-bg-soft-purple text-xl">
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] leading-snug ${isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
          {n.title}
        </p>
        <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{n.body}</p>
        <p className="text-[11px] text-text-muted mt-1.5">{relativeTime(n.createdAt)}</p>
      </div>

      {/* Arrow if has link */}
      {n.link && (
        <span className="text-[#bbb] text-sm mt-1 flex-shrink-0">›</span>
      )}
    </button>
  );
}
