import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';
import { I18nProvider } from '@/lib/i18n';

// Server-side auth guard: redirects to /auth/login if no access_token cookie present.
// Runs on every request because root layout uses `dynamic = 'force-dynamic'`.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token');

  if (!token) {
    redirect('/auth/login');
  }

  return (
    <I18nProvider>
      <AdminShell>{children}</AdminShell>
    </I18nProvider>
  );
}
