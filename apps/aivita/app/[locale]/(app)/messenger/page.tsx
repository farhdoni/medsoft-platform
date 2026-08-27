import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { MessengerHubClient } from './MessengerHubClient';

export default async function MessengerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChatPageShell active="messenger" locale={locale}>
      <MessengerHubClient locale={locale} />
    </ChatPageShell>
  );
}
