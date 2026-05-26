'use client';

import { useState } from 'react';
import type { HealthAnalysisData } from './page';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  low:      { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  medium:   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

const PROB_LABELS: Record<string, string> = {
  low: 'Низкая', medium: 'Средняя', high: 'Высокая',
};

function ScoreRing({ score }: { score: number }) {
  const size = 160;
  const r = 64;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' :
    '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={14} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={14}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: -size / 2 - 20 }}>
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function ScoreRingStacked({ score }: { score: number }) {
  const size = 160;
  const r = 64;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' :
    '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={14} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={14}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

export function HealthAnalysisClient({ initialAnalysis }: { initialAnalysis: HealthAnalysisData | null }) {
  const [analysis, setAnalysis] = useState<HealthAnalysisData | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'problems' | 'risks' | 'plan'>('problems');
  const [progress, setProgress] = useState<Record<string, boolean>>(initialAnalysis?.planProgress ?? {});

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/health-analysis/run', { method: 'POST' });
      const json = await res.json() as { data?: HealthAnalysisData };
      if (json.data) {
        setAnalysis(json.data);
        setProgress(json.data.planProgress ?? {});
      }
    } finally {
      setLoading(false);
    }
  }

  async function togglePlanItem(key: string) {
    if (!analysis) return;
    const updated = { ...progress, [key]: !progress[key] };
    setProgress(updated);
    await fetch(`/api/proxy/health-analysis/${analysis.id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: { [key]: updated[key] } }),
    }).catch(() => {});
  }

  const score = analysis?.healthScore ?? null;
  const scoreLabel =
    score === null ? '' :
    score >= 80 ? 'Отличное здоровье' :
    score >= 60 ? 'Хорошее здоровье' :
    score >= 40 ? 'Требует внимания' :
    'Критическое состояние';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI-анализ здоровья</h1>
          {analysis && (
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(analysis.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity"
          style={{ background: 'var(--accent)', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 1018.364 5"/>
            </svg>
          )}
          {loading ? 'Анализирую...' : analysis ? 'Обновить' : 'Запустить анализ'}
        </button>
      </div>

      {/* No analysis yet */}
      {!analysis && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-4">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Нет данных для анализа</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            Нажмите «Запустить анализ», чтобы AI-врач проанализировал ваши данные и создал персональный план здоровья.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.067L19.5 14.5M14.25 3.104c.251.023.501.05.75.082M19.5 14.5l-1.5 5.243a2.25 2.25 0 01-2.156 1.632H8.156a2.25 2.25 0 01-2.156-1.632L4.5 14.5m15 0H4.5"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            AI-врач анализирует ваши данные здоровья. Это займёт 10-30 секунд...
          </p>
        </div>
      )}

      {/* Analysis result */}
      {analysis && !loading && (
        <>
          {/* Score card */}
          <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-6 text-white">
            <div className="flex items-center gap-6">
              <ScoreRingStacked score={analysis.healthScore ?? 0} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 mb-1">Индекс здоровья</p>
                <p className="text-xl font-bold">{scoreLabel}</p>
                {analysis.biologicalAge && (
                  <p className="text-sm text-white/80 mt-1">
                    Биологический возраст: <span className="font-semibold">{analysis.biologicalAge} лет</span>
                  </p>
                )}
                <p className="text-sm text-white/80 mt-2 leading-relaxed line-clamp-3">
                  {analysis.overallAssessment}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['problems', 'risks', 'plan'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                {tab === 'problems' ? `Проблемы (${analysis.currentProblems?.length ?? 0})` :
                 tab === 'risks' ? `Риски (${analysis.futureRisks?.length ?? 0})` :
                 'План на 30 дней'}
              </button>
            ))}
          </div>

          {/* Problems tab */}
          {activeTab === 'problems' && (
            <div className="space-y-3">
              {(analysis.currentProblems ?? []).length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Проблем не обнаружено 🎉</p>
              ) : (
                (analysis.currentProblems ?? []).map((p, i) => {
                  const colors = SEVERITY_COLORS[p.severity] ?? SEVERITY_COLORS.medium;
                  return (
                    <div key={i} className={`rounded-xl p-4 ${colors.bg}`}>
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className={`font-semibold text-sm ${colors.text}`}>{p.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border border-current/20`}>
                              {p.severity === 'low' ? 'Лёгкая' : p.severity === 'medium' ? 'Средняя' : p.severity === 'high' ? 'Высокая' : 'Критическая'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                          <p className="text-sm font-medium text-gray-700 mt-2">💡 {p.recommendation}</p>
                          {p.suggestedDoctor && (
                            <p className="text-xs text-gray-500 mt-1">👨‍⚕️ Рекомендуется: {p.suggestedDoctor}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Risks tab */}
          {activeTab === 'risks' && (
            <div className="space-y-3">
              {(analysis.futureRisks ?? []).length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Значимых рисков не выявлено ✅</p>
              ) : (
                (analysis.futureRisks ?? []).map((r, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm text-gray-900">{r.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        r.probability === 'high' ? 'bg-red-50 text-red-600' :
                        r.probability === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {PROB_LABELS[r.probability]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">📅 {r.timeframe}</p>
                    <p className="text-sm text-gray-600">{r.preventionPlan}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Plan tab */}
          {activeTab === 'plan' && analysis.healthPlan && (
            <div className="space-y-4">
              {/* Goals */}
              {analysis.healthPlan.goals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🎯 Цели на месяц</h3>
                  <div className="space-y-2">
                    {analysis.healthPlan.goals.map((g, i) => {
                      const key = `goal-${i}`;
                      const done = !!progress[key];
                      return (
                        <div key={i} className={`rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-colors ${done ? 'bg-green-50' : 'bg-gray-50'}`}
                          onClick={() => void togglePlanItem(key)}>
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${done ? 'bg-green-500' : 'border-2 border-gray-300'}`}>
                            {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>{g.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{g.metric}: {g.target}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily actions */}
              {analysis.healthPlan.dailyActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">📅 Ежедневно</h3>
                  <div className="space-y-2">
                    {analysis.healthPlan.dailyActions.map((a, i) => {
                      const key = `daily-${i}`;
                      const done = !!progress[key];
                      return (
                        <div key={i} className={`rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${done ? 'bg-green-50' : 'bg-gray-50'}`}
                          onClick={() => void togglePlanItem(key)}>
                          <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors ${done ? 'bg-green-500' : 'border-2 border-gray-300 rounded'}`}>
                            {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </div>
                          <p className={`text-sm ${done ? 'text-green-700 line-through' : 'text-gray-700'}`}>{a}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weekly actions */}
              {analysis.healthPlan.weeklyActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">📆 Еженедельно</h3>
                  <div className="space-y-2">
                    {analysis.healthPlan.weeklyActions.map((a, i) => (
                      <div key={i} className="rounded-xl px-4 py-2.5 flex items-center gap-3 bg-blue-50">
                        <span className="text-blue-400 flex-shrink-0">•</span>
                        <p className="text-sm text-blue-700">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly actions */}
              {analysis.healthPlan.monthlyActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🗓 Ежемесячно</h3>
                  <div className="space-y-2">
                    {analysis.healthPlan.monthlyActions.map((a, i) => (
                      <div key={i} className="rounded-xl px-4 py-2.5 flex items-center gap-3 bg-purple-50">
                        <span className="text-purple-400 flex-shrink-0">•</span>
                        <p className="text-sm text-purple-700">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan' && !analysis.healthPlan && (
            <p className="text-center text-sm text-gray-400 py-8">
              Личный план будет доступен после следующего анализа.
            </p>
          )}
        </>
      )}
    </div>
  );
}
