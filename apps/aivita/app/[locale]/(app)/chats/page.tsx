import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { ChatsListClient } from './ChatsListClient';

export default async function ChatsPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <PageShell active="chats" locale={locale}>
      <ChatsListClient />
    </PageShell>
  );
}
