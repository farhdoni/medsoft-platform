'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { readConsent, writeConsent } from '@/lib/analytics/consent';
import { isMetrikaPage } from '@/lib/analytics/metrika';

const TEXT = {
  ru: { text: 'Мы используем cookie для аналитики: так мы понимаем, откуда к нам приходят и что улучшать.', accept: 'Принять', decline: 'Отклонить', more: 'Подробнее' },
  uz: { text: "Biz tahlil uchun cookie'lardan foydalanamiz: bu bizga qayerdan kelishingizni va nimani yaxshilashni tushunishga yordam beradi.", accept: 'Qabul qilaman', decline: 'Rad etaman', more: 'Batafsil' },
  en: { text: 'We use cookies for analytics — to see where visitors come from and what to improve.', accept: 'Accept', decline: 'Decline', more: 'Learn more' },
} as const;

/**
 * Простой баннер согласия: текст + «Принять» / «Отклонить». Показывается,
 * только когда есть что включать (настроен счётчик), человек ещё не отвечал
 * ни здесь, ни на лендинге, и только на публичных страницах, где Метрика
 * вообще работает (isMetrikaPage) — в кабинете спрашивать не о чем.
 * Тексты — те же, что в assets/analytics.js лендинга.
 */
export function ConsentBanner({ locale, enabled }: { locale: string; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onMetrikaPage = isMetrikaPage(pathname);

  useEffect(() => {
    setOpen(enabled && onMetrikaPage && readConsent() === null);
  }, [enabled, onMetrikaPage]);

  if (!open) return null;
  const t = TEXT[(locale as keyof typeof TEXT)] ?? TEXT.ru;

  function choose(value: 'granted' | 'denied') {
    writeConsent(value);
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[2147483000] flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl px-4 py-3.5 text-[13px] leading-snug text-center sm:text-left"
      style={{
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        width: 'calc(100% - 32px)',
        maxWidth: 640,
        background: '#1f1a2e',
        color: 'rgba(255,255,255,.88)',
        boxShadow: '0 12px 32px rgba(0,0,0,.25)',
      }}
    >
      <p className="m-0 flex-1">
        {t.text}{' '}
        <a href="https://aivita.uz/privacy.html" style={{ color: '#f0b6c2' }}>{t.more}</a>
      </p>
      <button
        type="button"
        onClick={() => choose('denied')}
        className="rounded-[10px] px-3.5 py-2 font-semibold whitespace-nowrap"
        style={{ border: '1px solid rgba(255,255,255,.25)', color: 'rgba(255,255,255,.7)', background: 'transparent' }}
      >
        {t.decline}
      </button>
      <button
        type="button"
        onClick={() => choose('granted')}
        className="rounded-[10px] px-3.5 py-2 font-semibold whitespace-nowrap text-white"
        style={{ background: '#c87d8a' }}
      >
        {t.accept}
      </button>
    </div>
  );
}

export default ConsentBanner;
