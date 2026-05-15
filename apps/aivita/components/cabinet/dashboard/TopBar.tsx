"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/cabinet/icons/Icon";
import { ProfileMenu } from "@/components/cabinet/ProfileMenu";
import { SosModal } from "@/components/sos/SosButton";
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
  const [showSos, setShowSos] = useState(false);

  useEffect(() => {
    // Only self-fetch if parent did not supply count
    if (unreadCount !== undefined) return;

    function fetchUnread() {
      fetch('/api/notifications/unread-count')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.count != null) setSelfUnread(d.count); })
        .catch(() => {});
    }

    fetchUnread();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [unreadCount]);

  const unread = unreadCount ?? selfUnread;

  return (
    <>
      <header className="flex items-center justify-between px-4 pt-5 pb-2 sm:px-7 sm:pt-7">
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
        <div className="flex items-center gap-1 sm:gap-2">
          {/* SOS — patients only */}
          {role === 'patient' && (
            <button
              onClick={() => setShowSos(true)}
              className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full hover:bg-red-600 active:scale-95 transition-all shadow-sm sm:px-3 sm:py-1.5 sm:text-xs"
              aria-label="SOS Экстренный вызов"
            >
              SOS
            </button>
          )}
          {/* Search → каталог врачей */}
          <Link
            href={`/${locale}/doctors`}
            aria-label="Найти врача"
            className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-card transition hover:scale-105 sm:h-10 sm:w-10"
          >
            <Icon name="search" size={18} />
          </Link>
          <Link
            href={`/${locale}/notifications`}
            aria-label="Уведомления"
            className="relative grid h-8 w-8 place-items-center rounded-full bg-white shadow-card transition hover:scale-105 sm:h-10 sm:w-10"
          >
            <Icon name="bell" size={18} />
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 leading-none"
                style={{ background: 'var(--accent)' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <ProfileMenu session={session} locale={locale} role={role} />
        </div>
      </header>

      {/* SOS modal — rendered at root level to avoid clipping */}
      <SosModal open={showSos} onClose={() => setShowSos(false)} />
    </>
  );
}
