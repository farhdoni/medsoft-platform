'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon3D, type Icon3DName } from '@/components/cabinet/icons/Icon3D';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: Icon3DName;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',   label: 'Главная',  href: '/home',      icon: 'home'   },
  { id: 'test',   label: 'Тест',     href: '/test',      icon: 'test'   },
  { id: 'habits', label: 'Привычки', href: '/habits',    icon: 'book'   },
  { id: 'food',   label: 'Питание',  href: '/nutrition', icon: 'food'   },
  { id: 'family', label: 'Семья',    href: '/family',    icon: 'family' },
];

export function BottomNav({ locale = 'ru' }: { locale?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => !!pathname?.includes(href);

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center px-2 py-2 rounded-full border"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        borderColor: '#e8e4dc',
        boxShadow: '0 16px 48px rgba(42, 37, 64, 0.18)',
      }}
      aria-label="Навигация"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.id}
            href={`/${locale}${item.href}`}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-all duration-200"
            style={{
              background: active ? '#f0d4dc' : 'transparent',
              minWidth: 64,
            }}
          >
            <Icon3D name={item.icon} size={24} />
            <span
              className="text-[11px] font-semibold leading-none whitespace-nowrap"
              style={{ color: active ? '#9c5e6c' : '#9a96a8' }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
