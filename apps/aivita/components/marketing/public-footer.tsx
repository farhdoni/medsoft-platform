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
                  <span className="lp-store-btn-small">{t('storeComingTo')}</span>
                  <span className="lp-store-btn-big">App Store</span>
                </span>
                <span className="lp-store-btn-soon">SOON</span>
              </Link>
              <Link href="/coming-soon" className="lp-store-btn">
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

        {/* Doctor CTA Banner */}
        <Link
          href="/ru/doctor-login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            background: 'linear-gradient(135deg, #2a2540 0%, #3d3560 60%, #1e3a5f 100%)',
            borderRadius: '20px',
            padding: '20px 28px',
            marginBottom: '32px',
            textDecoration: 'none',
            border: '1px solid rgba(110, 95, 160, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(110, 95, 160, 0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '32px', flexShrink: 0 }}>👨‍⚕️</span>
            <div>
              <div style={{
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '15px',
                marginBottom: '2px',
                lineHeight: 1.3,
              }}>
                Стань врачом в нашей экосистеме!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>
                Подключайтесь к Aivita — консультируйте пациентов онлайн
              </div>
            </div>
          </div>
          <div style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #6e5fa0, #4a7ab5)',
            color: '#fff',
            fontWeight: '600',
            fontSize: '12px',
            padding: '8px 16px',
            borderRadius: '12px',
            whiteSpace: 'nowrap',
          }}>
            Войти →
          </div>
        </Link>

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
