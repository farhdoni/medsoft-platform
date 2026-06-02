'use client';

// Global error boundary — catches unhandled React errors so the user
// sees a friendly recovery UI instead of a blank/white page.
// NO auto-reload: calling window.location.reload() during render or in
// a useEffect without a stable guard causes infinite reload loops.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{
                background: '#f4f3ef',
                color: '#9c5e6c',
                border: '1.5px solid #9c5e6c',
                borderRadius: 14,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
            <button
              onClick={() => { window.location.href = '/ru/home'; }}
              style={{
                background: 'linear-gradient(135deg, #9c5e6c, #7a3848)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              На главную
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
