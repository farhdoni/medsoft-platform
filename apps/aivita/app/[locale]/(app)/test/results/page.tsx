import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { HealthScoreCircle } from '@/components/shared/health-score-circle';
import { loadTestData } from '../data';

const SYSTEMS = [
  { key: 'cardiovascularScore' as const, emoji: '❤️', name: 'Сердце и сосуды' },
  { key: 'digestiveScore'      as const, emoji: '🍃', name: 'ЖКТ и питание' },
  { key: 'sleepScore'          as const, emoji: '🌙', name: 'Сон и восстановление' },
  { key: 'mentalScore'         as const, emoji: '🧠', name: 'Психо и стресс' },
  { key: 'musculoskeletalScore'as const, emoji: '💪', name: 'Опорно-двигательная' },
];

function barColor(score: number | null) {
  if (score == null) return 'bg-gray-200';
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 65) return 'bg-blue-400';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-400';
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString('ru', { month: 'long', year: 'numeric' });
}

export default async function TestResultsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { hasScore, score, history } = await loadTestData();

  // No data yet — prompt to take the test
  if (!hasScore || !score) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <span className="text-4xl mb-4">🎯</span>
        <h3 className="text-xl font-semibold text-navy mb-2 text-center">Результатов пока нет</h3>
        <p className="text-sm text-[rgb(var(--text-muted))] mb-6 text-center">
          Пройди тест по всем 5 системам, чтобы увидеть свой Health Score.
        </p>
        <Link
          href={`/${locale}/test/cardiovascular`}
          className="w-full max-w-sm flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink text-sm"
        >
          Начать тест →
        </Link>
      </div>
    );
  }

  // Previous score for delta display
  const prevScore = history[0];
  const delta = prevScore ? score.totalScore - prevScore.totalScore : null;

  return (
    <div className="min-h-screen">
      <AppHeader name="Результаты теста" />

      <div className="px-5 space-y-4 pb-6">
        {/* Header */}
        <div className="text-center pt-2">
          <span className="text-3xl mb-2 inline-block">🎉</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
            ГОТОВО · {relativeDate(score.calculatedAt).toUpperCase()}
          </p>
          <h3 className="text-2xl font-semibold text-navy">
            Твой обновлённый{' '}
            <em className="font-serif italic font-normal text-pink-500">Health Score</em>
          </h3>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-1">5 систем</p>
        </div>

        {/* Score circle */}
        <div className="flex flex-col items-center">
          <HealthScoreCircle score={score.totalScore} size={180} animate={true} strokeWidth={8} />
          {delta !== null && (
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium border ${
                  delta >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}
              >
                {delta >= 0 ? `↑ +${delta}` : `↓ ${Math.abs(delta)}`} vs предыдущий
              </span>
            </div>
          )}
        </div>

        {/* Systems breakdown */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft space-y-4">
          {SYSTEMS.map((sys) => {
            const s = score[sys.key] as number | null;
            return (
              <div key={sys.key} className="flex items-center gap-3">
                <span className="text-xl w-6 text-center">{sys.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-navy">{sys.name}</span>
                    <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">
                      {s ?? '—'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor(s)} rounded-full transition-all`}
                      style={{ width: `${s ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-3">
              Предыдущие тесты
            </p>
            <div className="space-y-2">
              {history.map((h) => {
                const d = score.totalScore - h.totalScore;
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3.5 rounded-card bg-white border border-border-soft"
                  >
                    <p className="text-[13px] text-[rgb(var(--text-secondary))]">
                      {relativeDate(h.calculatedAt)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-navy">{h.totalScore}</span>
                      {d !== 0 && (
                        <span className={`text-[11px] font-semibold ${d > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {d > 0 ? `↑ +${d}` : `↓ ${Math.abs(d)}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-3xl border border-[rgba(236,72,153,0.1)] p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-navy leading-relaxed">
                Поделись результатом с друзьями — пусть тоже узнают свой{' '}
                <em className="font-serif italic text-pink-500">Health Score</em>
              </p>
              <Link
                href={`/${locale}/test/results/share`}
                className="inline-flex items-center gap-1 mt-2 text-xs text-pink-500 font-semibold hover:text-pink-600"
              >
                Поделиться →
              </Link>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/${locale}/test/cardiovascular`}
            className="flex-1 flex items-center justify-center h-12 border border-[rgba(120,160,200,0.3)] bg-white/70 text-navy font-semibold rounded-2xl text-sm hover:bg-white/90 transition-colors"
          >
            Пройти заново
          </Link>
          <Link
            href={`/${locale}/home`}
            className="flex-1 flex items-center justify-center h-12 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink text-sm"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
