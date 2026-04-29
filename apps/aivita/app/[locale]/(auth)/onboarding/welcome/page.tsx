import Link from 'next/link';
import { OrbBackground } from '@/components/shared/orb-background';

export default function OnboardingWelcomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-10 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">

        {/* Floating orb */}
        <div className="relative mb-10 animate-[drift-1_6s_ease-in-out_infinite]">
          <div className="w-52 h-52 rounded-full bg-gradient-to-br from-pink-400 via-blue-400 to-emerald-400 flex items-center justify-center shadow-pink-strong">
            {/* Inner glow */}
            <div className="w-44 h-44 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-6xl">💚</span>
            </div>
          </div>
          {/* Concentric rings */}
          <div className="absolute inset-0 rounded-full border border-pink-200/40 scale-110 animate-spin-slow" />
          <div className="absolute inset-0 rounded-full border border-blue-200/30 scale-125 animate-[spin_20s_linear_infinite_reverse]" />
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mb-8">
          <div className="h-2 w-8 rounded-full bg-gradient-pink-blue-mint" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-gray-200" />
          ))}
        </div>

        <h2 className="text-3xl font-semibold text-navy mb-3">
          Здоровье — это{' '}
          <em className="font-serif italic font-normal text-pink-500">не случайность</em>
        </h2>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-10 leading-relaxed">
          aivita показывает где ты сейчас, и направляет туда, где ты хочешь быть
        </p>

        <div className="w-full space-y-3">
          <Link
            href="../onboarding/age"
            className="w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
          >
            Начать →
          </Link>
          <Link
            href="../sign-in"
            className="w-full flex items-center justify-center h-12 text-[rgb(var(--text-secondary))] text-sm hover:text-navy transition-colors"
          >
            У меня уже есть аккаунт
          </Link>
        </div>
      </div>
    </div>
  );
}
