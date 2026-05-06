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
}

export function TopBar({ avatarInitial, session, locale = 'ru' }: TopBarProps) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch('/api/notifications/unread-count', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setUnread(d.count); })
      .catch(() => {});
  }, []);

  return (
    <header className="flex items-center justify-between px-7 pt-7 pb-2">
      <div className="brand-mark text-[20px] font-bold tracking-tight text-text-primary">
        aivita
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
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#9c5e6c] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <ProfileMenu session={session} locale={locale} />
      </div>
    </header>
  );
}
