'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OrbBackground } from '@/components/shared/orb-background';
import { api } from '@/lib/api-client';

export default function ResetPasswordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? 'ru';
  const token = searchParams?.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError('Ссылка недействительна.'); return; }
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.resetPassword({ token, password });

      if ('error' in res) {
        setError('Ссылка недействительна или истекла.');
        return;
      }

      setDone(true);
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
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-navy mb-2">
            Новый{' '}
            <em className="font-serif italic font-normal text-pink-500">пароль</em>
          </h1>
        </div>

        {done ? (
          <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-navy">Пароль изменён!</p>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Теперь ты можешь войти с новым паролем.
            </p>
            <Link
              href={`/${locale}/sign-in`}
              className="block w-full h-12 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl flex items-center justify-center text-sm shadow-pink hover:shadow-pink-strong transition-all"
            >
              Войти
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white/75 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-6 shadow-medium space-y-4"
          >
            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-secondary))] pl-1">
                Новый пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60 disabled:translate-y-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
