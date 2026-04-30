import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function BigCtaSection() {
  const t = await getTranslations('cta');

  return (
    <section className="lp-cta">
      <div className="lp-cta-content">
        <div className="lp-eyebrow">{t('eyebrow')}</div>
        <h2>
          {t('title1')} <span className="serif">{t('titleAccent')}</span> {t('title2')}
        </h2>
        <p>{t('subtitle')}</p>
        <Link href="/sign-in" className="lp-btn-primary">{t('button')}</Link>
        <div>
          <div className="lp-cta-pwa-tip">{t('pwaTip')}</div>
        </div>
      </div>
    </section>
  );
}
