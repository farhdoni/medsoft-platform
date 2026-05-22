'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Copy, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ ok: boolean; resetToken?: string }>(
        '/v1/auth/forgot-password',
        { email },
      );
      if (res.resetToken) {
        const link = `${window.location.origin}/auth/reset-password?token=${res.resetToken}`;
        setResetLink(link);
      } else {
        // No token returned (user not found) — show generic success
        setResetLink('__not_found__');
      }
    } catch {
      setError('Ошибка при запросе. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <CardTitle className="text-2xl text-center">Сброс пароля</CardTitle>
          <CardDescription className="text-center">
            Введите email вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!resetLink ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="pl-9"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Отправляю...' : 'Получить ссылку'}
              </Button>
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад к входу
              </button>
            </form>
          ) : resetLink === '__not_found__' ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                Если аккаунт с таким email существует, ссылка для сброса была сгенерирована.
              </div>
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад к входу
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-xs break-all font-mono text-foreground select-all">
                {resetLink}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ссылка действительна <strong>15 минут</strong>. Скопируйте и откройте в браузере.
              </p>
              <Button className="w-full" variant="outline" onClick={copyLink}>
                {copied ? (
                  <><CheckCheck className="h-4 w-4 mr-2 text-green-500" />Скопировано!</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" />Скопировать ссылку</>
                )}
              </Button>
              <Button className="w-full" onClick={() => router.push(resetLink)}>
                Открыть сейчас
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
