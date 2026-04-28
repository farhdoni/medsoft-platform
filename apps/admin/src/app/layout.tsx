import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

// All pages require authentication and are user-specific — never statically pre-rendered
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MedSoft Admin',
  description: 'Панель управления MedSoft',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
