import { getTranslations } from 'next-intl/server';

export async function PersonasSection() {
  const t = await getTranslations('personas');

  const personas = [
    {
      emoji: t('p1Emoji'), title: t('p1Title'), role: t('p1Subtitle'),
      quote: t('p1Quote'),
      items: [t('p1u1'), t('p1u2'), t('p1u3')],
    },
    {
      emoji: t('p2Emoji'), title: t('p2Title'), role: t('p2Subtitle'),
      quote: t('p2Quote'),
      items: [t('p2u1'), t('p2u2'), t('p2u3')],
    },
    {
      emoji: t('p3Emoji'), title: t('p3Title'), role: t('p3Subtitle'),
      quote: t('p3Quote'),
      items: [t('p3u1'), t('p3u2'), t('p3u3')],
    },
  ];

  return (
    <section className="lp-personas" id="personas">
      <div className="lp-container">
        <div className="lp-eyebrow">{t('eyebrow')}</div>
        <h2 className="lp-section-title">
          {t('title1')} <span className="serif">{t('titleAccent')}</span>
        </h2>
        <p className="lp-section-subtitle">{t('subtitle')}</p>

        <div className="lp-personas-grid">
          {personas.map((p) => (
            <div key={p.title} className="lp-persona-card">
              <div className="lp-persona-emoji">{p.emoji}</div>
              <div className="lp-persona-tag">ДЛЯ КОГО</div>
              <h3>{p.title}</h3>
              <p className="lp-persona-role">{p.role}</p>
              <div className="lp-persona-quote">«{p.quote}»</div>
              <ul className="lp-persona-features">
                {p.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
