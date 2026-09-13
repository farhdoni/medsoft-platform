import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { TelegramClient } from './TelegramClient';

export default async function TelegramSettingsPage() {
  return (
    <PageShell active="settings">
      <TelegramClient />
    </PageShell>
  );
}
