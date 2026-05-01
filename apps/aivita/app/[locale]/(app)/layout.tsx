import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { BottomNav } from '@/components/app/bottom-nav';
import { SidebarNav } from '@/components/app/sidebar-nav';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getSession();

  if (!session) {
    const { locale } = await params;
    redirect(`/${locale}/sign-in`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-base">
      {/* Desktop sidebar */}
      <SidebarNav />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-2xl">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
