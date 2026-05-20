import { PricingClient } from '../../(app)/pricing/PricingClient';

export default async function PricingPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const showSuccess = sp.status === 'success';

  return (
    <div className="min-h-screen bg-app-bg py-8">
      <div className="max-w-[480px] mx-auto w-full">
        <PricingClient showSuccess={showSuccess} />
      </div>
    </div>
  );
}
