import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { ThreadClient } from './ThreadClient';

export default async function MessengerThreadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  return (
    <ChatPageShell active="messenger" locale={locale}>
      <ThreadClient locale={locale} conversationId={id} meId={session.userId} />
    </ChatPageShell>
  );
}
