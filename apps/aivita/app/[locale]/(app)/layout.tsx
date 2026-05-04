import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function CabinetLayout({
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
    <div className="min-h-screen bg-bg-app">
      {children}
    </div>
  );
}
