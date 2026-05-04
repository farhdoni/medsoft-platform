import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Скачать Aivita для Android',
  description: 'Скачай мобильное приложение Aivita для Android — Health Score, AI-ассистент, привычки и питание в кармане.',
};

const FEATURES = [
  { emoji: '📊', text: 'Health Score по 5 системам организма' },
  { emoji: '🤖', text: 'AI-ассистент отвечает на вопросы о здоровье' },
  { emoji: '✅', text: 'Трекинг привычек с напоминаниями' },
  { emoji: '🍽️', text: 'Дневник питания с КБЖУ' },
  { emoji: '👨‍👩‍👧', text: 'Семейный профиль здоровья' },
  { emoji: '📄', text: 'PDF-отчёт для врача' },
];

const APK_URL = process.env.ANDROID_APK_URL;

export default function GetAppPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f9f7f4 0%, #f5eaed 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            background: '#9c5e6c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 48,
          }}
        >
          🏥
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: '#9090a8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          МОБИЛЬНОЕ ПРИЛОЖЕНИЕ
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a2e', marginBottom: 12, lineHeight: 1.2 }}>
          Aivita для Android
        </h1>
        <p style={{ fontSize: 15, color: '#4a4a6a', lineHeight: 1.6, marginBottom: 32 }}>
          Твой пожизненный куратор здоровья — теперь в кармане
        </p>

        {/* Download button */}
        {APK_URL ? (
          <a
            href={APK_URL}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#9c5e6c',
              color: '#ffffff',
              padding: '16px 32px',
              borderRadius: 100,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            <span>⬇️</span>
            Скачать APK
          </a>
        ) : (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '20px 24px',
              marginBottom: 24,
              border: '1px solid #e8e4dc',
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
              ⏳ Скоро доступно
            </p>
            <p style={{ fontSize: 13, color: '#9090a8', lineHeight: 1.6 }}>
              Мы собираем первую версию APK. Зарегистрируйся на веб-версии — мы сообщим, когда приложение выйдет.
            </p>
          </div>
        )}

        {APK_URL && (
          <p style={{ fontSize: 12, color: '#9090a8', marginBottom: 32 }}>
            Android 10+  ·  ~25 MB  ·  Не требует Google Play
          </p>
        )}

        {/* Features */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '20px 24px',
            marginBottom: 24,
            border: '1px solid #e8e4dc',
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9090a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Что внутри
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f) => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{f.emoji}</span>
                <span style={{ fontSize: 14, color: '#1a1a2e' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Web fallback */}
        <p style={{ fontSize: 13, color: '#9090a8', marginBottom: 6 }}>
          Уже есть аккаунт?
        </p>
        <Link
          href="/home"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 100,
            background: '#f5eaed',
            color: '#9c5e6c',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Открыть веб-версию →
        </Link>
      </div>
    </main>
  );
}
