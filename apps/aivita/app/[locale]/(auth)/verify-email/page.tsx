'use client';
import { useActionState, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { verifyEmailAction, resendCodeAction } from '../sign-up/actions';

const T = {
  ru: {
    heading: 'Подтверди', headingEm: 'email',
    subtitle: 'Введи 6-значный код из письма',
    confirm: 'Подтвердить', confirming: 'Проверяем...',
    resendIn: (n: number) => `Отправить снова через ${n}с`,
    resend: 'Отправить код снова',
    invalid_code: 'Неверный или истёкший код.',
    network: 'Ошибка сети.',
    unknown: 'Произошла ошибка.',
  },
  uz: {
    heading: 'Emailni', headingEm: 'tasdiqlang',
    subtitle: 'Xatdan 6 xonali kodni kiriting',
    confirm: 'Tasdiqlash', confirming: 'Tekshirilmoqda...',
    resendIn: (n: number) => `${n}s dan keyin qayta yuborish`,
    resend: 'Kodni qayta yuborish',
    invalid_code: "Noto'g'ri yoki muddati o'tgan kod.",
    network: 'Tarmoq xatosi.',
    unknown: 'Xato yuz berdi.',
  },
  en: {
    heading: 'Verify your', headingEm: 'email',
    subtitle: 'Enter the 6-digit code from the email',
    confirm: 'Confirm', confirming: 'Checking...',
    resendIn: (n: number) => `Resend in ${n}s`,
    resend: 'Resend code',
    invalid_code: 'Invalid or expired code.',
    network: 'Network error.',
    unknown: 'An error occurred.',
  },
} as const;
type TLocale = keyof typeof T;

export default function VerifyEmailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? 'ru';
  const userId = searchParams?.get('userId') ?? '';
  const t = T[(locale as TLocale) in T ? (locale as TLocale) : 'ru'];

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
      setResendCooldown((v) => { if (v <= 1) { clearInterval(timer); return 0; } return v - 1; });
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
            {t.heading}{' '}
            <em className="font-serif italic font-normal text-pink-500">{t.headingEm}</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">{t.subtitle}</p>
        </div>

        <form action={formAction} className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4">
          <input type="hidden" name="userId" value={userId} />

          {state.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {state.error === 'invalid_code' ? t.invalid_code : state.error === 'network' ? t.network : t.unknown}
            </div>
          )}

          <input name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            placeholder="123456" autoComplete="one-time-code" required
            className="w-full h-14 px-4 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-2xl font-bold text-center tracking-widest outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
          />

          <button type="submit" disabled={pending}
            className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pending ? t.confirming : t.confirm}
          </button>

          <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
            className="w-full text-sm text-[rgb(var(--text-secondary))] hover:text-navy transition-colors disabled:opacity-50">
            {resendCooldown > 0 ? t.resendIn(resendCooldown) : t.resend}
          </button>
        </form>
      </div>
    </div>
  );
}
