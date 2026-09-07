'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">{t.errors.pageNotFound}</p>
      <Link href="/dashboard" className="text-primary underline underline-offset-4">
        {t.errors.backToDashboard}
      </Link>
    </div>
  );
}
