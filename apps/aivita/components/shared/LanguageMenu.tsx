'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe, ChevronDown } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { LOCALES, type LocaleCode, setLocaleCookie, withLocale } from '@/lib/i18n/locales';

interface LanguageMenuModalProps {
  locale: string;
  title: string;
  onClose: () => void;
  onSelect: (code: LocaleCode) => void;
}

/** The picker list alone, no trigger — for callers (Settings) that already
 * have their own trigger row and just need the shared list markup. */
export function LanguageMenuModal({ locale, title, onClose, onSelect }: LanguageMenuModalProps) {
  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className="space-y-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onSelect(l.code)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
            style={{
              background: locale === l.code ? 'var(--accent-bg-light)' : '#f4f3ef',
              border: locale === l.code ? '2px solid var(--accent-dark)' : '2px solid transparent',
            }}
          >
            <span className="text-2xl">{l.flag}</span>
            <span className="text-sm font-semibold flex-1 text-app-t1">{l.name}</span>
            {locale === l.code && (
              <span className="text-xs font-bold text-[color:var(--accent-dark)]">✓</span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

interface LanguageMenuButtonProps {
  locale: string;
  /** Used as both the modal title and the trigger's aria-label. */
  title: string;
  /** 'icon' — compact circular globe chip (matches TopBar's other icon
   * buttons). 'pill' — flag + native name + chevron (for pre-login screens,
   * where a bare icon would give no hint that it's a language switcher). */
  variant?: 'icon' | 'pill';
  className?: string;
  /** Called right after navigation is kicked off — e.g. to also PATCH the
   * signed-in user's account (Telegram/email pick language off
   * aivita_users.locale, not the cookie — see Settings' prior standalone
   * LanguageModal, which this component replaces). */
  onAfterSelect?: (code: LocaleCode) => void;
}

export function LanguageMenuButton({ locale, title, variant = 'icon', className, onAfterSelect }: LanguageMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? `/${locale}`;
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function select(code: LocaleCode) {
    setOpen(false);
    if (code === locale) return;
    setLocaleCookie(code);
    const qs = searchParams?.toString();
    router.push(withLocale(pathname, code) + (qs ? `?${qs}` : ''));
    router.refresh();
    onAfterSelect?.(code);
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={title}
          className={className ?? 'grid h-8 w-8 place-items-center rounded-full bg-white shadow-card transition hover:scale-105 sm:h-10 sm:w-10'}
        >
          <Globe size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={title}
          className={className ?? 'flex items-center gap-1.5 px-3.5 py-1.5 mx-auto mb-6 rounded-full text-[12px] font-semibold bg-white border border-[#e8e4dc] text-[#6a6580] transition hover:border-[#e4a8b4]'}
        >
          <span>{current.flag}</span>
          <span>{current.name}</span>
          <ChevronDown size={13} />
        </button>
      )}
      {open && (
        <LanguageMenuModal locale={locale} title={title} onClose={() => setOpen(false)} onSelect={select} />
      )}
    </>
  );
}
