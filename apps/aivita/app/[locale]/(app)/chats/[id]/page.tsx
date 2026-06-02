import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { ChatClient } from './ChatClient';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const isDoctor = session.role === 'doctor';

  return (
    <ChatPageShell active="chats" locale={locale}>
      <ChatClient
        convId={id}
        myUserId={session.userId}
        isDoctor={isDoctor}
      />
    </ChatPageShell>
  );
}
