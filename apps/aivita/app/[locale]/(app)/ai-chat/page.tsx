import { AiChatClient } from './AiChatClient';

export default async function AiChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AiChatClient locale={locale} />;
}
