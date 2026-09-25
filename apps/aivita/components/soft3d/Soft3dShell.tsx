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
 */
export function Soft3dShell({
  locale,
  avatarInitial,
  children,
}: {
  locale: string;
  avatarInitial: string;
  children: React.ReactNode;
}) {
  const [sosOpen, setSosOpen] = React.useState(false);

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)' }}>
      <Header locale={locale} avatarInitial={avatarInitial} onSosClick={() => setSosOpen(true)} />
      <div style={{ paddingBottom: 96 }}>{children}</div>
      <BottomNav locale={locale} />
      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
