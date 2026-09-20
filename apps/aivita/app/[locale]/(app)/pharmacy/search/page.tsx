import { notFound } from 'next/navigation';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { PharmacySearchClient } from './PharmacySearchClient';

// DISABLED 2026-09-20 — see docs/pharmacy-disabled.md. Backend routes are
// unmounted (apps/api/src/index.ts), so this page had nothing to call.
// Remove this notFound() call to re-enable once the backend is back.
export default async function PharmacySearchPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  notFound();
  const { locale } = await params;
  return (
    <PageShell active="pharmacy" locale={locale}>
      <PharmacySearchClient />
    </PageShell>
  );
}
