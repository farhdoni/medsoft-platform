'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';

export function MarkAllReadButton() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function markAll() {
    setLoading(true);
    await apiRequest('/notifications/read-all', { method: 'POST' }).catch(() => null);
    setDone(true);
    setLoading(false);
  }

  if (done) return null;

  return (
    <button
      onClick={markAll}
      disabled={loading}
      className="rounded-chip border border-border-soft bg-white px-3.5 py-2 text-[12px] font-semibold text-text-primary hover:bg-bg-app transition disabled:opacity-50"
    >
      {loading ? '...' : 'Прочитать все'}
    </button>
  );
}
