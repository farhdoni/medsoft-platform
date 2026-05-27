import { ArchivesClient } from './ArchivesClient';

export default async function ArchivesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ArchivesClient locale={locale} />;
}
