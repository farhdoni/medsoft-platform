import { getTranslations } from 'next-intl/server';

export async function HowItWorksSection() {
  const t = await getTranslations('how');
  const steps = [
    { n: '1', title: t('step1Title'), text: t('step1Desc'), accent: t('step1Accent') },
    { n: '2', title: t('step2Title'), text: t('step2Desc'), accent: t('step2Accent') },
    { n: '3', title: t('step3Title'), text: t('step3Desc'), accent: t('step3Accent') },
  ];
  return (
    <section id="how" className="px-6 md:px-14 py-20">
      <div className="max-w-[1320px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-mint-700 mb-3">{t('eyebrow')}</div>
          <h2 className="text-[clamp(32px,4vw,52px)] font-light tracking-tightest text-navy mb-4">
            {t('title1')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em>
          </h2>
          <p className="text-[rgb(var(--text-secondary))] max-w-xl mx-auto">{t('subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-[rgba(120,160,200,0.3)] to-transparent" />
          {steps.map((s) => (
            <div key={s.n} className="text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-air-pink border-2 border-dashed border-pink-500/40 mb-6">
                <span className="text-3xl font-serif italic text-pink-600">{s.n}</span>
              </div>
              <h3 className="text-xl font-semibold text-navy mb-3">{s.title}</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] max-w-[280px] mx-auto leading-relaxed">
                {s.text} <em className="font-serif italic not-italic text-pink-500">{s.accent}</em>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
