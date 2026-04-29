import { getTranslations } from 'next-intl/server';

export async function FeaturesSection() {
  const t = await getTranslations('features');
  const features = [
    { num: '01', title: t('f1Title'), desc: t('f1Desc'), tag: t('tag1'), tagColor: 'pink', hero: true },
    { num: '02', title: t('f2Title'), desc: t('f2Desc'), tag: t('tag2'), tagColor: 'pink' },
    { num: '03', title: t('f3Title'), desc: t('f3Desc'), tag: t('tag3'), tagColor: 'mint' },
    { num: '04', title: t('f4Title'), desc: t('f4Desc'), tag: t('tag4'), tagColor: 'pink' },
    { num: '05', title: t('f5Title'), desc: t('f5Desc'), tag: t('tag5'), tagColor: 'mint' },
    { num: '06', title: t('f6Title'), desc: t('f6Desc'), tag: t('tag6'), tagColor: 'pink' },
    { num: '07', title: t('f7Title'), desc: t('f7Desc'), tag: t('tag7'), tagColor: 'mint' },
  ];

  return (
    <section id="features" className="px-6 md:px-14 py-20">
      <div className="max-w-[1320px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-pink-500 mb-3">{t('eyebrow')}</div>
          <h2 className="text-[clamp(32px,4vw,52px)] font-light tracking-tightest text-navy mb-4">
            {t('title1')}<br />{t('title2')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em>
          </h2>
          <p className="text-[rgb(var(--text-secondary))] max-w-xl mx-auto">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hero feature card — spans 2 cols and 2 rows */}
          <div className="md:col-span-2 md:row-span-2 bg-gradient-air-blue border border-pink-500/20 rounded-3xl p-8 relative overflow-hidden">
            <div className="text-[80px] font-serif italic leading-none bg-gradient-pink-blue bg-clip-text text-transparent mb-4">01</div>
            <h3 className="text-2xl font-bold text-navy mb-2">Health Score <em className="font-serif italic font-normal text-pink-500 not-italic">0–100</em></h3>
            <p className="text-[rgb(var(--text-secondary))] text-sm leading-relaxed mb-6 max-w-md">{features[0].desc}</p>
            <span className="inline-block bg-pink-100 text-pink-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">{t('tag1')}</span>
            {/* Mini health score preview */}
            <div className="absolute right-8 bottom-8 opacity-80">
              <div className="relative w-24 h-24">
                <svg width="96" height="96" className="-rotate-90">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(120,160,200,0.12)" strokeWidth="9" />
                  <circle cx="48" cy="48" r="38" fill="none" stroke="url(#featGrad)" strokeWidth="9"
                    strokeLinecap="round" strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - 0.87)} />
                  <defs>
                    <linearGradient id="featGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop stopColor="#d4849a" />
                      <stop offset="0.5" stopColor="#2c5f7c" />
                      <stop offset="1" stopColor="#2dba9a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-light text-navy leading-none">87</span>
                  <span className="text-[8px] text-[rgb(var(--text-tertiary))] uppercase tracking-widest">из 100</span>
                </div>
              </div>
            </div>
          </div>
          {/* Small feature cards */}
          {features.slice(1).map((f) => (
            <div key={f.num} className="bg-white/75 backdrop-blur-xl border border-[rgba(120,160,200,0.15)] rounded-2xl p-6 hover:-translate-y-1 hover:shadow-medium transition-all">
              <div className="text-4xl font-serif italic text-[rgba(120,160,200,0.3)] mb-3">{f.num}</div>
              <h3 className="text-lg font-bold text-navy mb-1.5">{f.title}</h3>
              <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed mb-4">{f.desc}</p>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                f.tagColor === 'mint' ? 'bg-mint-100 text-mint-700' : 'bg-pink-100 text-pink-700'
              }`}>{f.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
