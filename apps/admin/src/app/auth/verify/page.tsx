'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function VerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }

    api.post<{ step: string; tempToken: string }>('/v1/auth/verify-magic-link', { token })
      .then((res) => {
        if (res.step === 'setup_totp') {
          sessionStorage.setItem('tempToken', res.tempToken);
          router.push('/auth/setup-2fa');
        } else if (res.step === 'verify_totp') {
          sessionStorage.setItem('tempToken', res.tempToken);
          router.push('/auth/verify-2fa');
        }
      })
      .catch(() => {
        setStatus('error');
        toast.error('Ссылка недействительна или истекла');
      });
  }, [params, router]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Ссылка недействительна или истекла.</p>
          <a href="/auth/login" className="text-primary underline">Вернуться к входу</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground animate-pulse">Проверяем ссылку...</p>
    </div>
  );
}
