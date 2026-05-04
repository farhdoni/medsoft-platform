'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon3D, type Icon3DName } from '@/components/cabinet/icons/Icon3D';
import { LogoMark } from '@/components/shared/logo';
import { ProfileMenu } from '@/components/cabinet/ProfileMenu';
import type { AivitaSession } from '@/lib/auth/session';

interface NavItem {
  href: string;
  label: string;
  icon: Icon3DName;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Главная', icon: 'home' },
  { href: '/test', label: 'Тест 5 систем', icon: 'shield' },
  { href: '/chat', label: 'AI-чат', icon: 'chat' },
  { href: '/habits', label: 'Привычки', icon: 'book' },
  { href: '/nutrition', label: 'Питание', icon: 'food' },
  { href: '/family', label: 'Семья', icon: 'family' },
  { href: '/report', label: 'Отчёт врачу', icon: 'report' },
  { href: '/notifications', label: 'Уведомления', icon: 'bell' },
  { href: '/settings', label: 'Настройки', icon: 'settings' },
];

interface SidebarNavProps {
  session?: AivitaSession | null;
  locale?: string;
}

export function SidebarNav({ session, locale = 'ru' }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname?.includes(href) ?? false;

  return (
    <aside
      className="hidden md:flex flex-col items-center flex-shrink-0 py-4"
      style={{
        width: 72,
        height: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e8e4dc',
      }}
    >
      {/* Logo */}
      <div className="mb-4">
        <Link href={`/${locale}/home`} title="Главная">
          <LogoMark className="w-9 h-9 hover:scale-110 transition-transform" />
        </Link>
      </div>

      {/* Divider */}
      <div className="w-8 mb-3" style={{ height: 1, background: '#e8e4dc' }} />

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 overflow-y-auto w-full px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`/${locale}${href}`}
              title={label}
              className="flex flex-col items-center gap-[3px] py-1.5 px-1 rounded-2xl w-full transition-colors hover:bg-[#f0d4dc]/40"
              style={{
                background: active ? '#f0d4dc' : 'transparent',
              }}
            >
              <div className="w-11 h-11 flex items-center justify-center">
                <Icon3D name={icon} size={active ? 28 : 24} />
              </div>
              <span
                className="text-[9px] font-semibold text-center leading-tight w-full px-0.5"
                style={{ color: active ? '#9c5e6c' : '#9a96a8' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="w-8 mt-3 mb-3" style={{ height: 1, background: '#e8e4dc' }} />

      {/* Profile menu */}
      <ProfileMenu session={session} locale={locale} />
    </aside>
  );
}
