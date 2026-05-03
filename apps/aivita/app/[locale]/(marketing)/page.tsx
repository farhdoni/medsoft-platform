import type { Metadata } from 'next';
import { PublicNav } from '@/components/marketing/public-nav';
import { HeroSection } from '@/components/marketing/hero';
import { ProblemSection } from '@/components/marketing/problem';
import { FeaturesSection } from '@/components/marketing/features';
import { HowItWorksSection } from '@/components/marketing/how-it-works';
import { PersonasSection } from '@/components/marketing/personas';
import { BigCtaSection } from '@/components/marketing/big-cta';
import { FaqSection } from '@/components/marketing/faq';
import { PublicFooter } from '@/components/marketing/public-footer';
import { getSession } from '@/lib/auth/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'aivita — Ваш пожизненный куратор здоровья',
    description:
      'AIVITA — AI-ассистент на страже здоровья вашей семьи. Health Score, цифровой паспорт здоровья, AI-помощник, сканер документов. Бесплатно.',
    keywords:
      'aivita, здоровье, AI помощник, Health Score, паспорт здоровья, Узбекистан, Ташкент, медицина',
    openGraph: {
      title: 'aivita — Ваш пожизненный куратор здоровья',
      description: 'AI-ассистент на страже здоровья вашей семьи',
      url: 'https://aivita.uz',
      siteName: 'aivita.uz',
      images: ['/og-image.png'],
      locale: locale === 'ru' ? 'ru_RU' : locale === 'uz' ? 'uz_UZ' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'aivita',
      description: 'Ваш пожизненный куратор здоровья',
      images: ['/og-image.png'],
    },
  };
}

export default async function MarketingPage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'aivita',
        url: 'https://aivita.uz',
        logo: 'https://aivita.uz/icons/icon-512.png',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'UZ',
          addressLocality: 'Tashkent',
        },
      },
      {
        '@type': 'WebApplication',
        name: 'aivita',
        url: 'https://aivita.uz',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'UZS' },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection isAuthenticated={isAuthenticated} />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PersonasSection />
        <BigCtaSection isAuthenticated={isAuthenticated} />
        <FaqSection />
      </main>
      <PublicFooter />
    </>
  );
}
