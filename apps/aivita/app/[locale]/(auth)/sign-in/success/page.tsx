import Link from 'next/link';
import { OrbBackground } from '@/components/shared/orb-background';

export default function SignInSuccessPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Check circle */}
        <div className="relative mx-auto mb-8" style={{ width: 140, height: 140 }}>
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-emerald-400 to-mint flex items-center justify-center shadow-mint mx-auto">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* Glow rings */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-300/30 scale-110" />
          <div className="absolute inset-0 rounded-full border border-emerald-300/20 scale-125" />
        </div>

        <h2 className="text-2xl font-semibold text-navy mb-2">
          Добро пожаловать в{' '}
          <em className="font-serif italic font-normal text-pink-500">aivita</em>
        </h2>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-8">
          Аккаунт создан! Теперь заполним профиль здоровья — займёт 2 минуты
        </p>

        {/* What you get card */}
        <div className="bg-gradient-to-br from-pink-50 to-blue-50 rounded-3xl border border-[rgba(236,72,153,0.1)] p-6 mb-8 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-700 mb-4">
            ЧТО ТЫ ПОЛУЧАЕШЬ
          </p>
          <ul className="space-y-3">
            {[
              'Health Score за 3 минуты',
              'AI-помощник 24/7',
              'Цифровой паспорт здоровья',
              'Ранний доступ к MedSoft',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-navy">
                <div className="w-5 h-5 rounded-full bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="./welcome"
          className="w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
        >
          Продолжить →
        </Link>
      </div>
    </div>
  );
}
