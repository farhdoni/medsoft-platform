'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doctorLoginAction } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный email или пароль.',
  account_locked: 'Аккаунт заблокирован. Попробуйте через 15 минут.',
  not_doctor: 'Этот аккаунт не является врачом. Используйте обычный вход.',
  network: 'Ошибка сети. Проверьте соединение.',
};

export default function DoctorLoginPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';
  const [showPassword, setShowPassword] = useState(false);

  const boundAction = doctorLoginAction.bind(null, locale);
  const [state, action, pending] = useActionState(boundAction, { error: null });

  return (
    <div className="min-h-screen flex" style={{ background: '#f0f4f8' }}>
      {/* Left panel — decorative */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ background: 'linear-gradient(145deg, #2a2540 0%, #3d3560 50%, #1e3a5f 100%)' }}
      >
        <div className="max-w-sm text-center">
          <div className="text-7xl mb-6">🏥</div>
          <h1 className="text-3xl font-bold mb-4 leading-tight">
            Кабинет врача
          </h1>
          <p className="text-white/70 text-base leading-relaxed mb-8">
            Управляйте пациентами, назначениями и консультациями в одном месте
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: '👥', text: 'Пациенты' },
              { icon: '📅', text: 'Расписание' },
              { icon: '💊', text: 'Назначения' },
              { icon: '🤖', text: 'AI-помощник' },
            ].map(item => (
              <div
                key={item.text}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <span>{item.icon}</span>
                <span className="text-white/80">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo + header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg, var(--accent-dark), #4a7ab5)' }}
            >
              👨‍⚕️
            </div>
            <h2 className="text-2xl font-bold" style={{ color: '#2a2540' }}>
              Вход в кабинет врача
            </h2>
            <p className="text-sm mt-1" style={{ color: '#9a96a8' }}>
              Только для зарегистрированных врачей
            </p>
          </div>

          {/* Form card */}
          <div
            className="bg-white rounded-3xl p-6 shadow-lg space-y-4"
            style={{ border: '1px solid #e8e4dc' }}
          >
            {state.error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                {ERROR_MESSAGES[state.error] ?? 'Произошла ошибка.'}
                {state.error === 'not_doctor' && (
                  <Link
                    href={`/${locale}/sign-in`}
                    className="block mt-1 text-xs underline text-red-600"
                  >
                    Перейти на обычный вход →
                  </Link>
                )}
              </div>
            )}

            <form action={action} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold mb-1.5 pl-1"
                  style={{ color: '#6a6580' }}
                >
                  Email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="email"
                  placeholder="doctor@hospital.com"
                  autoComplete="username"
                  required
                  className="w-full h-12 px-4 rounded-2xl text-sm outline-none transition-all"
                  style={{
                    border: '1.5px solid #e8e4dc',
                    background: '#f9f8f6',
                    color: '#2a2540',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-dark)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e8e4dc'; e.currentTarget.style.background = '#f9f8f6'; }}
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5 pl-1">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold"
                    style={{ color: '#6a6580' }}
                  >
                    Пароль
                  </label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-xs"
                    style={{ color: 'var(--accent-dark)' }}
                  >
                    Забыли пароль?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full h-12 px-4 pr-12 rounded-2xl text-sm outline-none transition-all"
                    style={{
                      border: '1.5px solid #e8e4dc',
                      background: '#f9f8f6',
                      color: '#2a2540',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-dark)'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e8e4dc'; e.currentTarget.style.background = '#f9f8f6'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: '#9a96a8' }}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={pending}
                className="w-full h-13 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  height: 52,
                  background: pending
                    ? 'var(--accent-disabled)'
                    : 'linear-gradient(135deg, var(--accent-dark), #4a7ab5)',
                  cursor: pending ? 'not-allowed' : 'pointer',
                }}
              >
                {pending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Входим...
                  </>
                ) : (
                  'Войти в кабинет'
                )}
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div className="mt-5 text-center space-y-2">
            <p className="text-xs" style={{ color: '#9a96a8' }}>
              Не зарегистрированы?{' '}
              <Link
                href={`/${locale}/sign-up`}
                className="font-semibold"
                style={{ color: 'var(--accent-dark)' }}
              >
                Создать аккаунт врача
              </Link>
            </p>
            <p className="text-xs" style={{ color: 'var(--accent-disabled)' }}>
              Пациент?{' '}
              <Link
                href={`/${locale}/sign-in`}
                className="underline"
                style={{ color: '#9a96a8' }}
              >
                Обычный вход
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
