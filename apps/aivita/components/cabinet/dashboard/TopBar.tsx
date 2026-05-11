"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/cabinet/icons/Icon";
import { ProfileMenu } from "@/components/cabinet/ProfileMenu";
import type { AivitaSession } from "@/lib/auth/session";

interface TopBarProps {
  avatarInitial: string;
  session?: AivitaSession | null;
  locale?: string;
  role?: 'patient' | 'doctor';
  /** Override unread count (e.g. from parent that already fetched). Omit to self-fetch. */
  unreadCount?: number;
}

export function TopBar({ avatarInitial, session, locale = 'ru', role, unreadCount }: TopBarProps) {
  const [selfUnread, setSelfUnread] = useState(0);

  useEffect(() => {
    // Only self-fetch if parent did not supply count
    if (unreadCount !== undefined) return;
    fetch('/api/notifications/unread-count', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setSelfUnread(d.count); })
      .catch(() => {});
  }, [unreadCount]);

  const unread = unreadCount ?? selfUnread;

  return (
    <header className="flex items-center justify-between px-7 pt-7 pb-2">
      <div className="flex items-center gap-2">
        <div className="brand-mark text-[20px] font-bold tracking-tight text-app-t1">
          aivita
        </div>
        {role === 'doctor' && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--role-badge-bg)', color: 'var(--role-badge-text)' }}
          >
            Врач
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Поиск"
          className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card transition hover:scale-105"
        >
          <Icon name="search" size={20} />
        </button>
        <Link
          href={`/${locale}/notifications`}
          aria-label="Уведомления"
          className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-card transition hover:scale-105"
        >
          <Icon name="bell" size={20} />
          {unread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 leading-none"
              style={{ background: 'var(--accent)' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <ProfileMenu session={session} locale={locale} />
      </div>
    </header>
  );
}
