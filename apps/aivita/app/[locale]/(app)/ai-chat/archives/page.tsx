import { ChatPageShell } from '@/components/cabinet/dashboard/ChatPageShell';
import { ArchivesClient } from './ArchivesClient';

export default async function ArchivesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChatPageShell active="ai-chat" locale={locale}>
      <ArchivesClient locale={locale} />
    </ChatPageShell>
  );
}
