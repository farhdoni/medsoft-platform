import { getTranslations } from 'next-intl/server';

export async function ProblemSection() {
  const t = await getTranslations('problem');
  return (
    <section className="px-6 md:px-14 py-20">
      <div className="max-w-[1320px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-medical-blue-700 mb-3">{t('eyebrow')}</div>
          <h2 className="text-[clamp(32px,4vw,52px)] font-light tracking-tightest text-navy mb-4">
            {t('title1')}<br />{t('title2')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em>
          </h2>
          <p className="text-[rgb(var(--text-secondary))] max-w-xl mx-auto leading-relaxed">{t('subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: t('card1Title'), text: t('card1Text'), accent: t('card1Accent') },
            { title: t('card2Title'), text: t('card2Text'), accent: t('card2Accent') },
            { title: t('card3Title'), text: t('card3Text'), accent: t('card3Accent') },
          ].map((card) => (
            <div key={card.title} className="bg-white/70 backdrop-blur-xl border border-[rgba(120,160,200,0.2)] rounded-[20px] p-7 hover:-translate-y-1 hover:shadow-medium transition-all">
              <h3 className="text-base font-semibold text-navy mb-3">{card.title}</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                {card.text} <em className="font-serif italic not-italic text-pink-600">{card.accent}</em>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
