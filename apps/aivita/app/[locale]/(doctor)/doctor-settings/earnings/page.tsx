import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { EarningsClient } from './EarningsClient';

export default async function DoctorEarningsPage() {
  return (
    <PageShell active="doctor-settings">
      <EarningsClient />
    </PageShell>
  );
}
