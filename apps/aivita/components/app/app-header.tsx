'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';

interface AppHeaderProps {
  name?: string;
  hasNotifications?: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  return 'Добрый вечер';
}

export function AppHeader({ name = 'Азиз', hasNotifications = true }: AppHeaderProps) {
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

      {/* Notification bell */}
      <Link href="/notifications" className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center hover:bg-white transition-colors">
        <Bell className="w-4 h-4 text-navy" />
        {hasNotifications && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />
        )}
      </Link>
    </header>
  );
}
