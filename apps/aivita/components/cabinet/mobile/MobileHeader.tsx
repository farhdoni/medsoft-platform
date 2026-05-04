"use client";

import { Icon } from "@/components/icons/Icon";
import type { User } from "@/lib/types";

export function MobileHeader({ user }: { user: User }) {
  return (
    <header className="flex items-start justify-between px-5 pt-3">
      <div>
        <div className="text-[12px] text-text-muted">Доброе утро</div>
        <div className="text-[22px] font-extrabold text-text-primary">
          {user.name.split(" ")[0]}
        </div>
      </div>
      <button
        type="button"
        aria-label="Профиль"
        className="grid h-10 w-10 place-items-center rounded-full bg-accent-purple text-white font-semibold"
      >
        {user.avatarInitial}
      </button>
    </header>
  );
}
