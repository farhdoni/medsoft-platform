import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { loadNotificationsData } from './data';
import { NotificationsActions } from './NotificationsActions';
import { NotificationItem } from './NotificationItem';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { notifications, unreadCount } = await loadNotificationsData();

  return (
    <PageShell active="" locale={locale}>
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
          <NotificationsActions unreadCount={unreadCount} totalCount={notifications.length} />
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────────── */}
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-[24px] bg-bg-soft-purple flex items-center justify-center text-3xl">
              🔔
            </div>
            <div>
              <p className="text-[16px] font-semibold text-text-primary mb-1">
                Пока нет уведомлений
              </p>
              <p className="text-[13px] text-text-muted max-w-[240px] leading-relaxed">
                Здесь появятся напоминания о лекарствах, сообщения от врача и важные обновления
              </p>
            </div>
          </div>
        )}

        {/* ── List ────────────────────────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
