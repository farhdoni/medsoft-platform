'use client';
import { NotificationBell } from './notification-bell';

interface AppHeaderProps {
  name?: string;
  locale?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  return 'Добрый вечер';
}

export function AppHeader({ name = 'Азиз', locale = 'ru' }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      {/* Avatar + greeting */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-xs text-[rgb(var(--text-secondary))]">{getGreeting()}</p>
          <p className="text-sm font-semibold text-navy">{name}</p>
        </div>
      </div>

      {/* Notification bell with live count + dropdown */}
      <NotificationBell locale={locale} />
    </header>
  );
}
