'use client';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { mockSignIn } from './actions';
import { useParams } from 'next/navigation';

export default function SignInPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            Создай{' '}
            <em className="font-serif italic font-normal text-pink-500">аккаунт</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            Войди через привычный сервис — без паролей
          </p>
        </div>

        {/* Auth buttons */}
        <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-3 mb-4">
          {/* Main entry */}
          <form action={mockSignIn.bind(null, locale)}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
            >
              ✨ Начать бесплатно
            </button>
          </form>

          {/* Coming soon options */}
          <button
            disabled
            className="w-full flex items-center gap-3 px-5 h-12 rounded-2xl border border-[rgba(120,160,200,0.1)] text-[rgb(var(--text-muted))] font-semibold text-sm cursor-not-allowed"
          >
            <span className="text-xl">🔵</span>
            <span>Войти через Google</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider">скоро</span>
          </button>

          <button
            disabled
            className="w-full flex items-center gap-3 px-5 h-12 rounded-2xl border border-[rgba(120,160,200,0.1)] text-[rgb(var(--text-muted))] font-semibold text-sm cursor-not-allowed"
          >
            <span className="text-xl">✈️</span>
            <span>Войти через Telegram</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider">скоро</span>
          </button>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-[rgb(var(--text-muted))]">
          Входя, вы соглашаетесь с{' '}
          <Link href={`/${locale}/terms`} className="text-pink-500 hover:underline">
            условиями
          </Link>{' '}
          и{' '}
          <Link href={`/${locale}/privacy`} className="text-pink-500 hover:underline">
            политикой конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  );
}
