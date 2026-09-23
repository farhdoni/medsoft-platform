'use client';
import { useActionState, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { LanguageMenuButton } from '@/components/shared/LanguageMenu';
import { registerAction, verifyEmailAction, resendCodeAction } from './actions';

// ─── Form translations ────────────────────────────────────────────────────────

const T = {
  ru: {
    heading: 'Создай',
    headingEm: 'аккаунт',
    subtitle: 'Твой личный ИИ-помощник для здоровья',
    refTitle: 'Вас пригласил друг!',
    refSub: 'Зарегистрируйтесь и оба получите 1 месяц Premium бесплатно',
    labelEmail: 'Email',
    labelNickname: 'Никнейм',
    labelName: 'Имя',
    optional: '(необязательно)',
    labelPassword: 'Пароль',
    placeholderPassword: 'Минимум 8 символов',
    nicknameHint: 'Только буквы, цифры и _',
    submit: 'Создать аккаунт',
    submitting: 'Создаём аккаунт...',
    haveAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
    termsPrefix: 'Регистрируясь, вы соглашаетесь с ',
    termsLink: 'условиями',
    termsAnd: ' и ',
    privacyLink: 'политикой конфиденциальности',
    // verify step
    verifyTitle: 'Проверь',
    verifyTitleEm: 'почту',
    verifySub: 'Мы отправили 6-значный код на',
    codeLabel: 'Код из письма',
    confirm: 'Подтвердить',
    confirming: 'Проверяем...',
    resendIn: (n: number) => `Отправить снова через ${n}с`,
    resend: 'Отправить код снова',
    // errors
    email_taken: 'Этот email уже зарегистрирован и подтверждён — войдите в аккаунт.',
    nickname_taken: 'Этот никнейм уже занят.',
    network: 'Ошибка сети. Проверь соединение.',
    server_error: 'Ошибка сервера. Попробуй позже.',
    delivery_failed: 'Не удалось отправить письмо с кодом. Почта временно недоступна — попробуйте ещё раз через пару минут.',
    resend_cooldown: 'Код уже отправлен недавно. Подождите немного перед повторной попыткой.',
    too_many_attempts: 'Слишком много попыток отправки кода. Попробуйте позже.',
    invalid_code: 'Неверный или истёкший код.',
    unknown: 'Произошла ошибка.',
    chooseLanguage: 'Язык интерфейса',
  },
  uz: {
    heading: 'Hisob',
    headingEm: 'yarating',
    subtitle: "Sog'liq uchun shaxsiy AI yordamchingiz",
    refTitle: "Do'stingiz taklif qildi!",
    refSub: "Ro'yxatdan o'ting va ikkalangiz 1 oy Premium tekin olasiz",
    labelEmail: 'Email',
    labelNickname: 'Taxallus',
    labelName: 'Ism',
    optional: '(ixtiyoriy)',
    labelPassword: 'Parol',
    placeholderPassword: 'Kamida 8 ta belgi',
    nicknameHint: 'Faqat harflar, raqamlar va _',
    submit: "Hisob yaratish",
    submitting: "Hisob yaratilmoqda...",
    haveAccount: 'Allaqachon hisob bormi?',
    signIn: 'Kirish',
    termsPrefix: "Ro'yxatdan o'tish orqali siz ",
    termsLink: 'shartlarga',
    termsAnd: ' va ',
    privacyLink: 'maxfiylik siyosatiga',
    // verify step
    verifyTitle: 'Pochtangizni',
    verifyTitleEm: 'tekshiring',
    verifySub: 'Quyidagi manzilga 6 xonali kod yuborildi:',
    codeLabel: 'Xatdagi kod',
    confirm: 'Tasdiqlash',
    confirming: 'Tekshirilmoqda...',
    resendIn: (n: number) => `${n}s dan keyin qayta yuborish`,
    resend: 'Kodni qayta yuborish',
    // errors
    email_taken: 'Bu email allaqachon ro\'yxatdan o\'tgan va tasdiqlangan — hisobingizga kiring.',
    nickname_taken: 'Bu taxallus allaqachon band.',
    network: 'Tarmoq xatosi. Ulanishni tekshiring.',
    server_error: "Server xatosi. Keyinroq urinib ko'ring.",
    delivery_failed: "Kod bilan xat yuborilmadi. Pochta vaqtincha ishlamayapti — bir necha daqiqadan so'ng qayta urinib ko'ring.",
    resend_cooldown: "Kod yaqinda yuborilgan edi. Qayta urinishdan oldin biroz kuting.",
    too_many_attempts: "Kod yuborish urinishlari juda ko'p. Keyinroq urinib ko'ring.",
    invalid_code: "Noto'g'ri yoki muddati o'tgan kod.",
    unknown: 'Xato yuz berdi.',
    chooseLanguage: 'Interfeys tili',
  },
  en: {
    heading: 'Create',
    headingEm: 'account',
    subtitle: 'Your personal AI health companion',
    refTitle: 'A friend invited you!',
    refSub: 'Register and you both get 1 month Premium for free',
    labelEmail: 'Email',
    labelNickname: 'Nickname',
    labelName: 'Name',
    optional: '(optional)',
    labelPassword: 'Password',
    placeholderPassword: 'At least 8 characters',
    nicknameHint: 'Letters, digits and _ only',
    submit: 'Create account',
    submitting: 'Creating account...',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    termsPrefix: 'By registering you agree to our ',
    termsLink: 'terms',
    termsAnd: ' and ',
    privacyLink: 'privacy policy',
    // verify step
    verifyTitle: 'Check your',
    verifyTitleEm: 'email',
    verifySub: 'We sent a 6-digit code to',
    codeLabel: 'Code from email',
    confirm: 'Confirm',
    confirming: 'Checking...',
    resendIn: (n: number) => `Resend in ${n}s`,
    resend: 'Resend code',
    // errors
    email_taken: 'This email is already registered and verified — sign in instead.',
    nickname_taken: 'This nickname is already taken.',
    network: 'Network error. Check your connection.',
    server_error: 'Server error. Try again later.',
    delivery_failed: 'Could not send the code email. Mail delivery is temporarily unavailable — please try again in a couple of minutes.',
    resend_cooldown: 'A code was already sent recently. Please wait a moment before trying again.',
    too_many_attempts: 'Too many code-send attempts. Please try again later.',
    invalid_code: 'Invalid or expired code.',
    unknown: 'An error occurred.',
    chooseLanguage: 'Interface language',
  },
} as const;

type TLocale = keyof typeof T;

export default function SignUpPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? 'ru';
  const refCode = searchParams?.get('ref') ?? '';
  const t = T[(locale as TLocale) in T ? (locale as TLocale) : 'ru'];

  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [detectedTz, setDetectedTz] = useState('Asia/Tashkent');
  useEffect(() => {
    try { setDetectedTz(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch {}
  }, []);

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
          <div className="flex justify-center mb-6"><Logo /></div>
          <LanguageMenuButton locale={locale} title={t.chooseLanguage} variant="pill" />

          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
              <span className="text-3xl">📬</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
              {t.verifyTitle}{' '}
              <em className="font-serif italic font-normal text-pink-500">{t.verifyTitleEm}</em>
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-sm">
              {t.verifySub}{' '}
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
                {verifyState.error === 'invalid_code' ? t.invalid_code :
                 verifyState.error === 'network' ? t.network : t.unknown}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="code" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
                {t.codeLabel}
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
              {verifying ? t.confirming : t.confirm}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full text-sm text-[rgb(var(--text-secondary))] hover:text-navy transition-colors disabled:opacity-50"
            >
              {resendCooldown > 0 ? t.resendIn(resendCooldown) : t.resend}
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
        <div className="flex justify-center mb-6"><Logo /></div>
        <LanguageMenuButton locale={locale} title={t.chooseLanguage} variant="pill" />

        {/* Referral badge */}
        {refCode && (
          <div
            className="rounded-2xl px-4 py-3.5 mb-5 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #8b6aae 100%)' }}
          >
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">{t.refTitle}</p>
              <p className="text-[11px] text-white/80">{t.refSub}</p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            {t.heading}{' '}
            <em className="font-serif italic font-normal text-pink-500">{t.headingEm}</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            {t.subtitle}
          </p>
        </div>

        <form
          action={registerFormAction}
          className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
        >
          {refCode && <input type="hidden" name="refCode" value={refCode} />}

          {registerState.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {(t as Record<string, unknown>)[registerState.error] as string ?? t.unknown}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              {t.labelEmail}
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
              {t.labelNickname}
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
            <p className="text-xs text-[rgb(var(--text-muted))] pl-1">{t.nicknameHint}</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
              {t.labelName} <span className="text-[rgb(var(--text-muted))]">{t.optional}</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Aziz"
              autoComplete="name"
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
                placeholder={t.placeholderPassword}
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

          <input type="hidden" name="role" value="patient" />
          <input type="hidden" name="timezone" value={detectedTz} />

          <button
            type="submit"
            disabled={registering}
            className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
          >
            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {registering ? t.submitting : t.submit}
          </button>
        </form>

        <p className="text-center text-sm text-[rgb(var(--text-secondary))] mb-4">
          {t.haveAccount}{' '}
          <Link href={`/${locale}/sign-in`} className="text-pink-500 font-medium hover:underline">
            {t.signIn}
          </Link>
        </p>

        <p className="text-center text-xs text-[rgb(var(--text-muted))]">
          {t.termsPrefix}
          <Link href={`/${locale}/terms`} className="text-pink-500 hover:underline">{t.termsLink}</Link>
          {t.termsAnd}
          <Link href={`/${locale}/privacy`} className="text-pink-500 hover:underline">
            {t.privacyLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
