import { OrbBackground } from '@/components/shared/orb-background';
import { HealthScoreCircle } from '@/components/shared/health-score-circle';
import { completeOnboarding } from './actions';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OnboardingResultPage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-10 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
        {/* Sparkle */}
        <span className="text-4xl mb-4">✨</span>

        {/* Label */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2">ГОТОВО!</p>
        <h3 className="text-2xl font-semibold text-navy mb-6">
          Твой{' '}
          <em className="font-serif italic font-normal text-pink-500">Health Score</em>
        </h3>

        {/* Big score circle */}
        <div className="mb-4">
          <HealthScoreCircle score={72} size={160} animate={true} strokeWidth={8} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="bg-white/70 backdrop-blur rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 text-center">
            <p className="text-xs text-[rgb(var(--text-secondary))] mb-1">Возраст</p>
            <p className="font-semibold text-navy">32 года</p>
          </div>
          <div className="bg-white/70 backdrop-blur rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 text-center">
            <p className="text-xs text-[rgb(var(--text-secondary))] mb-1">Здоровье</p>
            <p className="font-semibold text-emerald-600 italic font-serif">36 лет</p>
          </div>
        </div>

        {/* Growth zone card */}
        <div className="w-full bg-gradient-to-br from-pink-50 to-blue-50 rounded-3xl border border-[rgba(236,72,153,0.12)] p-5 mb-8 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-700 mb-2">
            ГЛАВНАЯ ЗОНА РОСТА
          </p>
          <p className="text-sm text-navy font-medium">
            Сон и стресс. <span className="font-normal text-[rgb(var(--text-secondary))]">Начнём с этого.</span>
          </p>
        </div>

        {/* CTA */}
        <form action={completeOnboarding.bind(null, locale)} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
          >
            Открыть приложение →
          </button>
        </form>
      </div>
    </div>
  );
}
