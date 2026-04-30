import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PublicNav } from '@/components/marketing/public-nav';
import { PublicFooter } from '@/components/marketing/public-footer';

export const metadata: Metadata = {
  title: 'Coming soon — aivita',
  description: 'iOS and Android apps coming soon to App Store and Google Play.',
};

export default async function ComingSoonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('comingSoon');

  return (
    <>
      <PublicNav />
      <main
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {/* Store icons */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginBottom: '2.5rem',
            }}
          >
            {(['🍎', '▶'].map((icon, i) => (
              <div
                key={i}
                className="lp-glass-card"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}
              >
                {icon}
              </div>
            )))}
          </div>

          {/* Badge */}
          <div className="lp-badge" style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>
            🚀 {t('title')}
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: 'var(--font-sans, sans-serif)',
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--navy)',
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}
          >
            {t('title')}
          </h1>

          <p
            style={{
              color: 'rgba(15,26,48,0.6)',
              fontSize: '1.0625rem',
              lineHeight: 1.65,
              marginBottom: '2.5rem',
            }}
          >
            {t('desc')}
          </p>

          {/* Web CTA */}
          <div
            className="lp-glass-card"
            style={{
              padding: '1.5rem',
              borderRadius: '1.25rem',
              marginBottom: '2.5rem',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(15,26,48,0.55)',
                marginBottom: '0.875rem',
              }}
            >
              {t('webCta')}
            </p>
            <Link
              href={`/${locale}/sign-in`}
              className="lp-btn-primary"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              {t('webLink')}
            </Link>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.8125rem',
                color: 'rgba(15,26,48,0.4)',
              }}
            >
              📱 {t('pwaHint')}
            </p>
          </div>

          {/* Back link */}
          <Link
            href={`/${locale}`}
            style={{
              fontSize: '0.875rem',
              color: 'rgba(15,26,48,0.45)',
              textDecoration: 'none',
            }}
          >
            ← На главную
          </Link>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
