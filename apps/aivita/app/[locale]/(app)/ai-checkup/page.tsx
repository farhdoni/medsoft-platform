import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { CheckupClient } from './CheckupClient';

export default async function AiCheckupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <PageShell active="ai-checkup" locale={locale}>
      <CheckupClient locale={locale} />
    </PageShell>
  );
}
