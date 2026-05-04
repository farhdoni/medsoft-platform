'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Shield, MessageCircle, CheckSquare,
  Utensils, Users, FileText, Bell, Settings,
} from 'lucide-react';
import { LogoMark } from '@/components/shared/logo';
import type { AivitaSession } from '@/lib/auth/session';

const NAV_ITEMS = [
  {
    href: '/home',
    label: 'Главная',
    icon: Home,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    shadow: 'rgba(102,126,234,0.4)',
    softBg: '#ede9fe',
    softIcon: '#7c3aed',
  },
  {
    href: '/test',
    label: 'Тест 5 систем',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    shadow: 'rgba(245,87,108,0.4)',
    softBg: '#fce7f3',
    softIcon: '#db2777',
  },
  {
    href: '/chat',
    label: 'AI-чат',
    icon: MessageCircle,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    shadow: 'rgba(79,172,254,0.4)',
    softBg: '#e0f2fe',
    softIcon: '#0284c7',
  },
  {
    href: '/habits',
    label: 'Привычки',
    icon: CheckSquare,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    shadow: 'rgba(67,233,123,0.4)',
    softBg: '#d1fae5',
    softIcon: '#059669',
  },
  {
    href: '/nutrition',
    label: 'Питание',
    icon: Utensils,
    gradient: 'linear-gradient(135deg, #fa8231 0%, #f7b731 100%)',
    shadow: 'rgba(250,130,49,0.4)',
    softBg: '#ffedd5',
    softIcon: '#ea580c',
  },
  {
    href: '/family',
    label: 'Семья',
    icon: Users,
    gradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    shadow: 'rgba(232,67,147,0.4)',
    softBg: '#fce7f3',
    softIcon: '#be185d',
  },
  {
    href: '/report',
    label: 'Отчёт врачу',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #2c5f7c 0%, #38b2ac 100%)',
    shadow: 'rgba(44,95,124,0.4)',
    softBg: '#e0f2fe',
    softIcon: '#0e7490',
  },
];

interface SidebarNavProps {
  session?: AivitaSession | null;
}

export function SidebarNav({ session }: SidebarNavProps) {
  const pathname = usePathname();

  const isNotifActive = pathname.includes('/notifications');
  const isSettingsActive = pathname.includes('/settings');

  const initials = session?.name
    ? session.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside className="hidden md:flex flex-col w-[76px] h-screen bg-white/90 backdrop-blur-xl border-r border-[rgba(120,160,200,0.15)] flex-shrink-0">

      {/* Logo mark */}
      <div className="h-[68px] flex items-center justify-center border-b border-[rgba(120,160,200,0.1)]">
        <Link href="/home">
          <LogoMark className="w-9 h-9 hover:scale-110 transition-transform" />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-0.5 scrollbar-none">
        {NAV_ITEMS.map(({ href, label, icon: Icon, gradient, shadow, softBg, softIcon }) => {
          const active = pathname.includes(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-2xl w-[64px] transition-all group"
            >
              {/* Icon button */}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
                style={
                  active
                    ? {
                        background: gradient,
                        boxShadow: `0 4px 14px ${shadow}`,
                        transform: 'scale(1.05)',
                      }
                    : {
                        background: softBg,
                      }
                }
              >
                <Icon
                  className="w-[18px] h-[18px] transition-colors"
                  style={{ color: active ? '#fff' : softIcon }}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              {/* Label */}
              <span
                className="text-[9px] font-semibold text-center leading-tight w-full px-0.5 transition-colors"
                style={{ color: active ? '#1a2f45' : '#94a3b8' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom utility: Bell + Gear */}
      <div className="py-3 flex flex-col items-center gap-1 border-t border-[rgba(120,160,200,0.1)]">
        <Link
          href="/notifications"
          title="Уведомления"
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={
            isNotifActive
              ? { background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }
              : { background: '#f1f5f9' }
          }
        >
          <Bell
            className="w-[18px] h-[18px]"
            style={{ color: isNotifActive ? '#fff' : '#94a3b8' }}
            strokeWidth={isNotifActive ? 2.5 : 2}
          />
        </Link>

        <Link
          href="/settings"
          title="Настройки"
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={
            isSettingsActive
              ? { background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)', boxShadow: '0 4px 12px rgba(51,65,85,0.4)' }
              : { background: '#f1f5f9' }
          }
        >
          <Settings
            className="w-[18px] h-[18px]"
            style={{ color: isSettingsActive ? '#fff' : '#94a3b8' }}
            strokeWidth={isSettingsActive ? 2.5 : 2}
          />
        </Link>
      </div>

      {/* Profile avatar */}
      <div className="pb-4 flex justify-center border-t border-[rgba(120,160,200,0.1)] pt-3">
        <Link
          href="/profile"
          title={session?.name ?? 'Профиль'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
          style={{ background: 'linear-gradient(135deg, #d4849a 0%, #2c5f7c 60%, #2dba9a 100%)' }}
        >
          {initials}
        </Link>
      </div>
    </aside>
  );
}
