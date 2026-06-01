'use client';

// Catches unhandled React errors (including React #482 from RSC prefetch
// failures in Next.js 15) so they show a recoverable UI instead of a blank page.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Auto-reload once on RSC-related errors (digest starts with NEXT_)
  if (typeof window !== 'undefined' && error?.digest?.startsWith('NEXT_')) {
    window.location.reload();
    return null;
  }

  return (
    <html lang="ru">
      <body>
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2a2540', marginBottom: 8 }}>
            Что-то пошло не так
          </h2>
          <p style={{ fontSize: 14, color: '#9a96a8', marginBottom: 24, maxWidth: 280 }}>
            Произошла ошибка при загрузке страницы.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #9c5e6c, #7a3848)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Обновить страницу
          </button>
        </div>
      </body>
    </html>
  );
}
