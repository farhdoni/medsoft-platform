'use client';
import * as React from 'react';
import Link from 'next/link';
import { ProfileMenu } from './ProfileMenu';
import type { AivitaSession } from '@/lib/auth/session';

interface TopHeaderProps {
  session: AivitaSession;
  locale: string;
}

export function TopHeader({ session, locale }: TopHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-app-border"
      style={{
        background: 'rgba(244, 243, 239, 0.85)',
        backdropFilter: 'blur(12px)',
        }}
    >
      <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}/home`} className="flex items-center group">
          <img
            src="/brand/aivita-logo-transparent.png"
            alt="AIVITA"
            className="h-8 w-auto transition-opacity group-hover:opacity-80"
          />
        </Link>

        {/* Right: ProfileMenu */}
        <ProfileMenu session={session} locale={locale} />
      </div>
    </header>
  );
}
