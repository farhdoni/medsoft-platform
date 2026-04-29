import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-base flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center mx-auto mb-6 shadow-soft">
          <WifiOff className="w-8 h-8 text-[rgb(var(--medical-blue))]" />
        </div>
        <h1 className="text-2xl font-semibold text-navy mb-2">Нет подключения</h1>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-8">
          Проверьте соединение с интернетом и попробуйте снова.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-pink-blue-mint text-white font-semibold rounded-2xl shadow-pink text-sm"
        >
          Попробовать снова
        </Link>
      </div>
    </div>
  );
}
