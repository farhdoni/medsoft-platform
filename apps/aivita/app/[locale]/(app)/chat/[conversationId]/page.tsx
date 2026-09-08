import { redirect } from "next/navigation";

/**
 * Legacy deep-link target: apps/api/src/routes/aivita/messaging.ts still puts
 * `url: '/chat/' + convId` into every new-message push notification payload
 * (real, live — grep before touching this).
 *
 * This route used to render AvChatRoomClient, a fully static prototype with a
 * hardcoded "Д-р Анвар Шарипов" thread and zero network calls — so tapping a
 * real push notification landed a real patient on a fake conversation. The
 * real, wired thread view lives at /messenger/[id] (ThreadClient.tsx, same
 * conversationId shape). Redirect there instead of maintaining a second,
 * parallel implementation of the same screen.
 */
export default async function ChatRoomRedirect({
  params,
}: {
  params: Promise<{ locale: string; conversationId: string }>;
}) {
  const { locale, conversationId } = await params;
  redirect(`/${locale}/messenger/${conversationId}`);
}
