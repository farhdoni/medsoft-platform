import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { ChatSurface } from '@/components/messenger/ChatSurface';
import { MessengerHubClient } from './MessengerHubClient';

export default async function MessengerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChatPageShell active="messenger" locale={locale}>
      <ChatSurface>
        <MessengerHubClient locale={locale} />
      </ChatSurface>
    </ChatPageShell>
  );
}
