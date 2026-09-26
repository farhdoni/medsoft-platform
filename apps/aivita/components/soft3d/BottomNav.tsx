'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export interface BottomNavBadges {
  /** Doctor-unread-reply signal (Part C) — shown on the "assistant" item,
   *  matching HomeReply.dc.html's nav badge. Always 1 when true: this is a
   *  presence signal (getOnboardingProgress's sibling, home-state.ts's
   *  doctorReply.hasUnread), not a real unread-message count. */
  assistant?: number;
}

/** Bottom nav — Main.dc.html. Current section gets the clay `.navbtn-on` pill. */
export function BottomNav({ locale, badges }: { locale: string; badges?: BottomNavBadges }) {
  const t = useTranslations('app.soft3d.nav');
  const pathname = usePathname();

  const items = [
    {
      id: 'home' as const,
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
      id: 'medicalCard' as const,
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
      id: 'assistant' as const,
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
      id: 'medications' as const,
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
      id: 'checkup' as const,
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
        const badgeCount = item.id === 'assistant' ? badges?.assistant : undefined;
        const icon = active ? (
          <span
            className="navbtn-on"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 28, borderRadius: 14 }}
          >
            {item.icon}
          </span>
        ) : (
          item.iconOff
        );
        return (
          <Link
            key={item.href}
            href={item.href}
            className="navbtn"
            aria-current={active ? 'page' : undefined}
          >
            {badgeCount ? (
              <span style={{ position: 'relative', display: 'flex' }}>
                {icon}
                <span
                  aria-label={t('unreadBadgeAriaLabel')}
                  style={{
                    position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, padding: '0 4px',
                    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: '800 11px/1 Nunito, sans-serif', color: '#fff',
                    background: 'linear-gradient(176deg, var(--s3-clay-lt), var(--s3-clay-dk))',
                  }}
                >
                  {badgeCount}
                </span>
              </span>
            ) : icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
