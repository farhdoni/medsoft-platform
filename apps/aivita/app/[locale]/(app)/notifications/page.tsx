import { Bell, Heart, Zap, Star } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

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

const TYPE_ICONS = {
  ai_insight: { icon: Zap, bg: 'bg-gradient-pink-blue-mint', color: 'text-white' },
  habit_reminder: { icon: Bell, bg: 'bg-orange-100', color: 'text-orange-500' },
  streak: { icon: Star, bg: 'bg-amber-100', color: 'text-amber-500' },
  test_due: { icon: Heart, bg: 'bg-blue-100', color: 'text-blue-500' },
};

function groupByDate(notifications: NotificationItem[]) {
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];

  notifications.forEach((n) => {
    if (n.time.includes('мин') || n.time.includes('час')) {
      today.push(n);
    } else {
      yesterday.push(n);
    }
  });

  return { today, yesterday };
}

export default function NotificationsPage() {
  const { today, yesterday } = groupByDate(NOTIFICATIONS);
  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen">
      <AppHeader name="Уведомления" hasNotifications={false} />

      <div className="px-5 space-y-4 pb-6">
        {unreadCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[rgb(var(--text-secondary))]">
              {unreadCount} непрочитанных
            </span>
            <button className="text-xs text-pink-500 font-semibold">
              Прочитать все
            </button>
          </div>
        )}

        {[
          { label: 'Сегодня', items: today },
          { label: 'Вчера', items: yesterday },
        ].map(({ label, items }) =>
          items.length === 0 ? null : (
            <div key={label}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-2 px-1">
                {label}
              </h3>
              <div className="space-y-2">
                {items.map((notif) => {
                  const { icon: Icon, bg, color } = TYPE_ICONS[notif.type];
                  return (
                    <div
                      key={notif.id}
                      className={`bg-white/80 backdrop-blur-xl rounded-2xl border p-4 shadow-soft transition-all ${
                        !notif.read
                          ? 'border-pink-100 bg-pink-50/40'
                          : 'border-[rgba(120,160,200,0.15)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-navy">{notif.title}</p>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 leading-relaxed">
                            {notif.body}
                          </p>
                          <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1.5">{notif.time}</p>
                        </div>
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
  );
}
