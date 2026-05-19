import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { PayoutClient } from './PayoutClient';

export default async function DoctorPayoutPage() {
  return (
    <PageShell active="doctor-settings">
      <PayoutClient />
    </PageShell>
  );
}
