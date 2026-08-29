import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { ChatSurface } from '@/components/messenger/ChatSurface';
import { ThreadClient } from './ThreadClient';

export default async function MessengerThreadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  // hideNav: inside a thread the composer owns the bottom edge. The floating
  // nav is still there on /messenger and the conversation list.
  return (
    <ChatPageShell active="messenger" locale={locale} hideNav>
      <ChatSurface paint>
        <ThreadClient locale={locale} conversationId={id} meId={session.userId} />
      </ChatSurface>
    </ChatPageShell>
  );
}
