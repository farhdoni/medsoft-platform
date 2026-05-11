import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { DoctorBottomNav } from '@/components/doctor/DoctorBottomNav';

export default async function DoctorLayout({
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

  if (session.role !== 'doctor') {
    redirect(`/${locale}/home`);
  }

  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto w-full max-w-[480px]">
        {children}
      </div>
      <DoctorBottomNav locale={locale} />
    </div>
  );
}
