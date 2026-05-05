import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { VitalsClient } from './VitalsClient';
import type { VitalRow, LatestVitals } from './types';

export default async function VitalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const [latestRes, listRes] = await Promise.allSettled([
    api.vitals.latest(sessionCookie),
    api.vitals.list(sessionCookie),
  ]);

  const latest: LatestVitals =
    latestRes.status === 'fulfilled' && 'data' in latestRes.value
      ? (latestRes.value.data as LatestVitals)
      : {};

  const rows: VitalRow[] =
    listRes.status === 'fulfilled' && 'data' in listRes.value
      ? (listRes.value.data as VitalRow[])
      : [];

  return (
    <PageShell active="vitals" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-6">
        <VitalsClient initialLatest={latest} initialRows={rows} />
      </div>
    </PageShell>
  );
}
