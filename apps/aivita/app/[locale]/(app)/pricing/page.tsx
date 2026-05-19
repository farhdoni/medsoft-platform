import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { PricingClient } from './PricingClient';

export default async function PricingPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const showSuccess = sp.status === 'success';

  return (
    <PageShell active="pricing">
      <PricingClient showSuccess={showSuccess} />
    </PageShell>
  );
}
