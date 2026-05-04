import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { TopHeader } from '@/components/cabinet/TopHeader';
import { BottomNav } from '@/components/app/bottom-nav';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/sign-in`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f4f3ef' }}>
      <TopHeader session={session} locale={locale} />

      <main className="flex-1" style={{ paddingBottom: '96px' }}>
        {children}
      </main>

      <BottomNav locale={locale} />
    </div>
  );
}
