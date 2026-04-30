import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function PublicFooter() {
  const t = await getTranslations('footer');

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          {/* Brand column */}
          <div className="lp-footer-brand">
            <a href="/" className="lp-logo">
              aivita<span className="lp-logo-dot" />uz
            </a>
            <p>{t('desc')}</p>

            <div className="lp-footer-stores">
              <Link href="/coming-soon" className="lp-store-btn">
                <span className="lp-store-btn-icon">🍎</span>
                <span className="lp-store-btn-text">
                  <span className="lp-store-btn-small">СКОРО В</span>
                  <span className="lp-store-btn-big">App Store</span>
                </span>
                <span className="lp-store-btn-soon">SOON</span>
              </Link>
              <Link href="/coming-soon" className="lp-store-btn">
                <span className="lp-store-btn-icon">▶</span>
                <span className="lp-store-btn-text">
                  <span className="lp-store-btn-small">СКОРО В</span>
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
            <Link href="/sign-in">{t('openApp')}</Link>
          </div>

          {/* Company */}
          <div className="lp-footer-col">
            <h4>{t('company')}</h4>
            <a href="#">{t('aboutMedsoft')}</a>
            <a href="#">{t('partners')}</a>
            <a href="#">{t('careers')}</a>
            <a href="#">{t('blog')}</a>
          </div>

          {/* Support */}
          <div className="lp-footer-col">
            <h4>{t('support')}</h4>
            <a href="#faq">{t('faq')}</a>
            <a href="https://t.me/aivita_uz" target="_blank" rel="noopener noreferrer">{t('telegram')}</a>
            <a href={`mailto:${t('email')}`}>{t('email')}</a>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div>{t('copyright')}</div>
          <div>
            <Link href="/privacy">{t('privacy')}</Link>
            <Link href="/terms">{t('terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
