'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/** Bottom nav — Main.dc.html. Current section gets the clay `.navbtn-on` pill. */
export function BottomNav({ locale }: { locale: string }) {
  const t = useTranslations('app.soft3d.nav');
  const pathname = usePathname();

  const items = [
    {
      href: `/${locale}/home`,
      label: t('home'),
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" aria-hidden="true">
          <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6h-6v6H6a2 2 0 0 1-2-2z" />
        </svg>
      ),
      iconOff: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth="1.9" aria-hidden="true">
          <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6h-6v6H6a2 2 0 0 1-2-2z" />
        </svg>
      ),
    },
    {
      href: `/${locale}/medical-card`,
      label: t('medicalCard'),
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 9h4M7 13h7" />
        </svg>
      ),
      iconOff: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth="1.9" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 9h4M7 13h7" />
        </svg>
      ),
    },
    {
      href: `/${locale}/ai-chat`,
      label: t('assistant'),
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" aria-hidden="true">
          <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2z" />
        </svg>
      ),
      iconOff: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth="1.9" aria-hidden="true">
          <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2z" />
        </svg>
      ),
    },
    {
      href: `/${locale}/medications`,
      label: t('medications'),
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-42 12 12.5)" /><path d="M9 9l6 6" />
        </svg>
      ),
      iconOff: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth="1.9" aria-hidden="true">
          <rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-42 12 12.5)" /><path d="M9 9l6 6" />
        </svg>
      ),
    },
    {
      href: `/${locale}/ai-checkup`,
      label: t('checkup'),
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" aria-hidden="true">
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      ),
      iconOff: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth="1.9" aria-hidden="true">
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="tile grain"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        maxWidth: 456,
        margin: '0 auto',
        height: 72,
        borderRadius: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 6px',
        zIndex: 40,
      }}
    >
      {items.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="navbtn"
            aria-current={active ? 'page' : undefined}
          >
            {active ? (
              <span
                className="navbtn-on"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 28, borderRadius: 14 }}
              >
                {item.icon}
              </span>
            ) : (
              item.iconOff
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
