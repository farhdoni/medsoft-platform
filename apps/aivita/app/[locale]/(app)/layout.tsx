import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import PushManager from '@/components/push/PushManager';

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
    <div className="min-h-screen bg-app-bg">
      <PushManager />
      <div className="mx-auto w-full max-w-[480px]">
        {children}
      </div>
    </div>
  );
}
