import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { loadReportData } from './data';
import { ReportClient } from './ReportClient';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { latest, reports, cardCode } = await loadReportData();

  return (
    <PageShell active="" locale={locale}>
      <div className="max-w-[480px] mx-auto px-4 pb-24">
        <ReportClient latest={latest} reports={reports} cardCode={cardCode} />
      </div>
    </PageShell>
  );
}
