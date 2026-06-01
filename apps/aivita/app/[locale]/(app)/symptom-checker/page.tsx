import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { SymptomCheckerClient } from './SymptomCheckerClient';

export default async function SymptomCheckerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PageShell active="symptom-checker" locale={locale}>
      <SymptomCheckerClient />
    </PageShell>
  );
}
