import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { AiChatClient } from './AiChatClient';

export default async function AiChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChatPageShell active="ai-chat" locale={locale}>
      <AiChatClient locale={locale} />
    </ChatPageShell>
  );
}
