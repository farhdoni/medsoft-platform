"use client";

import { Icon } from "@/components/cabinet/icons/Icon";

export function TopBar({ avatarInitial }: { avatarInitial: string }) {
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
        <button
          aria-label="Профиль"
          className="grid h-10 w-10 place-items-center rounded-full bg-accent-purple text-white font-semibold transition hover:scale-105"
        >
          {avatarInitial}
        </button>
      </div>
    </header>
  );
}
