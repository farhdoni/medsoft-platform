'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Send, X } from 'lucide-react';

// Unlike ReferralBanner's 1-week snooze, this is a one-time dismissal —
// once closed, it stays closed (per-browser; see recon report for the
// localStorage-vs-account-flag tradeoff).
const STORAGE_KEY = 'aivita_telegram_banner_dismissed';

export function TelegramBanner({ locale }: { locale: string }) {
  const t = useTranslations('app.telegramBanner');
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  if (!visible) return null;

  return (
    <section className="mx-3 mt-4 sm:mx-7">
      <div className="relative flex items-center gap-3 rounded-[22px] border border-[#e8e4dc] bg-white p-3.5 pr-10 shadow-card">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: '#d4e8f5' }}
        >
          <Send className="h-5 w-5" style={{ color: '#3a8fc7' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black text-[#2a2540]">{t('title')}</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#6a6580]">
            {t('description')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/settings/telegram`)}
          className="flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold text-white transition active:scale-95"
          style={{ background: '#3a8fc7' }}
        >
          {t('connectButton')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('close')}
          className="absolute right-2 top-1/2 flex h-6 w-6 flex-shrink-0 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(42,37,64,0.06)' }}
        >
          <X className="h-3.5 w-3.5" style={{ color: '#9a96a8' }} />
        </button>
      </div>
    </section>
  );
}
