'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function FaqSection() {
  const t = useTranslations('faq');
  const [open, setOpen] = useState<number>(0);

  const items = [1, 2, 3, 4, 5, 6].map((i) => ({
    q: t(`q${i}` as Parameters<typeof t>[0]),
    a: t(`a${i}` as Parameters<typeof t>[0]),
  }));

  return (
    <section className="lp-faq" id="faq">
      <div className="lp-container">
        <div className="lp-eyebrow">{t('eyebrow')}</div>
        <h2 className="lp-section-title">
          {t('title1')} <span className="serif">{t('titleAccent')}</span>
        </h2>
        <p className="lp-section-subtitle">{t('subtitle')}</p>

        <div className="lp-faq-list">
          {items.map((item, i) => (
            <div key={i} className={`lp-faq-item${open === i ? ' open' : ''}`}>
              <button
                className="lp-faq-question"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span className="lp-faq-toggle">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="lp-faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
