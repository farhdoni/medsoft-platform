import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import type { IconName } from '@/components/cabinet/icons/Icon';
import { loadTestData } from './data';
import type { HealthScoreRecord } from './data';

// ─── Static config ──────────────────────────────────────────────────────────

const SYSTEMS: Array<{
  id: string;
  scoreKey: keyof HealthScoreRecord;
  name: string;
  desc: string;
  questionCount: number;
  icon: IconName;
  softBg: string;
  accentText: string;
  accentHex: string;
}> = [
  {
    id: 'cardiovascular',
    scoreKey: 'cardiovascularScore',
    name: 'Сердце и сосуды',
    desc: 'Пульс, давление, нагрузки',
    questionCount: 6,
    icon: 'heart',
    softBg: 'bg-bg-soft-pink',
    accentText: 'text-accent-rose',
    accentHex: '#9c5e6c',
  },
  {
    id: 'digestive',
    scoreKey: 'digestiveScore',
    name: 'ЖКТ и питание',
    desc: 'Пищеварение, рацион',
    questionCount: 5,
    icon: 'food',
    softBg: 'bg-bg-soft-mint',
    accentText: 'text-accent-mint-deep',
    accentHex: '#548068',
  },
  {
    id: 'sleep',
    scoreKey: 'sleepScore',
    name: 'Сон и восстановление',
    desc: 'Качество сна, режим',
    questionCount: 5,
    icon: 'bell',
    softBg: 'bg-bg-soft-purple',
    accentText: 'text-accent-purple-deep',
    accentHex: '#6e5fa0',
  },
  {
    id: 'mental',
    scoreKey: 'mentalScore',
    name: 'Психо и стресс',
    desc: 'Тревога, настроение',
    questionCount: 4,
    icon: 'doctor',
    softBg: 'bg-bg-soft-blue',
    accentText: 'text-accent-blue-deep',
    accentHex: '#5e75a8',
  },
  {
    id: 'musculoskeletal',
    scoreKey: 'musculoskeletalScore',
    name: 'Опорно-двигательная',
    desc: 'Активность, мышцы',
    questionCount: 4,
    icon: 'steps',
    softBg: 'bg-bg-soft-sage',
    accentText: 'text-accent-sage-deep',
    accentHex: '#688844',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreLabel(n: number) {
  if (n >= 80) return 'отлично';
  if (n >= 65) return 'хорошо';
  if (n >= 50) return 'норма';
  return 'требует внимания';
}

function scoreColor(n: number) {
  if (n >= 80) return '#548068';
  if (n >= 65) return '#9889c4';
  if (n >= 50) return '#8aa1cc';
  return '#cc8a96';
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long' });
}

// ─── Ring SVG ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 110 }: { score: number; size?: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="white" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-extrabold text-white leading-none">{score}</span>
        <span className="text-[10px] text-white/60">/100</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { hasScore, score, history } = await loadTestData();

  return (
    <PageShell active="test" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── State A: no test result ─────────────────────────────────────── */}
        {!hasScore && (
          <>
            {/* Hero */}
            <section className="rounded-hero bg-hero-gradient p-6 mb-5 flex items-center gap-5">
              <div className="flex-shrink-0">
                <Icon name="test" size={56} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
                  ИНДЕКС ЗДОРОВЬЯ
                </p>
                <h2 className="text-[20px] font-bold text-white leading-snug mb-1.5">
                  Узнай свой Health Score
                </h2>
                <p className="text-[12px] text-white/75 mb-4">
                  Тест 5 систем — ~7 минут. Результат сразу.
                </p>
                <Link
                  href={`/${locale}/test/cardiovascular`}
                  className="inline-flex items-center gap-2 rounded-chip bg-white/20 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/30 transition-colors"
                >
                  Начать тест →
                </Link>
              </div>
            </section>

            {/* 5 system cards */}
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
              Что входит в тест
            </p>
            <div className="space-y-2.5">
              {SYSTEMS.map((sys) => (
                <Link
                  key={sys.id}
                  href={`/${locale}/test/${sys.id}`}
                  className="flex items-center gap-4 p-4 rounded-card bg-white border border-border-soft hover:bg-bg-app transition-colors"
                >
                  <div className={`w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center ${sys.softBg}`}>
                    <Icon name={sys.icon} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary">{sys.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {sys.desc} · {sys.questionCount} вопросов
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── State B: has test result ─────────────────────────────────────── */}
        {hasScore && score && (
          <>
            {/* Hero with score ring */}
            <section className="rounded-hero bg-hero-gradient p-6 mb-5">
              <div className="flex items-center gap-6">
                <ScoreRing score={score.totalScore} size={110} />
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
                    HEALTH INDEX
                  </p>
                  <p className="text-[22px] font-extrabold text-white leading-tight">
                    {scoreLabel(score.totalScore)}
                  </p>
                  <p className="text-[12px] text-white/70 mt-1">
                    Тест: {relativeDate(score.calculatedAt)}
                  </p>
                  <Link
                    href={`/${locale}/test/cardiovascular`}
                    className="inline-flex items-center gap-1.5 mt-3 rounded-chip bg-white/20 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-white/30 transition-colors"
                  >
                    Пройти заново →
                  </Link>
                </div>
              </div>
            </section>

            {/* Breakdown */}
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
              По системам
            </p>
            <div className="space-y-2 mb-5">
              {SYSTEMS.map((sys) => {
                const sysScore = score[sys.scoreKey] as number | null;
                return (
                  <div
                    key={sys.id}
                    className="flex items-center gap-4 p-4 rounded-card bg-white border border-border-soft"
                  >
                    <div className={`w-10 h-10 rounded-[12px] flex-shrink-0 flex items-center justify-center ${sys.softBg}`}>
                      <Icon name={sys.icon} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[13px] font-semibold text-text-primary">{sys.name}</p>
                        <p
                          className="text-[13px] font-bold flex-shrink-0"
                          style={{ color: sysScore != null ? scoreColor(sysScore) : '#9a96a8' }}
                        >
                          {sysScore ?? '—'}
                        </p>
                      </div>
                      {sysScore != null && (
                        <div className="h-1.5 rounded-full overflow-hidden bg-bg-soft-purple">
                          <div
                            className="h-full rounded-full bg-gradient-pink-purple"
                            style={{ width: `${sysScore}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
                  Предыдущие тесты
                </p>
                <div className="space-y-2">
                  {history.map((h) => {
                    const delta = score.totalScore - h.totalScore;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-3.5 rounded-card bg-white border border-border-soft"
                      >
                        <p className="text-[13px] text-text-secondary">
                          {relativeDate(h.calculatedAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-text-primary">
                            {h.totalScore}
                          </span>
                          {delta !== 0 && (
                            <span
                              className={`text-[11px] font-semibold ${delta > 0 ? 'text-accent-mint-deep' : 'text-accent-rose'}`}
                            >
                              {delta > 0 ? `↑ +${delta}` : `↓ ${Math.abs(delta)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
