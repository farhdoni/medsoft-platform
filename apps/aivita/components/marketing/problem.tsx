import { getTranslations } from 'next-intl/server';

export async function ProblemSection() {
  const t = await getTranslations('problem');

  const cards = [
    { icon: '📋', title: t('card1Title'), text: t('card1Text'), accent: t('card1Accent') },
    { icon: '⏰', title: t('card2Title'), text: t('card2Text'), accent: t('card2Accent') },
    { icon: '🤷', title: t('card3Title'), text: t('card3Text'), accent: t('card3Accent') },
  ];

  return (
    <section className="lp-problem">
      <div className="lp-container">
        <div className="lp-eyebrow">{t('eyebrow')}</div>
        <h2 className="lp-section-title">
          {t('title1')} {t('title2')} <span className="serif">{t('titleAccent')}</span>
        </h2>
        <p className="lp-section-subtitle">{t('subtitle')}</p>

        <div className="lp-problem-grid">
          {cards.map((c) => (
            <div key={c.title} className="lp-problem-card">
              <div className="lp-problem-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>
                {c.text} <span className="serif">{c.accent}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
