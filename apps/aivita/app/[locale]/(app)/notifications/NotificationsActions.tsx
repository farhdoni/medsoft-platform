'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  unreadCount: number;
  totalCount: number;
}

export function NotificationsActions({ unreadCount, totalCount }: Props) {
  const router = useRouter();
  const [loadingRead,  setLoadingRead]  = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  async function handleMarkAllRead() {
    setLoadingRead(true);
    try {
      await fetch('/api/notifications', { method: 'POST' });
      router.refresh();
    } finally {
      setLoadingRead(false);
    }
  }

  async function handleClearAll() {
    setLoadingClear(true);
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setShowConfirm(false);
      router.refresh();
    } finally {
      setLoadingClear(false);
    }
  }

  if (totalCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Прочитать все — только если есть непрочитанные */}
        <button
          onClick={handleMarkAllRead}
          disabled={loadingRead || unreadCount === 0}
          className="rounded-chip border px-3.5 py-2 text-[12px] font-semibold transition disabled:opacity-40"
          style={{
            borderColor: '#e8e4dc',
            background: unreadCount > 0 ? '#fff' : '#f8f7f4',
            color: '#2a2540',
          }}
        >
          {loadingRead ? '...' : '✓ Прочитать все'}
        </button>

        {/* Очистить все */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loadingClear || totalCount === 0}
          className="rounded-chip border px-3.5 py-2 text-[12px] font-semibold transition disabled:opacity-40"
          style={{
            borderColor: '#ffc5c5',
            background: '#fff0f0',
            color: '#c0392b',
          }}
        >
          🗑 Очистить
        </button>
      </div>

      {/* Confirm delete overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 60 }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl px-6 pt-5 space-y-3"
            style={{
              background: '#fff',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0dcd8', margin: '0 auto 4px' }} />
            <p className="text-[17px] font-extrabold text-center" style={{ color: '#2a2540' }}>
              Удалить все уведомления?
            </p>
            <p className="text-[13px] text-center" style={{ color: '#9a96a8' }}>
              Это действие нельзя отменить
            </p>
            <button
              onClick={handleClearAll}
              disabled={loadingClear}
              className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white transition disabled:opacity-60"
              style={{ background: '#dc3545' }}
            >
              {loadingClear ? '...' : '🗑 Удалить все'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full py-3.5 rounded-2xl text-[14px] font-semibold transition"
              style={{ background: '#f4f3ef', color: '#2a2540' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
}
