import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { GadgetsClient } from './GadgetsClient';

export default async function GadgetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const [catalogRes, connectedRes] = await Promise.allSettled([
    api.devices.catalog(sessionCookie),
    api.devices.list(sessionCookie),
  ]);

  const catalog =
    catalogRes.status === 'fulfilled' && 'data' in catalogRes.value
      ? (catalogRes.value.data as never[])
      : [];

  const connected =
    connectedRes.status === 'fulfilled' && 'data' in connectedRes.value
      ? (connectedRes.value.data as never[])
      : [];

  return (
    <PageShell active="home" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-6">
        <GadgetsClient catalog={catalog} connected={connected} />
      </div>
    </PageShell>
  );
}
