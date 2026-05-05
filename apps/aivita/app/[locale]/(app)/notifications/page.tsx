import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import type { IconName } from '@/components/cabinet/icons/Icon';
import { loadNotificationsData } from './data';
import { MarkAllReadButton } from './MarkAllReadButton';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function notifStyle(type: string): { icon: IconName; bg: string } {
  const map: Record<string, { icon: IconName; bg: string }> = {
    habit_reminder: { icon: 'habit',   bg: 'bg-bg-soft-purple' },
    test_due:       { icon: 'test',    bg: 'bg-bg-soft-pink'   },
    report_ready:   { icon: 'report',  bg: 'bg-bg-soft-mint'   },
    family_update:  { icon: 'family',  bg: 'bg-bg-soft-blue'   },
    health_alert:   { icon: 'pill',    bg: 'bg-bg-soft-pink'   },
    ai_insight:     { icon: 'doctor',  bg: 'bg-bg-soft-purple' },
    streak:         { icon: 'steps',   bg: 'bg-bg-soft-mint'   },
  };
  return map[type] ?? { icon: 'bell', bg: 'bg-bg-soft-purple' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { notifications, unreadCount } = await loadNotificationsData();

  return (
    <PageShell active="home" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
              УВЕДОМЛЕНИЯ
            </p>
            <h1 className="text-[22px] font-extrabold text-text-primary leading-tight">
              {unreadCount > 0 ? `${unreadCount} новых` : 'Всё прочитано'}
            </h1>
          </div>
          {unreadCount > 0 && <MarkAllReadButton />}
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────────── */}
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-[24px] bg-bg-soft-purple flex items-center justify-center">
              <Icon name="bell" size={40} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-text-primary mb-1">
                Пока нет уведомлений
              </p>
              <p className="text-[13px] text-text-muted max-w-[240px] leading-relaxed">
                Здесь появятся напоминания о привычках, готовые отчёты и обновления от семьи
              </p>
            </div>
          </div>
        )}

        {/* ── List ────────────────────────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => {
              const { icon, bg } = notifStyle(n.type);
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 rounded-card border transition-all ${
                    isUnread
                      ? 'bg-white border-border-soft'
                      : 'bg-bg-app border-transparent opacity-60'
                  }`}
                >
                  {/* Unread dot */}
                  <div className="pt-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${isUnread ? 'bg-accent-rose' : 'bg-transparent'}`} />
                  </div>

                  {/* Icon tile */}
                  <div className={`w-10 h-10 rounded-[12px] flex-shrink-0 flex items-center justify-center ${bg}`}>
                    <Icon name={icon} size={22} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary leading-snug">{n.title}</p>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[11px] text-text-muted mt-1.5">{relativeTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
