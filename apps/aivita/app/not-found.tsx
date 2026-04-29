import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="ru">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '6rem', fontWeight: 300, margin: 0, color: '#0a1929' }}>404</h1>
          <p style={{ color: '#4a6378', marginBottom: '2rem' }}>Страница не найдена</p>
          <Link href="/" style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #d4849a, #7ab5d4)', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 600 }}>
            На главную
          </Link>
        </div>
      </body>
    </html>
  );
}
