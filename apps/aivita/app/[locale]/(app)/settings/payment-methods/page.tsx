import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { PaymentMethodsClient } from './PaymentMethodsClient';

export default async function PaymentMethodsPage() {
  return (
    <PageShell active="settings">
      <PaymentMethodsClient />
    </PageShell>
  );
}
