"use client";

import { TopBar } from "./TopBar";
import { FloatingNav } from "./FloatingNav";
import type { AivitaSession } from "@/lib/auth/session";

interface Props {
  active?: string;
  avatarInitial?: string;
  session?: AivitaSession | null;
  locale?: string;
  children: React.ReactNode;
}

/** Wraps inner cabinet pages with the shared TopBar + FloatingNav chrome. */
export function PageShell({ active, avatarInitial = "F", session, locale = "ru", children }: Props) {
  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6 bg-bg-app">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={avatarInitial} session={session} locale={locale} />
        <div className="px-7 py-5">
          {children}
        </div>
      </div>
      <FloatingNav active={active} />
    </main>
  );
}
