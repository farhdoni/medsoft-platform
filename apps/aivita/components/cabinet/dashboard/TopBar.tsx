"use client";

import { Icon } from "@/components/cabinet/icons/Icon";
import { ProfileMenu } from "@/components/cabinet/ProfileMenu";
import type { AivitaSession } from "@/lib/auth/session";

interface TopBarProps {
  avatarInitial: string;
  session?: AivitaSession | null;
  locale?: string;
}

export function TopBar({ avatarInitial, session, locale = 'ru' }: TopBarProps) {
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
        <button
          aria-label="Уведомления"
          className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card transition hover:scale-105"
        >
          <Icon name="bell" size={20} />
        </button>
        <ProfileMenu session={session} locale={locale} />
      </div>
    </header>
  );
}
