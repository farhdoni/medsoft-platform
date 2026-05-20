'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon3D, type Icon3DName } from '@/components/cabinet/icons/Icon3D';

interface NavItem {
  id: string;
  href: string;
  icon: Icon3DName;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',   href: '/home',   icon: 'home'   },
  { id: 'test',   href: '/test',   icon: 'test'   },
  { id: 'habits', href: '/habits', icon: 'book'   },
  { id: 'chats',  href: '/chats',  icon: 'chat'   },
  { id: 'family', href: '/family', icon: 'family' },
];

export function BottomNav({ locale = 'ru' }: { locale?: string }) {
  const t = useTranslations('app.nav');
  const pathname = usePathname();
  const isActive = (href: string) => !!pathname?.includes(href);

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center px-2 py-2 rounded-full border border-app-border"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 16px 48px rgba(42, 37, 64, 0.18)',
      }}
      aria-label={t('home')}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.id}
            href={`/${locale}${item.href}`}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all duration-200"
            style={{
              background: active ? 'var(--accent-light)' : 'transparent',
              minWidth: 64,
            }}
          >
            <Icon3D name={item.icon} size={24} />
            <span
              className="text-[11px] font-semibold leading-none whitespace-nowrap"
              style={{ color: active ? 'var(--accent-dark)' : '#9a96a8' }}
            >
              {t(item.id)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
