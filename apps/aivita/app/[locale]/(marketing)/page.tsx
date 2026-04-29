import { getTranslations } from 'next-intl/server';
import { PublicNav } from '@/components/marketing/public-nav';
import { HeroSection } from '@/components/marketing/hero';
import { ProblemSection } from '@/components/marketing/problem';
import { FeaturesSection } from '@/components/marketing/features';
import { HowItWorksSection } from '@/components/marketing/how-it-works';
import { PersonasSection } from '@/components/marketing/personas';
import { StatsSection } from '@/components/marketing/stats';
import { BigCtaSection } from '@/components/marketing/big-cta';
import { FaqSection } from '@/components/marketing/faq';
import { PublicFooter } from '@/components/marketing/public-footer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'aivita — твой Health Score, возраст здоровья и AI-помощник',
    description: 'Превентивная медицинская платформа для Узбекистана. Health Score за 3 минуты, AI-помощник 24/7, цифровой паспорт здоровья. Бесплатно.',
    keywords: 'health, здоровье, узбекистан, приложение, AI, медицинская платформа',
    openGraph: {
      title: 'aivita — твой Health Score',
      description: 'Превентивная медицинская платформа для Узбекистана. Бесплатно.',
      url: 'https://aivita.uz',
      siteName: 'aivita',
      locale: locale === 'ru' ? 'ru_RU' : locale === 'uz' ? 'uz_UZ' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'aivita — твой Health Score',
      description: 'Превентивная медицинская платформа для Узбекистана.',
    },
  };
}

export default async function MarketingPage() {
  const t = await getTranslations();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'aivita',
        url: 'https://aivita.uz',
        logo: 'https://aivita.uz/icons/icon-512.png',
        address: { '@type': 'PostalAddress', addressCountry: 'UZ', addressLocality: 'Tashkent' },
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
      <PublicNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PersonasSection />
        <StatsSection />
        <BigCtaSection />
        <FaqSection />
      </main>
      <PublicFooter />
    </>
  );
}
