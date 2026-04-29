import { getTranslations } from 'next-intl/server';

export async function StatsSection() {
  const t = await getTranslations('stats');
  const stats = [
    { num: t('s1Num'), label: t('s1Label') },
    { num: t('s2Num'), label: t('s2Label') },
    { num: t('s3Num'), label: t('s3Label'), italic: true },
    { num: t('s4Num'), label: t('s4Label') },
  ];
  return (
    <section className="px-6 md:px-14 py-20">
      <div className="max-w-[1320px] mx-auto">
        <div className="rounded-[32px] bg-gradient-air-blue border border-pink-500/20 p-12 text-center">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgb(var(--text-tertiary))] mb-3">{t('eyebrow')}</div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-light tracking-tightest text-navy mb-3">
            {t('title1')}<br />{t('title2')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em>
          </h2>
          <p className="text-[rgb(var(--text-secondary))] max-w-lg mx-auto mb-12">{t('subtitle')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[56px] font-light bg-gradient-pink-blue bg-clip-text text-transparent leading-none mb-2">
                  {s.italic ? <em className="font-serif italic not-italic">{s.num}</em> : s.num}
                </div>
                <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-[rgb(var(--text-tertiary))]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
