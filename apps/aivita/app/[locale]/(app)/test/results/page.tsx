import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { HealthScoreCircle } from '@/components/shared/health-score-circle';

const SYSTEMS = [
  { emoji: '❤️', name: 'Сердце и сосуды', score: 82, barColor: 'bg-emerald-400' },
  { emoji: '🍃', name: 'ЖКТ и питание', score: 68, barColor: 'bg-orange-400' },
  { emoji: '🌙', name: 'Сон и восстановление', score: 59, barColor: 'bg-pink-400' },
  { emoji: '🧠', name: 'Психо и стресс', score: 54, barColor: 'bg-pink-400' },
  { emoji: '💪', name: 'Опорно-двигательная', score: 81, barColor: 'bg-emerald-400' },
];

export default function TestResultsPage() {
  const total = Math.round(SYSTEMS.reduce((s, sys) => s + sys.score, 0) / SYSTEMS.length);

  return (
    <div className="min-h-screen">
      <AppHeader name="Результаты апреля" />

      <div className="px-5 space-y-4 pb-6">
        {/* Header */}
        <div className="text-center pt-2">
          <span className="text-3xl mb-2 inline-block">🎉</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
            ГОТОВО · АПРЕЛЬ
          </p>
          <h3 className="text-2xl font-semibold text-navy">
            Твой обновлённый{' '}
            <em className="font-serif italic font-normal text-pink-500">Health Score</em>
          </h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-1">5 систем за 8 минут</p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center">
          <HealthScoreCircle score={total} size={180} animate={true} strokeWidth={8} />
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium border border-emerald-100">
              ↑ +4 vs март
            </span>
          </div>
        </div>

        {/* Systems breakdown */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft space-y-4">
          {SYSTEMS.map((sys) => (
            <div key={sys.name} className="flex items-center gap-3">
              <span className="text-xl w-6 text-center">{sys.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-navy">{sys.name}</span>
                  <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">{sys.score}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sys.barColor} rounded-full transition-all`}
                    style={{ width: `${sys.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Share */}
        <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-3xl border border-[rgba(236,72,153,0.1)] p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-navy leading-relaxed">
                Поделись результатом с друзьями — пусть тоже узнают свой{' '}
                <em className="font-serif italic text-pink-500 not-italic">Health Score</em>
              </p>
              <Link
                href="/test/results/share"
                className="inline-flex items-center gap-1 mt-2 text-xs text-pink-500 font-semibold hover:text-pink-600"
              >
                Поделиться →
              </Link>
            </div>
          </div>
        </div>

        <Link
          href="/home"
          className="w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
