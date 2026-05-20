'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = [
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
] as const;

export function LangSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(newLocale: string) {
    if (newLocale === locale || isPending) return;
    const newPath = (pathname ?? `/${locale}`).replace(/^\/(ru|uz|en)(\/|$)/, `/${newLocale}$2`) || `/${newLocale}`;
    startTransition(() => router.push(newPath));
  }

  return (
    <div
      className="flex items-center rounded-full p-0.5"
      style={{ background: 'rgba(0,0,0,0.06)' }}
    >
      {LOCALES.map(({ code, label }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            onClick={() => switchLocale(code)}
            disabled={isPending}
            className="px-2 py-0.5 text-[11px] font-bold rounded-full transition-all disabled:opacity-60"
            style={{
              background: active ? '#fff' : 'transparent',
              color: active ? 'var(--accent-dark, #6a3a4a)' : '#9a96a8',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}
            aria-pressed={active}
            aria-label={`Switch to ${label}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
