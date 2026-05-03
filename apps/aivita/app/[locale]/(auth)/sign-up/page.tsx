'use client';
// build: 2026-05-03
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { registerAction, verifyEmailAction, resendCodeAction } from './actions';

const REGISTER_ERRORS: Record<string, string> = {
  email_taken: 'Этот email уже используется.',
  nickname_taken: 'Этот никнейм уже занят.',
  network: 'Ошибка сети. Проверь соединение.',
  server_error: 'Ошибка сервера. Попробуй позже.',
};

export default function SignUpPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const boundRegister = registerAction.bind(null, locale);
  const [registerState, registerFormAction, registering] = useActionState(
    boundRegister,
    { error: null }
  );

  const boundVerify = verifyEmailAction.bind(null, locale);
  const [verifyState, verifyFormAction, verifying] = useActionState(
    boundVerify,
    { error: null }
  );

  function startResendCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(timer); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0 || !registerState.userId) return;
    await resendCodeAction(registerState.userId);
    startResendCooldown();
  }

  // ── Verify step ─────────────────────────────────────────────────────────────
  if (registerState.step === 'verify') {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
        <OrbBackground />
        <div className="relative z-10 w-full max-w-md">
          <div className="flex justify-center mb-8"><Logo /></div>

          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
              <span className="text-3xl">📬</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
              Проверь{' '}
              <em className="font-serif italic font-normal text-pink-500">почту</em>
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-sm">
              Мы отправили 6-значный код на{' '}
              <span className="font-medium text-navy">{registerState.email}</span>
            </p>
          </div>

          <form
            action={verifyFormAction}
            className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
          >
            <input type="hidden" name="userId" value={registerState.userId} />

            {verifyState.error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                {verifyState.error === 'invalid_code' ? 'Неверный или истёкший код.' :
                 verifyState.error === 'network' ? 'Ошибка сети.' : 'Произошла ошибка.'}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="code" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
                Код из письма
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                required
                className="w-full h-14 px-4 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-2xl font-bold text-center tracking-widest outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {verifying ? 'Проверяем...' : 'Подтвердить'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full text-sm text-[rgb(var(--text-secondary))] hover:text-navy transition-colors disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Отправить снова через ${resendCooldown}с` : 'Отправить код снова'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Register step ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo /></div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            Создай{' '}
            <em className="font-serif italic font-normal text-pink-500">аккаунт</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            Твой личный ИИ-помощник для здоровья
          </p>
        </div>

        <form
          action={registerFormAction}
          className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
        >
          {registerState.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {REGISTER_ERRORS[registerState.error] ?? 'Произошла ошибка.'}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@mail.com"
              autoComplete="email"
              required
              className="w-full h-12 px-4 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="nickname" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              Никнейм
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              placeholder="aziz_98"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              required
              className="w-full h-12 px-4 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
            />
            <p className="text-xs text-[rgb(var(--text-muted))] pl-1">Только буквы, цифры и _</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              Имя <span className="text-[rgb(var(--text-muted))]">(необязательно)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Азиз"
              autoComplete="name"
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
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                minLength={8}
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
          </div>

          <button
            type="submit"
            disabled={registering}
            className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
          >
            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {registering ? 'Создаём аккаунт...' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="text-center text-sm text-[rgb(var(--text-secondary))] mb-4">
          Уже есть аккаунт?{' '}
          <Link href={`/${locale}/sign-in`} className="text-pink-500 font-medium hover:underline">
            Войти
          </Link>
        </p>

        <p className="text-center text-xs text-[rgb(var(--text-muted))]">
          Регистрируясь, вы соглашаетесь с{' '}
          <Link href={`/${locale}/terms`} className="text-pink-500 hover:underline">условиями</Link>
          {' '}и{' '}
          <Link href={`/${locale}/privacy`} className="text-pink-500 hover:underline">
            политикой конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  );
}
