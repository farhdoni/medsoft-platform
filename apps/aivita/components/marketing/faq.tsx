'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function FaqSection() {
  const t = useTranslations('faq');
  const items = [1, 2, 3, 4, 5, 6, 7].map((i) => ({
    q: t(`q${i}` as any),
    a: t(`a${i}` as any),
  }));
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="px-6 md:px-14 py-20">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-medical-blue-700 mb-3">{t('eyebrow')}</div>
          <h2 className="text-[clamp(32px,4vw,52px)] font-light tracking-tightest text-navy mb-4">
            {t('title1')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em>
          </h2>
          <p className="text-[rgb(var(--text-secondary))]">{t('subtitle')}</p>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all ${open === i
                ? 'bg-gradient-air-pink border-pink-500/30'
                : 'bg-white/75 border-[rgba(120,160,200,0.2)]'
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between p-5 text-left"
                aria-expanded={open === i}
              >
                <span className="font-semibold text-navy text-sm">{item.q}</span>
                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  open === i
                    ? 'bg-gradient-pink-blue text-white rotate-45'
                    : 'bg-[rgba(120,160,200,0.1)] text-[rgb(var(--text-tertiary))]'
                }`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
