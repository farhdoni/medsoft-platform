import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

type NotificationItem = {
  id: string;
  type: 'ai_insight' | 'habit_reminder' | 'streak' | 'test_due';
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'ai_insight',
    title: 'AI-совет дня',
    body: 'Твой сон улучшился на 12% за неделю. Продолжай в том же духе!',
    time: '10 мин назад',
    read: false,
  },
  {
    id: '2',
    type: 'streak',
    title: '🔥 Стрик 7 дней!',
    body: 'Ты выполняешь привычку "Вода 2.5л" 7 дней подряд. Так держать!',
    time: '1 час назад',
    read: false,
  },
  {
    id: '3',
    type: 'test_due',
    title: 'Время тестирования',
    body: 'Пора пройти тест 5 систем — осталось 2 системы. Займёт 4 минуты.',
    time: 'Вчера',
    read: true,
  },
  {
    id: '4',
    type: 'habit_reminder',
    title: 'Напоминание: прогулка',
    body: 'Ты ещё не записал прогулку. Цель — 8000 шагов.',
    time: 'Вчера',
    read: true,
  },
];

const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: React.ComponentProps<typeof Icon3D>['name']; bg: string; accent: string }
> = {
  ai_insight: { icon: 'sparkle', bg: '#e0d8f0', accent: '#6e5fa0' },
  habit_reminder: { icon: 'book', bg: '#f0d4dc', accent: '#9c5e6c' },
  streak: { icon: 'shield', bg: '#d4e8d8', accent: '#548068' },
  test_due: { icon: 'heart', bg: '#d4dff0', accent: '#5e75a8' },
};

function groupByDate(notifications: NotificationItem[]) {
  const today: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];
  notifications.forEach((n) => {
    if (n.time.includes('мин') || n.time.includes('час')) today.push(n);
    else earlier.push(n);
  });
  return { today, earlier };
}

export default function NotificationsPage() {
  const { today, earlier } = groupByDate(NOTIFICATIONS);
  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <PageShell active="notifications">
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="Уведомления"
        subtitle={unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Всё прочитано'}
        accentColor="#cc8a96"
      />

      <div className="space-y-5 pb-8">
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <button
              className="text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: '#9c5e6c' }}
            >
              Прочитать все
            </button>
          </div>
        )}

        {[
          { label: 'Сегодня', items: today },
          { label: 'Вчера', items: earlier },
        ].map(({ label, items }) =>
          items.length === 0 ? null : (
            <div key={label}>
              <p
                className="text-[11px] font-bold uppercase tracking-wider mb-2.5"
                style={{ color: '#9a96a8' }}
              >
                {label}
              </p>
              <div className="space-y-2">
                {items.map((notif) => {
                  const { icon, bg, accent } = TYPE_CONFIG[notif.type];
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 rounded-2xl p-4 transition-all"
                      style={{
                        background: notif.read ? '#ffffff' : bg + '40',
                        border: `1px solid ${notif.read ? '#e8e4dc' : accent + '40'}`,
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-2xl flex-shrink-0 mt-0.5 flex items-center justify-center"
                        style={{ background: bg }}
                      >
                        <Icon3D name={icon} size={24} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: accent }}
                            />
                          )}
                        </div>
                        <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: '#6a6580' }}>
                          {notif.body}
                        </p>
                        <p className="text-[11px] mt-1.5" style={{ color: '#9a96a8' }}>
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
    </PageShell>
  );
}
