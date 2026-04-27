'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

type SetupData = { otpAuthUrl: string; secret: string; tempToken: string };

export default function Setup2FAPage() {
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const tempToken = sessionStorage.getItem('tempToken');
    if (!tempToken) { router.push('/auth/login'); return; }

    api.post<SetupData>('/v1/auth/setup-totp', { tempToken })
      .then(setSetup)
      .catch(() => router.push('/auth/login'));
  }, [router]);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setLoading(true);
    try {
      await api.post('/v1/auth/activate-totp', { code, tempToken: setup.tempToken });
      toast.success('2FA активирована! Теперь войдите снова.');
      sessionStorage.removeItem('tempToken');
      router.push('/auth/login');
    } catch {
      toast.error('Неверный код. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  if (!setup) return <div className="flex min-h-screen items-center justify-center"><p className="animate-pulse text-muted-foreground">Загрузка...</p></div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Настройка двухфакторной аутентификации</CardTitle>
          <CardDescription>Отсканируйте QR-код в приложении Google Authenticator или Authy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup.otpAuthUrl)}`}
              alt="QR Code"
              className="rounded-lg border"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Или введите секрет вручную:</p>
            <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">{setup.secret}</code>
          </div>
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код подтверждения (6 цифр)</Label>
              <Input
                id="code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? 'Активация...' : 'Активировать 2FA'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
