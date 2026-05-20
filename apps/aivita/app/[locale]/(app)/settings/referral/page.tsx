import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { ReferralClient } from './ReferralClient';

export default function ReferralPage() {
  return (
    <PageShell active="settings">
      <ReferralClient />
    </PageShell>
  );
}
