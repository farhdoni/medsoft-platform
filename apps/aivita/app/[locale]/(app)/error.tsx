'use client';

// Cabinet error boundary — catches client-side errors without auto-reloading.
// Previous version had window.location.reload() in useEffect which caused
// infinite reload loops whenever React #482 fired on page load.
export default function CabinetError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '60vh',
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
      <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#2a2540', marginBottom: 8 }}>
        Не удалось загрузить страницу
      </p>
      <p style={{ fontSize: 13, color: '#9a96a8', marginBottom: 20 }}>
        Попробуйте обновить или вернуться на главную
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={reset}
          style={{
            background: '#f4f3ef',
            color: '#9c5e6c',
            border: '1.5px solid #9c5e6c',
            borderRadius: 12,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Повторить
        </button>
        <button
          onClick={() => { window.location.href = '/ru/home'; }}
          style={{
            background: '#9c5e6c',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          На главную
        </button>
      </div>
    </div>
  );
}
