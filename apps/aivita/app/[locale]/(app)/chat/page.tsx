import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import ChatClient from './ChatClient';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChatPageShell active="chat" locale={locale}>
      <ChatClient />
    </ChatPageShell>
  );
}
