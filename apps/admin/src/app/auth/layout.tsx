import { Unbounded, Manrope } from 'next/font/google';

// Loaded here rather than in the root layout: the display pairing belongs to
// the sign-in screens, and the rest of the panel keeps its system font.
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${unbounded.variable} ${manrope.variable}`} style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
      {children}
    </div>
  );
}
