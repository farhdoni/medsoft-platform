import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { FamilyClient } from './FamilyClient';

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PageShell active="family" locale={locale}>
      <div className="max-w-[480px] mx-auto px-4 pb-24">
        <FamilyClient />
      </div>
    </PageShell>
  );
}
