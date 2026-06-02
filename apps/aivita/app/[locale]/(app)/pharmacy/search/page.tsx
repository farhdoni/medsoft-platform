import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { PharmacySearchClient } from './PharmacySearchClient';

export default async function PharmacySearchPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <PageShell active="pharmacy" locale={locale}>
      <PharmacySearchClient />
    </PageShell>
  );
}
