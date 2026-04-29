import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/command-palette';

// Server-side auth guard: redirects to /auth/login if no access_token cookie present.
// Runs on every request because root layout uses `dynamic = 'force-dynamic'`.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token');

  if (!token) {
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <CommandPalette />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
