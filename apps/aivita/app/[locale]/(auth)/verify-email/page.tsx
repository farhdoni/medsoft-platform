'use client';
import { useActionState, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { verifyEmailAction, resendCodeAction } from '../sign-up/actions';

export default function VerifyEmailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? 'ru';
  const userId = searchParams?.get('userId') ?? '';

  const [resendCooldown, setResendCooldown] = useState(0);

  const boundVerify = verifyEmailAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundVerify, { error: null });

  async function handleResend() {
    if (resendCooldown > 0 || !userId) return;
    await resendCodeAction(userId);
    startResendCooldown();
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(timer); return 0; }
        return v - 1;
      });
    }, 1000);
  }

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
            Подтверди{' '}
            <em className="font-serif italic font-normal text-pink-500">email</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            Введи 6-значный код из письма
          </p>
        </div>

        <form
          action={formAction}
          className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
        >
          <input type="hidden" name="userId" value={userId} />

          {state.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {state.error === 'invalid_code' ? 'Неверный или истёкший код.' :
               state.error === 'network' ? 'Ошибка сети.' : 'Произошла ошибка.'}
            </div>
          )}

          <input
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

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pending ? 'Проверяем...' : 'Подтвердить'}
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
