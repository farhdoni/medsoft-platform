'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/v1/auth/magic-link', { email });
      setSent(true);
      toast.success('Ссылка отправлена. Проверьте почту (или логи сервера в режиме mock).');
    } catch {
      toast.error('Ошибка при отправке ссылки');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold">M</div>
          </div>
          <CardTitle className="text-2xl text-center">MedSoft Admin</CardTitle>
          <CardDescription className="text-center">Введите email для входа</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Ссылка для входа отправлена на <strong>{email}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                В режиме разработки ссылка выводится в логи сервера.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Отправить снова
              </Button>
            </div>
          ) : (
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Отправка...' : 'Получить ссылку для входа'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
