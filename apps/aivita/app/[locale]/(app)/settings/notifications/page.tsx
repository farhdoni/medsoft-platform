import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { NotificationsSettingsClient } from './NotificationsSettingsClient';

export default async function NotificationsSettingsPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <PageShell active="settings" locale={locale}>
      <NotificationsSettingsClient />
    </PageShell>
  );
}
