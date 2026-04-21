'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiPost } from '@/lib/api';

function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    apiPost<{ requires_2fa_setup?: boolean; requires_2fa?: boolean; setup_token?: string; challenge_token?: string }>(
      '/auth/verify-magic-link', { token }
    ).then((data) => {
      if (data.requires_2fa_setup && data.setup_token) {
        router.replace(`/setup-2fa?token=${data.setup_token}`);
      } else if (data.requires_2fa && data.challenge_token) {
        router.replace(`/verify-2fa?token=${data.challenge_token}`);
      } else {
        router.replace('/dashboard');
      }
    }).catch(() => {
      setStatus('error');
      toast.error('Ссылка недействительна или истекла');
    });
  }, [token, router]);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Проверка ссылки</CardTitle>
        <CardDescription>
          {status === 'loading' ? 'Подождите, выполняется вход...' : 'Ссылка недействительна. '}
        </CardDescription>
      </CardHeader>
      {status === 'error' && (
        <CardContent className="text-center">
          <a href="/login" className="text-primary underline text-sm">Запросить новую ссылку</a>
        </CardContent>
      )}
    </Card>
  );
}

export default function VerifyPage() {
  return <Suspense><VerifyContent /></Suspense>;
}
