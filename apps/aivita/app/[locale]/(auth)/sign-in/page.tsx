'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { loginAction } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный email/никнейм или пароль.',
  account_locked: 'Аккаунт временно заблокирован. Попробуй через 15 минут.',
  network: 'Ошибка сети. Проверь соединение.',
};

export default function SignInPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  const [showPassword, setShowPassword] = useState(false);
  const boundAction = loginAction.bind(null, locale);
  const [state, action, pending] = useActionState(boundAction, { error: null });

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
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            Добро{' '}
            <em className="font-serif italic font-normal text-pink-500">пожаловать</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            Войди в свой аккаунт
          </p>
        </div>

        {/* Form */}
        <form
          action={action}
          className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
        >
          {state.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {ERROR_MESSAGES[state.error] ?? 'Произошла ошибка.'}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="identifier" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              Email или никнейм
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="example@mail.com"
              autoComplete="username"
              required
              className="w-full h-12 px-4 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              Пароль
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full h-12 px-4 pr-11 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-navy transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right">
              <Link href={`/${locale}/forgot-password`} className="text-xs text-pink-500 hover:underline">
                Забыл пароль?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pending ? 'Входим...' : 'Войти'}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-sm text-[rgb(var(--text-secondary))] mb-4">
          Нет аккаунта?{' '}
          <Link href={`/${locale}/sign-up`} className="text-pink-500 font-medium hover:underline">
            Зарегистрироваться
          </Link>
        </p>

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
