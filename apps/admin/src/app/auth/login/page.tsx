'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (needs2fa) body.totpCode = totpCode;

      const res = await api.post<{ requires2fa?: boolean }>('/v1/auth/login', body);

      if (res.requires2fa) {
        setNeeds2fa(true);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при входе';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold">
              M
            </div>
          </div>
          <CardTitle className="text-2xl text-center">MedSoft Admin</CardTitle>
          <CardDescription className="text-center">
            {needs2fa ? 'Введите код из приложения аутентификатора' : 'Войдите в панель администратора'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needs2fa ? (
            /* ── 2FA step ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center mb-2">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totpCode">Код 2FA (6 цифр)</Label>
                <Input
                  id="totpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading ? 'Проверяю...' : 'Подтвердить'}
              </Button>
              <button
                type="button"
                onClick={() => { setNeeds2fa(false); setTotpCode(''); setError(''); }}
                className="text-sm text-muted-foreground hover:text-foreground w-full text-center transition-colors"
              >
                ← Назад
              </button>
            </form>
          ) : (
            /* ── Login step ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Забыли пароль?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
