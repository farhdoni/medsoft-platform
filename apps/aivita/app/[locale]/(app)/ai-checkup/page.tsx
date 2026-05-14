import { CheckupClient } from './CheckupClient';

export default async function AiCheckupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CheckupClient locale={locale} />;
}
