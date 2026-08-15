import { AvChatRoomClient } from "@/components/cabinet/chat/AvChatRoomClient";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ locale: string; conversationId: string }>;
}) {
  const { locale, conversationId } = await params;
  return <AvChatRoomClient conversationId={conversationId} locale={locale} />;
}
