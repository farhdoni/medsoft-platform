'use client';
// build: 2026-05-03
import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { loginAction } from './actions';

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  ru: {
    heading: 'Добро',
    headingEm: 'пожаловать',
    subtitle: 'Войди в свой аккаунт',
    labelIdentifier: 'Email или никнейм',
    labelPassword: 'Пароль',
    forgotPassword: 'Забыл пароль?',
    submit: 'Войти',
    submitting: 'Входим...',
    noAccount: 'Нет аккаунта?',
    register: 'Зарегистрироваться',
    isDoctor: 'Вы врач?',
    doctorRegister: 'Регистрация для врачей →',
    termsPrefix: 'Входя, вы соглашаетесь с ',
    termsLink: 'условиями',
    termsAnd: ' и ',
    privacyLink: 'политикой конфиденциальности',
    invalid_credentials: 'Неверный email/никнейм или пароль.',
    account_locked: 'Аккаунт временно заблокирован. Попробуй через 15 минут.',
    network: 'Ошибка сети. Проверь соединение.',
    unknown: 'Произошла ошибка.',
  },
  uz: {
    heading: 'Xush',
    headingEm: 'kelibsiz',
    subtitle: 'Hisobingizga kiring',
    labelIdentifier: 'Email yoki taxallus',
    labelPassword: 'Parol',
    forgotPassword: 'Parolni unutdingizmi?',
    submit: 'Kirish',
    submitting: 'Kirilmoqda...',
    noAccount: 'Hisob yoʻqmi?',
    register: "Ro'yxatdan o'tish",
    isDoctor: 'Siz shifokor misiz?',
    doctorRegister: "Shifokorlar uchun ro'yxatdan o'tish →",
    termsPrefix: 'Kirish orqali siz ',
    termsLink: 'shartlarga',
    termsAnd: ' va ',
    privacyLink: 'maxfiylik siyosatiga',
    invalid_credentials: "Noto'g'ri email/taxallus yoki parol.",
    account_locked: "Hisob vaqtincha bloklangan. 15 daqiqadan keyin urinib ko'ring.",
    network: "Tarmoq xatosi. Ulanishni tekshiring.",
    unknown: 'Xato yuz berdi.',
  },
  en: {
    heading: 'Welcome',
    headingEm: 'back',
    subtitle: 'Sign in to your account',
    labelIdentifier: 'Email or nickname',
    labelPassword: 'Password',
    forgotPassword: 'Forgot password?',
    submit: 'Sign in',
    submitting: 'Signing in...',
    noAccount: 'No account?',
    register: 'Create one',
    isDoctor: 'Are you a doctor?',
    doctorRegister: 'Doctor registration →',
    termsPrefix: 'By signing in you agree to our ',
    termsLink: 'terms',
    termsAnd: ' and ',
    privacyLink: 'privacy policy',
    invalid_credentials: 'Invalid email/nickname or password.',
    account_locked: 'Account temporarily locked. Try again in 15 minutes.',
    network: 'Network error. Check your connection.',
    unknown: 'An error occurred.',
  },
} as const;

type TLocale = keyof typeof T;

// ─── Compact language switcher ────────────────────────────────────────────────

const LOCALE_META = [
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'uz', flag: '🇺🇿', label: 'UZ' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
] as const;

function LangSwitcher({ current }: { current: string }) {
  const router = useRouter();
  function switchTo(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.push(`/${code}/sign-in`);
  }
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {LOCALE_META.map(l => (
        <button
          key={l.code}
          onClick={() => switchTo(l.code)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
          style={
            l.code === current
              ? { background: 'linear-gradient(135deg,#fce4ea,#dde8fc)', color: '#9c5e6c', border: '1.5px solid #e4a8b4' }
              : { background: 'white', color: '#9a96a8', border: '1.5px solid #e8e4dc' }
          }
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';
  const t = T[(locale as TLocale) in T ? (locale as TLocale) : 'ru'];

  const [showPassword, setShowPassword] = useState(false);
  const boundAction = loginAction.bind(null, locale);
  const [state, action, pending] = useActionState(boundAction, { error: null });

  // Fix: redirect() inside useActionState hangs in Next.js 15 / React 18.
  // Instead, the action returns { redirectTo } and we navigate imperatively.
  useEffect(() => {
    if (state.redirectTo) {
      // Use window.location for a hard navigation so the new session cookie
      // is picked up cleanly by the middleware on the first request.
      window.location.href = state.redirectTo;
    }
  }, [state.redirectTo]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-md">

        <div className="flex justify-center mb-6"><Logo /></div>
        <LangSwitcher current={locale} />

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            {t.heading}{' '}
            <em className="font-serif italic font-normal text-pink-500">{t.headingEm}</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">{t.subtitle}</p>
        </div>

        {/* Form */}
        <form
          action={action}
          className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
        >
          {state.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {(t as Record<string, unknown>)[state.error] as string ?? t.unknown}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="identifier" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              {t.labelIdentifier}
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
              {t.labelPassword}
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
                {t.forgotPassword}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pending ? t.submitting : t.submit}
          </button>
        </form>

        <p className="text-center text-sm text-[rgb(var(--text-secondary))] mb-2">
          {t.noAccount}{' '}
          <Link href={`/${locale}/sign-up`} className="text-pink-500 font-medium hover:underline">
            {t.register}
          </Link>
        </p>
        <p className="text-center text-sm text-[rgb(var(--text-secondary))] mb-4">
          {t.isDoctor}{' '}
          <Link href={`/${locale}/doctor-sign-up`} className="font-medium hover:underline" style={{ color: '#5580b0' }}>
            {t.doctorRegister}
          </Link>
        </p>

        <p className="text-center text-xs text-[rgb(var(--text-muted))]">
          {t.termsPrefix}
          <Link href={`/${locale}/terms`} className="text-pink-500 hover:underline">{t.termsLink}</Link>
          {t.termsAnd}
          <Link href={`/${locale}/privacy`} className="text-pink-500 hover:underline">{t.privacyLink}</Link>
        </p>
      </div>
    </div>
  );
}
