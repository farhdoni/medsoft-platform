import type { Metadata, Viewport } from 'next';
import { Manrope, Instrument_Serif } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AIVITA — AI Health Assistant',
  description: 'Превентивная медицинская платформа для Узбекистана. Health Score за 3 минуты, AI-помощник 24/7, цифровой паспорт здоровья. Бесплатно.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AIVITA',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#9c5e6c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // user-scalable=no eliminates the 300ms tap delay in WebView (no double-tap zoom check)
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${manrope.variable} ${instrumentSerif.variable}`}>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
