'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useIdleTimer } from '@/hooks/useIdleTimer';

interface IdleWarningModalProps {
  locale: string;
}

export function IdleWarningModal({ locale }: IdleWarningModalProps) {
  const t = useTranslations('app.idleWarning');

  const handleIdle = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // non-fatal — cookies will be cleared by the server on next request
    }
    window.location.href = `/${locale}/sign-in`;
  }, [locale]);

  const { isWarning, keepAlive } = useIdleTimer(handleIdle);

  if (!isWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-desc"
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏱️
        </div>

        <h2
          id="idle-warning-title"
          className="mb-1 text-base font-semibold text-gray-900"
        >
          {t('title')}
        </h2>

        <p
          id="idle-warning-desc"
          className="mb-5 text-sm text-gray-500 leading-relaxed"
        >
          {t('body')}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={keepAlive}
            className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            {t('stayBtn')}
          </button>

          <button
            onClick={() => void handleIdle()}
            className="w-full rounded-xl py-3 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            {t('logoutBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
