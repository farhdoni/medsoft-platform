'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { api } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            Забыл{' '}
            <em className="font-serif italic font-normal text-pink-500">пароль?</em>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            Введи email и мы отправим ссылку для сброса
          </p>
        </div>

        {sent ? (
          <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium text-center space-y-4">
            <div className="text-4xl">📩</div>
            <p className="font-semibold text-navy">Письмо отправлено!</p>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Если аккаунт с адресом <span className="font-medium">{email}</span> существует,
              мы отправили ссылку для сброса пароля. Проверь папку «Спам».
            </p>
            <Link
              href={`/${locale}/sign-in`}
              className="block text-sm text-pink-500 hover:underline"
            >
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4 mb-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  required
                  className="w-full h-12 px-4 rounded-2xl border border-[rgba(120,160,200,0.2)] bg-white/80 text-navy text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Отправляем...' : 'Отправить ссылку'}
              </button>
            </form>

            <p className="text-center text-sm text-[rgb(var(--text-secondary))]">
              <Link href={`/${locale}/sign-in`} className="text-pink-500 hover:underline">
                ← Вернуться ко входу
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
