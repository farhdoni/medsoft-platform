'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Gift } from 'lucide-react';

const STORAGE_KEY = 'aivita_referral_banner_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export function ReferralBanner({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed || Date.now() - Number(dismissed) > DISMISS_DURATION_MS) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
  }

  if (!visible) return null;

  return (
    <section className="px-4 pb-4 sm:px-7">
      <Link
        href={`/${locale}/settings/referral`}
        className="relative flex items-center gap-3 rounded-2xl p-4 transition active:scale-[0.99]"
        style={{ background: 'linear-gradient(135deg, #f4e8f0 0%, #e8e4f8 100%)', border: '1px solid rgba(156,94,108,0.15)' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(156,94,108,0.12)' }}>
          <Gift className="w-5 h-5" style={{ color: '#9c5e6c' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>
            Пригласи друга — получи Premium бесплатно
          </p>
          <p className="text-[11px]" style={{ color: '#7a5090' }}>
            Оба получите 1 месяц Premium в подарок →
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(42,37,64,0.06)' }}
          aria-label="Закрыть"
        >
          <X className="w-3.5 h-3.5" style={{ color: '#9a96a8' }} />
        </button>
      </Link>
    </section>
  );
}
