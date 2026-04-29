import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-base flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏥</div>
        <h1 className="text-3xl font-light tracking-tightest text-navy mb-3">
          Добро пожаловать в <em className="font-serif italic font-normal text-pink-500 not-italic">aivita</em>
        </h1>
        <p className="text-[rgb(var(--text-secondary))] mb-8">Приложение в разработке. Здесь скоро появится ваш Health Score, AI-помощник и трекинг привычек.</p>
        <Link href="/" className="inline-block px-6 py-3 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink text-sm">
          ← На главную
        </Link>
      </div>
    </div>
  );
}
