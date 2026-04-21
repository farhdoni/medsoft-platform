'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';

const schema = z.object({ email: z.string().email('Введите корректный email') });

export default function LoginPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit({ email }: { email: string }) {
    try {
      await apiPost('/auth/magic-link', { email });
      setSent(true);
      toast.success('Ссылка для входа отправлена на ваш email');
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch {
      toast.error('Ошибка при отправке ссылки');
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">MedSoft Admin</CardTitle>
        <CardDescription>Введите email для получения ссылки входа</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-center text-sm text-muted-foreground">
            Проверьте почту и перейдите по ссылке.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" type="email" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Отправка...' : 'Получить ссылку'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
