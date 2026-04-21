'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';

const schema = z.object({ code: z.string().min(6).max(10) });

function Verify2FAContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [useBackup, setUseBackup] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  async function onSubmit({ code }: { code: string }) {
    try {
      await apiPost('/auth/verify-2fa', {
        challenge_token: token,
        ...(useBackup ? { backup_code: code } : { code }),
      });
      toast.success('Вход выполнен успешно');
      router.replace('/dashboard');
    } catch {
      toast.error('Неверный код');
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Двухфакторная аутентификация</CardTitle>
        <CardDescription>
          {useBackup ? 'Введите резервный код' : 'Введите код из приложения-аутентификатора'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{useBackup ? 'Резервный код' : 'Код'}</FormLabel>
                  <FormControl>
                    <Input placeholder={useBackup ? 'xxxx-xxxx' : '123456'} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              Войти
            </Button>
          </form>
        </Form>
        <Button variant="link" className="w-full text-xs" onClick={() => setUseBackup(!useBackup)}>
          {useBackup ? '← Вернуться к коду из приложения' : 'Использовать резервный код'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Verify2FAPage() {
  return <Suspense><Verify2FAContent /></Suspense>;
}
