import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function BigCtaSection() {
  const t = await getTranslations('cta');
  return (
    <section className="px-6 md:px-14 py-20">
      <div className="max-w-[1320px] mx-auto">
        <div className="relative overflow-hidden rounded-[40px] text-center py-20 px-8"
          style={{ background: 'linear-gradient(135deg, rgba(255,232,240,0.7), rgba(220,225,245,0.6), rgba(200,235,225,0.5))' }}>
          {/* Decorative orbs */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-radial-pink blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-radial-blue blur-3xl" />
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-pink-500 mb-4">{t('eyebrow')}</div>
            <h2 className="text-[clamp(36px,5vw,64px)] font-light tracking-tightest text-navy mb-6">
              {t('title1')} <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">{t('titleAccent')}</em><br />{t('title2')}
            </h2>
            <p className="text-[rgb(var(--text-secondary))] max-w-md mx-auto mb-8 text-lg">{t('subtitle')}</p>
            <Link
              href="/sign-in"
              className="inline-block px-8 py-[18px] bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink-strong hover:shadow-pink hover:-translate-y-0.5 transition-all text-base"
            >
              {t('button')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
