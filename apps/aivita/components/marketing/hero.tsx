import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function HeroSection() {
  const t = await getTranslations('hero');

  return (
    <section className="lp-hero">
      {/* Blur orbs */}
      <div className="blur-orb" style={{ width: 500, height: 500, background: 'var(--pink)', top: -150, right: -200, opacity: 0.5 }} />
      <div className="blur-orb" style={{ width: 400, height: 400, background: 'var(--mint-soft)', bottom: -50, left: -150, opacity: 0.5 }} />

      <div className="lp-container">
        <div className="lp-hero-grid">
          {/* Left: text */}
          <div className="lp-hero-text">
            <div className="lp-hero-badge">{t('badge')}</div>
            <h1>
              {t('title1')} <span className="serif">{t('titleSerif')}</span>
            </h1>
            <p className="lp-hero-subhead">
              <strong>AIVITA</strong> — {t('subhead')}
            </p>
            <p className="lp-hero-tagline">{t('tagline')}</p>

            <div className="lp-cta-group">
              <Link href="/sign-in" className="lp-btn-primary">{t('ctaPrimary')}</Link>
              <a href="#features" className="lp-btn-secondary">{t('ctaSecondary')}</a>
            </div>

            <div className="lp-trust-items">
              <div className="lp-trust-item">{t('trust1')}</div>
              <div className="lp-trust-item">{t('trust2')}</div>
              <div className="lp-trust-item">{t('trust3')}</div>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="lp-phone-stage">
            <div className="lp-floating-card lp-float-1">♥ Heart rate · normal</div>
            <div className="lp-floating-card lp-float-2">🤖 AI рекомендация</div>

            <div className="lp-phone-frame">
              <div className="lp-phone-notch" />
              <div className="lp-phone-screen">
                <div className="lp-phone-content">
                  <div className="lp-phone-greeting">
                    <div>
                      <div className="lp-phone-hi">Доброе утро,</div>
                      <div className="lp-phone-name">Азиз</div>
                    </div>
                    <div className="lp-phone-ai-badge">AI активен</div>
                  </div>

                  <div className="lp-phone-score-card">
                    <div className="lp-phone-score-label">ИНДЕКС ЗДОРОВЬЯ</div>
                    <div className="lp-phone-score-number">
                      <span className="lp-phone-score-big">94</span>
                      <span className="lp-phone-score-max">/ 100</span>
                    </div>
                    <span className="lp-phone-score-trend">↗ +3 за неделю</span>
                  </div>

                  <div className="lp-phone-metrics">
                    {[
                      { icon: '❤️', value: '72bpm', label: 'Пульс' },
                      { icon: '🌙', value: '7.4ч', label: 'Сон' },
                      { icon: '👟', value: '8.2K', label: 'Шаги' },
                    ].map(m => (
                      <div key={m.label} className="lp-phone-metric">
                        <div className="lp-phone-metric-icon">{m.icon}</div>
                        <div className="lp-phone-metric-value">{m.value}</div>
                        <div className="lp-phone-metric-label">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="lp-phone-ai-card">
                    <div className="lp-phone-ai-tag">AI · СЕГОДНЯ</div>
                    <div className="lp-phone-ai-text">
                      Твои показатели в норме. Рекомендую увеличить воду до 2.1 литра.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
