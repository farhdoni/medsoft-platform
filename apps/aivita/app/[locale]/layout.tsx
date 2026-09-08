import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LangSetter } from '@/components/LangSetter';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { AivitaMetrika } from '@/components/analytics/AivitaMetrika';

const locales = ['ru', 'uz', 'en'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

/**
 * Same public, Redis-cached endpoint the aivita.uz landing itself reads
 * (apps/api/src/routes/landing-api.ts) — one counter id, one place it's
 * configured, not duplicated into this app's own env vars.
 */
async function getMetrikaCounterId(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/api/landing-config`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const config = (await res.json()) as { yandex_metrika_id?: string };
    const id = Number(config.yandex_metrika_id);
    return config.yandex_metrika_id && Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const [messages, metrikaCounterId] = await Promise.all([
    getMessages(),
    getMetrikaCounterId(),
  ]);
  return (
    <NextIntlClientProvider messages={messages}>
      <LangSetter lang={locale} />
      {children}
      <InstallPrompt />
      <AivitaMetrika counterId={metrikaCounterId} />
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
