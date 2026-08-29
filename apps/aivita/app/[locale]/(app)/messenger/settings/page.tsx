import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { ChatSurface } from '@/components/messenger/ChatSurface';
import { SettingsClient } from './SettingsClient';

export default async function MessengerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <ChatPageShell active="messenger" locale={locale}>
      <ChatSurface>
        <SettingsClient locale={locale} />
      </ChatSurface>
    </ChatPageShell>
  );
}
