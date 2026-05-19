import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { SubscriptionClient } from './SubscriptionClient';

export default async function SubscriptionPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const showSuccess = sp.status === 'success';

  return (
    <PageShell active="settings">
      <SubscriptionClient showSuccess={showSuccess} />
    </PageShell>
  );
}
