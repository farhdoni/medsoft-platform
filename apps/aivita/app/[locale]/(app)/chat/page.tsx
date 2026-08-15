import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { AvChatHubClient } from '@/components/cabinet/chat/AvChatHubClient';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChatPageShell active="chat" locale={locale}>
      <AvChatHubClient locale={locale} />
    </ChatPageShell>
  );
}
