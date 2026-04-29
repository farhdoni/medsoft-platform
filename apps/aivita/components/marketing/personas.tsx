import { getTranslations } from 'next-intl/server';

export async function PersonasSection() {
  const t = await getTranslations('personas');
  const personas = [
    {
      emoji: t('p1Emoji'), title: t('p1Title'), sub: t('p1Subtitle'), quote: t('p1Quote'),
      uses: [t('p1u1'), t('p1u2'), t('p1u3')], orb: 'bg-radial-pink',
    },
    {
      emoji: t('p2Emoji'), title: t('p2Title'), sub: t('p2Subtitle'), quote: t('p2Quote'),
      uses: [t('p2u1'), t('p2u2'), t('p2u3')], orb: 'bg-radial-blue',
    },
    {
      emoji: t('p3Emoji'), title: t('p3Title'), sub: t('p3Subtitle'), quote: t('p3Quote'),
      uses: [t('p3u1'), t('p3u2'), t('p3u3')], orb: 'bg-radial-mint',
    },
  ];
  return (
    <section id="personas" className="px-6 md:px-14 py-20">
      <div className="max-w-[1320px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-pink-500 mb-3">{t('eyebrow')}</div>
          <h2 className="text-[clamp(32px,4vw,52px)] font-light tracking-tightest text-navy mb-4">
            {t('title1')}<br />{t('title2')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em>
          </h2>
          <p className="text-[rgb(var(--text-secondary))] max-w-xl mx-auto">{t('subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {personas.map((p) => (
            <div key={p.title} className="relative overflow-hidden bg-white/75 backdrop-blur-xl border border-[rgba(120,160,200,0.15)] rounded-3xl p-8 hover:-translate-y-1 hover:shadow-medium transition-all">
              <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full ${p.orb} blur-2xl opacity-60`} />
              <div className="text-4xl mb-3">{p.emoji}</div>
              <div className="text-[9px] uppercase tracking-[0.15em] font-bold text-pink-500 mb-1">ДЛЯ КОГО</div>
              <h3 className="text-xl font-bold text-navy mb-1">{p.title}</h3>
              <div className="text-sm text-[rgb(var(--text-secondary))] mb-4">{p.sub}</div>
              <blockquote className="border-l-2 border-pink-400 pl-4 italic text-sm text-[rgb(var(--text-secondary))] mb-6">
                {p.quote}
              </blockquote>
              <ul className="space-y-2">
                {p.uses.map((u) => (
                  <li key={u} className="flex items-center gap-2 text-sm text-navy">
                    <span className="text-mint-500 font-bold">✓</span> {u}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
