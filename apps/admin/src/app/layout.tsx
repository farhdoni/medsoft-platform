import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

// All pages require authentication and are user-specific — never statically pre-rendered
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AIVITA Admin',
  description: 'Панель управления AIVITA',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
