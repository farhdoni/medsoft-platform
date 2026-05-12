import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LangSetter } from '@/components/LangSetter';

const locales = ['ru', 'uz', 'en'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {/* Sets document.lang dynamically to match current locale (ru/uz/en) */}
      <LangSetter lang={locale} />
      {children}
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
