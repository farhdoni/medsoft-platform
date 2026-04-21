'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';

const schema = z.object({ code: z.string().length(6, 'Введите 6-значный код') });

function Setup2FAContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  useEffect(() => {
    if (!token) return;
    apiPost<{ qrDataUrl: string }>('/auth/setup-2fa', { setup_token: token })
      .then((d) => setQr(d.qrDataUrl))
      .catch(() => toast.error('Ошибка при получении QR-кода'));
  }, [token]);

  async function onSubmit({ code }: { code: string }) {
    try {
      const data = await apiPost<{ backup_codes: string[] }>('/auth/activate-2fa', { setup_token: token, code });
      setBackupCodes(data.backup_codes);
      toast.success('2FA успешно активирована');
    } catch {
      toast.error('Неверный код');
    }
  }

  if (backupCodes) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Сохраните резервные коды</CardTitle>
          <CardDescription>Это единственный раз, когда вы видите эти коды.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded">
            {backupCodes.map((c) => <span key={c}>{c}</span>)}
          </div>
          <Button className="w-full" onClick={() => router.replace('/dashboard')}>Продолжить</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Настройка двухфакторной аутентификации</CardTitle>
        <CardDescription>Отсканируйте QR-код в приложении Google Authenticator</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qr && (
          <div className="flex justify-center">
            <Image src={qr} alt="QR Code" width={200} height={200} unoptimized />
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Код из приложения</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" maxLength={6} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              Активировать
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Setup2FAPage() {
  return <Suspense><Setup2FAContent /></Suspense>;
}
