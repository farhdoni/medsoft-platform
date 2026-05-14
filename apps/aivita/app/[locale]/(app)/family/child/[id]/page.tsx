import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { ChildCardClient } from './ChildCardClient';

export default async function ChildCardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  return (
    <PageShell active="family" locale={locale}>
      <div className="max-w-[480px] mx-auto px-4 pb-24">
        <ChildCardClient memberId={id} locale={locale} />
      </div>
    </PageShell>
  );
}
