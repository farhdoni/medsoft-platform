import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { InstallClient } from './InstallClient';

export default async function InstallPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <PageShell active="" locale={locale}>
      <InstallClient />
    </PageShell>
  );
}
