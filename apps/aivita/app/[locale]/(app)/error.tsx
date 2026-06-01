'use client';

import { useEffect } from 'react';

// Catches client-side errors in the cabinet (RSC #482, etc.) and reloads
// automatically — avoids the blank "Application error" screen on fresh loads.
export default function CabinetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // For RSC-related errors: silently reload once
    if (error?.message?.includes('482') || error?.digest?.startsWith('NEXT_')) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Nunito, sans-serif',
        background: '#f4f3ef',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
      <p style={{ fontSize: 15, color: '#9a96a8', marginBottom: 20 }}>
        Загружаем кабинет...
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#9c5e6c',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Обновить
      </button>
    </div>
  );
}
