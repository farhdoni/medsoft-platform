'use client';

import { useState } from 'react';

export function GenerateReportButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function generate() {
    setStatus('loading');
    // Use Next.js proxy route so httpOnly cookie is forwarded correctly
    const res = await fetch('/api/reports', { method: 'POST' }).catch(() => null);
    if (res && res.ok) {
      setStatus('done');
      // Reload page to show new report
      window.location.reload();
    } else {
      setStatus('error');
    }
  }

  if (status === 'done') return null;

  return (
    <button
      onClick={generate}
      disabled={status === 'loading'}
      className="inline-flex items-center gap-2 rounded-chip px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
      style={{ background: 'var(--accent-dark)' }}
    >
      {status === 'loading' ? (
        <>
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Генерирую...
        </>
      ) : status === 'error' ? (
        'Ошибка — попробовать снова'
      ) : (
        'Сгенерировать отчёт →'
      )}
    </button>
  );
}
