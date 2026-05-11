'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

const NAV_ITEMS = [
  { id: 'home',     label: 'Dashboard',   href: '/doctor-home',     icon: 'home'     as const },
  { id: 'patients', label: 'Пациенты',    href: '/doctor-patients', icon: 'family'   as const },
  { id: 'schedule', label: 'Расписание',  href: '/doctor-schedule', icon: 'calendar' as const },
  { id: 'chats',    label: 'Чаты',        href: '/doctor-chats',    icon: 'chat'     as const },
  { id: 'profile',  label: 'Профиль',     href: '/doctor-profile',  icon: 'doctor'   as const },
];

export function DoctorBottomNav({ locale = 'ru' }: { locale?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => !!pathname?.includes(href);

  return (
    <>
      <nav
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center px-2 py-2 rounded-full border border-app-border"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 16px 48px rgba(42, 37, 64, 0.18)',
        }}
        aria-label="Навигация врача"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={`/${locale}${item.href}`}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                background: active ? 'var(--accent-bg)' : 'transparent',
                minWidth: 54,
              }}
            >
              <Icon3D name={item.icon} size={24} />
              <span
                className="text-[10px] font-semibold leading-none whitespace-nowrap"
                style={{ color: active ? 'var(--accent-dark)' : '#9a96a8' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* FAB — AI-ассистент */}
        <Link
          href={`/${locale}/doctor-ai`}
          className="flex items-center justify-center w-11 h-11 rounded-full ml-1 transition-all duration-200 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--hero-from), var(--accent-dark))',
            boxShadow: '0 4px 16px rgba(110, 95, 160, 0.45)',
          }}
          title="AI-ассистент"
        >
          <Icon3D name="sparkle" size={20} />
        </Link>
      </nav>
      <div className="h-24" />
    </>
  );
}
