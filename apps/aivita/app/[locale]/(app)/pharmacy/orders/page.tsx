import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { PharmacyOrdersClient } from './PharmacyOrdersClient';

export default async function PharmacyOrdersPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <PageShell active="pharmacy" locale={locale}>
      <PharmacyOrdersClient />
    </PageShell>
  );
}
