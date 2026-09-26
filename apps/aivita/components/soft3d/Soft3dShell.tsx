'use client';

import * as React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SosModal } from '@/components/sos/SosButton';

/**
 * Part A's flag-gated overlay: renders the new header + bottom nav around
 * whatever the page already renders underneath. This does NOT replace the
 * page's own existing header/nav (those are per-page, not layout-level —
 * see the Part A report for why) — under the flag you'll see both, which
 * is the expected "new shell over old content" state for this part.
 *
 * `unreadCount` (Part C): the doctor-unread-reply signal from
 * /v1/aivita/home-state, fetched once at the layout level (not per-page) so
 * the bell dot and the "assistant" nav badge stay in sync everywhere in the
 * app, not just on Home — see (app)/layout.tsx.
 */
export function Soft3dShell({
  locale,
  avatarInitial,
  unreadCount,
  children,
}: {
  locale: string;
  avatarInitial: string;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const [sosOpen, setSosOpen] = React.useState(false);

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)' }}>
      <Header locale={locale} avatarInitial={avatarInitial} unreadCount={unreadCount} onSosClick={() => setSosOpen(true)} />
      <div style={{ paddingBottom: 96 }}>{children}</div>
      <BottomNav locale={locale} badges={unreadCount ? { assistant: unreadCount } : undefined} />
      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
