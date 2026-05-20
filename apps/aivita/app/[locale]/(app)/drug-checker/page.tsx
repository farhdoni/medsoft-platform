import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { DrugCheckerClient } from './DrugCheckerClient';

export default async function DrugCheckerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ drugs?: string }>;
}) {
  const { locale } = await params;
  const sp = await (searchParams ?? Promise.resolve({}));
  const prefilledDrugs = sp.drugs
    ? sp.drugs.split(',').map((d) => d.trim()).filter(Boolean)
    : [];

  return (
    <PageShell active="medications" locale={locale}>
      <div className="max-w-[480px] mx-auto pb-6">
        <DrugCheckerClient prefilledDrugs={prefilledDrugs} />
      </div>
    </PageShell>
  );
}
