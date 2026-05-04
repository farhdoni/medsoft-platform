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
      className="sticky top-0 z-30 border-b"
      style={{
        background: 'rgba(244, 243, 239, 0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: '#e8e4dc',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}/home`} className="flex items-center gap-1.5 group">
          <span
            className="text-xl font-bold transition-opacity group-hover:opacity-80"
            style={{ color: '#cc8a96' }}
          >
            ✦
          </span>
          <span
            className="text-[18px] font-bold"
            style={{ color: '#2a2540' }}
          >
            aivita
            <em
              className="not-italic font-normal text-[11px] ml-0.5 align-middle"
              style={{ color: '#9a96a8' }}
            >
              .uz
            </em>
          </span>
        </Link>

        {/* Right: ProfileMenu */}
        <ProfileMenu session={session} locale={locale} />
      </div>
    </header>
  );
}
