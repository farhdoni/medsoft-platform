'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import {
  registerDoctorAction,
  verifyEmailAction,
  resendCodeAction,
  type DoctorRegisterState,
} from './actions';

const REGISTER_ERRORS: Record<string, string> = {
  email_taken:  'Этот email уже используется.',
  phone_taken:  'Этот номер телефона уже зарегистрирован.',
  network:      'Ошибка сети. Проверьте соединение.',
  server_error: 'Ошибка сервера. Попробуйте позже.',
};

const SPECIALIZATIONS = [
  'Терапевт', 'Педиатр', 'Кардиолог', 'Невролог', 'Хирург',
  'Гинеколог', 'Уролог', 'Офтальмолог', 'Оториноларинголог (ЛОР)',
  'Стоматолог', 'Дерматолог', 'Эндокринолог', 'Онколог',
  'Ортопед-травматолог', 'Гастроэнтеролог', 'Психиатр',
  'Пульмонолог', 'Нефролог', 'Аллерголог', 'Ревматолог',
  'Инфекционист', 'Анестезиолог', 'Радиолог', 'Другое',
];

// ─── Blue input style ─────────────────────────────────────────────────────────
const inputCls =
  'w-full h-12 px-4 rounded-2xl border border-[rgba(85,128,176,0.25)] bg-white/80 text-[#2a2540] text-sm outline-none transition-all ' +
  'focus:border-[#6BA3D6] focus:ring-2 focus:ring-[rgba(107,163,214,0.15)]';

export default function DoctorSignUpPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const boundRegister = registerDoctorAction.bind(null, locale);
  const [registerState, registerFormAction, registering] = useActionState<DoctorRegisterState, FormData>(
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
      setResendCooldown(v => {
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

  // ── Verify step ──────────────────────────────────────────────────────────────
  if (registerState.step === 'verify') {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
        <OrbBackground />
        <div className="relative z-10 w-full max-w-md">
          <div className="flex justify-center mb-8"><Logo /></div>

          <div className="text-center mb-8">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #5580b0, #6BA3D6)', boxShadow: '0 8px 24px rgba(107,163,214,0.35)' }}
            >
              <span className="text-3xl">📬</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-[#2a2540] mb-2">
              Проверьте{' '}
              <em className="font-serif italic font-normal" style={{ color: '#5580b0' }}>почту</em>
            </h1>
            <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              Мы отправили 6-значный код на{' '}
              <span className="font-medium text-[#2a2540]">{registerState.email}</span>
            </p>
          </div>

          <form
            action={verifyFormAction}
            className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(85,128,176,0.15)] p-6 shadow-medium space-y-4 mb-4"
          >
            <input type="hidden" name="userId" value={registerState.userId} />

            {verifyState.error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                {verifyState.error === 'invalid_code'
                  ? 'Неверный или истёкший код.'
                  : verifyState.error === 'network'
                    ? 'Ошибка сети.'
                    : 'Произошла ошибка.'}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="code" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
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
                className="w-full h-14 px-4 rounded-2xl border border-[rgba(85,128,176,0.2)] bg-white/80 text-[#2a2540] text-2xl font-bold text-center tracking-widest outline-none transition-all focus:border-[#6BA3D6] focus:ring-2 focus:ring-[rgba(107,163,214,0.15)]"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 h-14 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #5580b0, #6BA3D6)',
                boxShadow: '0 6px 20px rgba(107,163,214,0.40)',
              }}
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {verifying ? 'Проверяем...' : 'Подтвердить'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full text-sm transition-colors disabled:opacity-50 hover:text-[#2a2540]"
              style={{ color: 'rgb(var(--text-secondary))' }}
            >
              {resendCooldown > 0
                ? `Отправить снова через ${resendCooldown}с`
                : 'Отправить код снова'}
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

        {/* Heading */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #5580b0, #6BA3D6)', boxShadow: '0 8px 24px rgba(107,163,214,0.35)' }}
          >
            <span className="text-3xl">🩺</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-[#2a2540] mb-2">
            Присоединяйтесь к{' '}
            <em className="font-serif italic font-normal" style={{ color: '#5580b0' }}>AIVITA</em>
          </h1>
          <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            Регистрация для врачей
          </p>
        </div>

        {/* Info banner */}
        <div
          className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 text-sm"
          style={{
            background: 'rgba(107,163,214,0.08)',
            border: '1px solid rgba(107,163,214,0.2)',
          }}
        >
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm" style={{ color: '#5580b0' }}>
            Диплом и лицензию можно загрузить в профиле после регистрации
          </p>
        </div>

        {/* Form */}
        <form
          action={registerFormAction}
          className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(85,128,176,0.15)] p-6 shadow-medium space-y-4 mb-4"
        >
          {registerState.error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
              {REGISTER_ERRORS[registerState.error] ?? 'Произошла ошибка.'}
            </div>
          )}

          {/* ФИО */}
          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
              ФИО <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Иванов Иван Иванович"
              autoComplete="name"
              required
              minLength={2}
              className={inputCls}
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="doctor@example.com"
              autoComplete="email"
              required
              className={inputCls}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label htmlFor="phone" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
              Телефон
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+998 90 000 00 00"
              autoComplete="tel"
              className={inputCls}
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
              Пароль <span className="text-red-400">*</span>
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
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[#2a2540]"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Specialization */}
          <div className="space-y-1">
            <label htmlFor="specialization" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
              Специализация
            </label>
            <select
              id="specialization"
              name="specialization"
              className={inputCls}
              defaultValue=""
            >
              <option value="">Выберите специализацию</option>
              {SPECIALIZATIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Experience + Workplace */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="experienceYears" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
                Стаж (лет)
              </label>
              <input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                max="60"
                placeholder="5"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="workplace" className="text-xs font-medium pl-1" style={{ color: 'rgb(var(--text-secondary))' }}>
                Место работы
              </label>
              <input
                id="workplace"
                name="workplace"
                type="text"
                placeholder="Клиника / больница"
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={registering}
            className="w-full flex items-center justify-center gap-2 h-14 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #5580b0, #6BA3D6)',
              boxShadow: '0 6px 20px rgba(107,163,214,0.40)',
            }}
          >
            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {registering ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
          Уже есть аккаунт?{' '}
          <Link
            href={`/${locale}/sign-in`}
            className="font-medium hover:underline"
            style={{ color: '#5580b0' }}
          >
            Войти
          </Link>
        </p>

        <p className="text-center text-sm mb-1" style={{ color: 'rgb(var(--text-secondary))' }}>
          Вы пациент?{' '}
          <Link
            href={`/${locale}/sign-up`}
            className="font-medium hover:underline"
            style={{ color: '#5580b0' }}
          >
            Регистрация для пациентов
          </Link>
        </p>

        <p className="text-center text-xs mt-3" style={{ color: 'rgb(var(--text-muted))' }}>
          Регистрируясь, вы соглашаетесь с{' '}
          <Link href={`/${locale}/terms`} className="hover:underline" style={{ color: '#5580b0' }}>условиями</Link>
          {' '}и{' '}
          <Link href={`/${locale}/privacy`} className="hover:underline" style={{ color: '#5580b0' }}>политикой конфиденциальности</Link>
        </p>
      </div>
    </div>
  );
}
