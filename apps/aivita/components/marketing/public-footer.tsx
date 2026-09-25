import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { DoctorCtaBanner } from './doctor-cta-banner';

export async function PublicFooter() {
  const t = await getTranslations('footer');
  // Пути приложения — только с локалью: без неё на aivita.uz ссылка уходит
  // в статический лендинг (nginx пускает в Next лишь /ru/*).
  const locale = await getLocale();

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          {/* Brand column */}
          <div className="lp-footer-brand">
            <Link href="/" className="lp-logo">
              <img src="/icons/logo.png" alt="AIVITA" style={{ height: '28px', display: 'block', width: 'auto', mixBlendMode: 'multiply' }} />
            </Link>
            <p>{t('desc')}</p>

            <div className="lp-footer-stores">
              <Link href={`/${locale}/coming-soon`} className="lp-store-btn">
                <span className="lp-store-btn-icon">🍎</span>
                <span className="lp-store-btn-text">
                  <span className="lp-store-btn-small">{t('storeComingTo')}</span>
                  <span className="lp-store-btn-big">App Store</span>
                </span>
                <span className="lp-store-btn-soon">SOON</span>
              </Link>
              <Link href={`/${locale}/coming-soon`} className="lp-store-btn">
                <span className="lp-store-btn-icon">▶</span>
                <span className="lp-store-btn-text">
                  <span className="lp-store-btn-small">{t('storeComingTo')}</span>
                  <span className="lp-store-btn-big">Google Play</span>
                </span>
                <span className="lp-store-btn-soon">SOON</span>
              </Link>
            </div>
          </div>

          {/* Product */}
          <div className="lp-footer-col">
            <h4>{t('product')}</h4>
            <a href="#features">{t('features')}</a>
            <a href="#how">{t('how')}</a>
            <a href="#personas">{t('forWhom')}</a>
            <Link href={`/${locale}/sign-in`}>{t('openApp')}</Link>
          </div>

          {/* Company */}
          <div className="lp-footer-col">
            <h4>{t('company')}</h4>
            <Link href={`/${locale}/privacy`}>{t('aboutMedsoft')}</Link>
            <span style={{ opacity: 0.4, cursor: 'default' }}>{t('partners')}</span>
            <span style={{ opacity: 0.4, cursor: 'default' }}>{t('careers')}</span>
            <span style={{ opacity: 0.4, cursor: 'default' }}>{t('blog')}</span>
          </div>

          {/* Support */}
          <div className="lp-footer-col">
            <h4>{t('support')}</h4>
            <a href="#faq">{t('faq')}</a>
            <a href="https://t.me/aivita_uz" target="_blank" rel="noopener noreferrer">{t('telegram')}</a>
            <a href={`mailto:${t('email')}`}>{t('email')}</a>
          </div>
        </div>

        {/* Doctor CTA Banner */}
        <DoctorCtaBanner />

        <div className="lp-footer-bottom">
          <div>{t('copyright')}</div>
          <div>
            <Link href={`/${locale}/privacy`}>{t('privacy')}</Link>
            <Link href={`/${locale}/terms`}>{t('terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
