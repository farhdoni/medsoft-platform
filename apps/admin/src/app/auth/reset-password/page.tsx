'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) router.replace('/auth/forgot-password');
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t.errors.pwdTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.errors.pwdMismatch);
      return;
    }
    setLoading(true);
    try {
      await api.post('/v1/auth/reset-password-token', { token, newPassword: password });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth.linkInvalid);
    } finally {
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
          <CardTitle className="text-2xl text-center">{t.auth.newPwdTitle}</CardTitle>
          <CardDescription className="text-center">
            {t.auth.newPwdDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <ShieldCheck className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t.auth.pwdChanged}
              </p>
              <Button className="w-full" onClick={() => router.push('/auth/login')}>
                {t.auth.signIn}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.newPwdTitle}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="pr-10"
                    placeholder={t.auth.minChars}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t.auth.repeatPwd}</Label>
                <Input
                  id="confirm"
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder={t.auth.repeatPwd}
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.settings.savingShort : t.auth.savePwd}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
