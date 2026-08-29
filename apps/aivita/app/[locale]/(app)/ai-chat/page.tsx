import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { AiChatClient } from './AiChatClient';

export default async function AiChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    // hideNav: the composer owns the bottom edge here exactly as it does inside
    // a messenger thread — a floating nav on top of it covers the conversation.
    <ChatPageShell active="ai-chat" locale={locale} hideNav>
      <AiChatClient locale={locale} />
    </ChatPageShell>
  );
}
