import { getTranslations } from 'next-intl/server';

export async function HowItWorksSection() {
  const t = await getTranslations('how');

  const steps = [
    { num: '1', title: t('step1Title'), text: t('step1Desc'), accent: t('step1Accent') },
    { num: '2', title: t('step2Title'), text: t('step2Desc'), accent: t('step2Accent') },
    { num: '3', title: t('step3Title'), text: t('step3Desc'), accent: t('step3Accent') },
  ];

  return (
    <section className="lp-how" id="how">
      <div className="blur-orb" style={{ width: 500, height: 500, background: 'var(--rose)', top: -150, left: -150, opacity: 0.2 }} />
      <div className="blur-orb" style={{ width: 400, height: 400, background: 'var(--mint)', bottom: -80, right: -80, opacity: 0.15 }} />

      <div className="lp-container">
        <div className="lp-eyebrow">{t('eyebrow')}</div>
        <h2 className="lp-section-title">
          {t('title1')} <span className="serif">{t('titleAccent')}</span>
        </h2>
        <p className="lp-section-subtitle">{t('subtitle')}</p>

        <div className="lp-how-steps">
          {steps.map((s) => (
            <div key={s.num} className="lp-how-step">
              <div className="lp-how-step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>
                {s.text} <span className="serif">{s.accent}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
