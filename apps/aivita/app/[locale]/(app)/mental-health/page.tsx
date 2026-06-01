import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { MentalHealthClient } from './MentalHealthClient';

export default async function MentalHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PageShell active="mental-health" locale={locale}>
      <MentalHealthClient />
    </PageShell>
  );
}
