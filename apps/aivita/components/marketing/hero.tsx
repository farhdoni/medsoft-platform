import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function HeroSection() {
  const t = await getTranslations('hero');

  return (
    <section className="relative px-6 md:px-14 pt-16 pb-24 overflow-hidden">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid md:grid-cols-[1.05fr_1fr] gap-16 md:gap-20 items-center">
          {/* Left column */}
          <div className="space-y-8">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-pink-100 text-pink-700 text-xs font-bold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse-dot" />
                {t('badge1')}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 text-[rgb(var(--text-secondary))] text-xs font-bold rounded-full border border-[rgba(120,160,200,0.2)]">
                {t('badge2')}
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-[clamp(44px,6vw,84px)] font-light leading-none tracking-tightest text-navy">
              {t('title1')}
              <br />
              <em className="font-serif italic font-normal bg-gradient-pink-blue bg-clip-text text-transparent not-italic">
                {t('title2')}
              </em>
              <br />
              {t('title3')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-[rgb(var(--text-secondary))] leading-relaxed max-w-lg">
              {t('subtitle')}
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href="/sign-in"
                className="px-8 py-4 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-base"
              >
                {t('ctaPrimary')}
              </Link>
              <button className="px-6 py-4 text-base font-semibold text-[rgb(var(--text-secondary))] border border-[rgba(120,160,200,0.25)] rounded-2xl hover:bg-white/60 hover:text-navy transition-all">
                {t('ctaSecondary')}
              </button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[rgb(var(--text-muted))]">
              <span className="font-bold uppercase tracking-wider">{t('builtWith')}</span>
              {(['trust1', 'trust2', 'trust3'] as const).map((key) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="text-mint-500">✓</span>
                  {t(key)}
                </span>
              ))}
            </div>
          </div>

          {/* Right column — Phone mockup */}
          <div className="relative flex justify-center md:justify-end">
            <div
              className="relative w-full max-w-[340px] rounded-[32px] bg-white/85 backdrop-blur-[40px] p-5 overflow-hidden"
              style={{
                boxShadow: '0 30px 80px rgb(44 95 124 / 0.18), 0 8px 20px rgb(212 132 154 / 0.15)',
                aspectRatio: '4/5',
              }}
            >
              {/* Phone content */}
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-pink-blue-mint" />
                  <div>
                    <div className="text-xs font-semibold text-navy">{t('mockupGreeting')}</div>
                    <div className="flex items-center gap-1 text-[10px] text-[rgb(var(--text-tertiary))]">
                      <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
                      {t('mockupAI')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Score Card */}
              <div className="rounded-2xl p-4 mb-3 bg-gradient-air-blue border border-pink-500/20">
                <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgb(var(--text-tertiary))] mb-2">
                  {t('mockupHealthScore')}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-5xl font-light tracking-tightest text-navy leading-none">94</div>
                    <div className="text-xs text-[rgb(var(--text-secondary))] mt-1">/ 100</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-mint-700">{t('mockupDelta')}</div>
                    {/* Mini ECG line */}
                    <svg viewBox="0 0 80 24" className="w-20 h-6 mt-1" fill="none">
                      <path d="M0 12 L15 12 L20 4 L25 20 L30 8 L35 16 L40 12 L80 12" stroke="url(#ecgGrad)" strokeWidth="1.5" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="ecgGrad" x1="0" y1="0" x2="80" y2="0">
                          <stop stopColor="#d4849a" />
                          <stop offset="1" stopColor="#2dba9a" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: t('mockupPulse'), value: '72', unit: 'bpm', emoji: '❤️' },
                  { label: t('mockupSleep'), value: '7.4', unit: 'ч', emoji: '🌙' },
                  { label: t('mockupSteps'), value: '8.2K', unit: '', emoji: '👟' },
                ].map((m) => (
                  <div key={m.label} className="bg-white/70 rounded-xl p-2.5 text-center">
                    <div className="text-base mb-0.5">{m.emoji}</div>
                    <div className="text-sm font-bold text-navy">{m.value}<span className="text-[10px] text-[rgb(var(--text-muted))]">{m.unit}</span></div>
                    <div className="text-[9px] text-[rgb(var(--text-muted))] uppercase tracking-wider">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* AI insight card */}
              <div className="bg-gradient-air-pink rounded-xl p-3 border border-pink-500/20">
                <div className="text-[9px] uppercase tracking-[0.15em] font-bold text-pink-600 mb-1">{t('mockupAICard')}</div>
                <div className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">{t('mockupAIText')}</div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-4 top-[20%] bg-white/90 backdrop-blur-xl rounded-xl px-3 py-2 shadow-medium border border-[rgba(120,160,200,0.15)] text-xs font-semibold text-navy hidden md:block animate-drift-1">
              <span className="text-mint-500 mr-1">♥</span> {t('badge3')}
            </div>
            <div className="absolute -right-4 bottom-[20%] bg-pink-100/90 backdrop-blur-xl rounded-xl px-3 py-2 shadow-pink border border-pink-500/15 text-xs font-semibold text-pink-700 hidden md:block animate-drift-2">
              👨‍👩‍👧‍👦 {t('badge4')}
            </div>
            <div className="absolute -right-2 top-[40%] bg-gradient-pink-blue-mint rounded-xl px-3 py-2 shadow-pink text-xs font-semibold text-white hidden md:block animate-drift-3">
              🤖 {t('badge5')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
