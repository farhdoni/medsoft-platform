import type { Metadata } from 'next';
import { Manrope, Instrument_Serif } from 'next/font/google';
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
  title: 'aivita — твой Health Score, возраст здоровья и AI-помощник',
  description: 'Превентивная медицинская платформа для Узбекистана. Health Score за 3 минуты, AI-помощник 24/7, цифровой паспорт здоровья. Бесплатно.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
