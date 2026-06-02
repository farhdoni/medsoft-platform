'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { PlanLimitModal } from '@/components/shared/PlanLimitModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CheckupSystem {
  name: string; icon: string; score: number;
  status: 'green' | 'yellow' | 'red'; details: string;
}
interface CheckupProblem {
  severity: 'red' | 'yellow'; title: string; description: string;
  recommendation: string; doctorType?: string;
}
interface CheckupPlanItem { day: number; task: string; category: string; }
interface CheckupResult {
  id: string;
  bioAge: number; chronoAge: number; healthScore: number;
  systems: CheckupSystem[]; problems: CheckupProblem[];
  plan: CheckupPlanItem[]; summary: string;
  createdAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  { label: 'Анализирую сердечно-сосудистую систему…', icon: '❤️' },
  { label: 'Оцениваю метаболизм…',                   icon: '🔥' },
  { label: 'Проверяю иммунитет…',                    icon: '🛡️' },
  { label: 'Анализирую нервную систему…',             icon: '🧠' },
  { label: 'Оцениваю опорно-двигательный аппарат…',  icon: '🦴' },
  { label: 'Формирую персональный отчёт…',            icon: '📋' },
];

const DATA_SOURCES = [
  { icon: '💓', label: 'Биометрия за 30 дней',  sub: 'пульс, давление, сон, шаги' },
  { icon: '🏥', label: 'Профиль здоровья',       sub: 'возраст, пол, ИМТ, образ жизни' },
  { icon: '💊', label: 'Активные лекарства',     sub: 'взаимодействия и побочные эффекты' },
  { icon: '🧬', label: 'Хронические заболевания',sub: 'аллергии и история болезней' },
  { icon: '🤖', label: 'Claude AI (claude-sonnet-4-5)', sub: 'медицинский анализ' },
];

const SYSTEMS_CHECK = [
  { icon: '❤️', label: 'Сердечно-сосудистая' },
  { icon: '🔥', label: 'Метаболизм' },
  { icon: '🛡️', label: 'Иммунитет' },
  { icon: '🧠', label: 'Нервная система' },
  { icon: '🦴', label: 'Опорно-двигательная' },
];

const CATEGORY_COLORS: Record<string, string> = {
  heart:    '#fee2e2', activity: '#dcfce7', nutrition: '#fef9c3',
  metrics:  '#e0e7ff', doctor:   '#fce7f3', review:    '#f3e8ff',
  checkup:  '#dbeeff', default:  '#f4f3ef',
};
const CATEGORY_ICONS: Record<string, string> = {
  heart:    '❤️', activity: '🏃', nutrition: '🥗',
  metrics:  '📊', doctor:   '👨‍⚕️', review:   '✅',
  checkup:  '🧬', default:  '📌',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 76) return '#3a7a4a';
  if (s >= 51) return '#856404';
  return '#8a3a3a';
}
function scoreBg(s: number): string {
  if (s >= 76) return '#d4e8d8';
  if (s >= 51) return '#fff3cd';
  return '#fde8e8';
}
function statusColor(st: string) {
  if (st === 'green')  return { color: '#3a7a4a', bg: '#d4e8d8' };
  if (st === 'yellow') return { color: '#856404', bg: '#fff3cd' };
  return { color: '#8a3a3a', bg: '#fde8e8' };
}

// ─── Score Ring SVG ────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e4dc" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
    </svg>
  );
}

// ─── System Card ───────────────────────────────────────────────────────────────

function SystemCard({ sys }: { sys: CheckupSystem }) {
  const { color, bg } = statusColor(sys.status);
  return (
    <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{sys.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold truncate" style={{ color: '#2a2540' }}>{sys.name}</p>
            <span className="text-[12px] font-extrabold flex-shrink-0" style={{ color }}>{sys.score}</span>
          </div>
          {/* Score bar */}
          <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: '#f4f3ef' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${sys.score}%`, background: color }}
            />
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed px-1 py-1 rounded-xl" style={{ color, background: bg }}>
        {sys.details}
      </p>
    </div>
  );
}

// ─── Problem Card ──────────────────────────────────────────────────────────────

function ProblemCard({ p, locale }: { p: CheckupProblem; locale: string }) {
  const isRed = p.severity === 'red';
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: isRed ? '#fde8e8' : '#fff3cd',
        border: `1px solid ${isRed ? '#fca5a5' : '#fde68a'}`,
      }}
    >
      <div className="flex items-start gap-2 mb-1">
        <span className="text-lg flex-shrink-0 mt-0.5">{isRed ? '🔴' : '🟡'}</span>
        <p className="text-[13px] font-bold" style={{ color: isRed ? '#8a3a3a' : '#856404' }}>{p.title}</p>
      </div>
      <p className="text-[12px] mb-2 pl-6" style={{ color: isRed ? '#8a3a3a' : '#856404' }}>{p.description}</p>
      <div className="pl-6 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold" style={{ color: isRed ? '#7a2a2a' : '#6d5004' }}>
          💡 {p.recommendation}
        </p>
        {isRed && p.doctorType && (
          <a
            href={`/${locale}/doctors?speciality=${encodeURIComponent(p.doctorType)}`}
            className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition hover:opacity-80"
            style={{ background: '#8a3a3a', color: '#fff' }}
          >
            Найти врача
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Plan Section ──────────────────────────────────────────────────────────────

function PlanSection({ plan }: { plan: CheckupPlanItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const first7 = plan.filter(p => p.day <= 7);
  const rest = plan.filter(p => p.day > 7);
  const visible = expanded ? plan : first7;

  return (
    <div>
      {visible.map((item, i) => {
        const bg = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.default;
        const icon = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.default;
        return (
          <div key={i} className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: bg }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: '#2a2540' }}>{item.task}</p>
              <p className="text-[10px]" style={{ color: '#9a96a8' }}>День {item.day}</p>
            </div>
          </div>
        );
      })}

      {rest.length > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl mt-1 text-[12px] font-semibold transition hover:opacity-80"
          style={{ background: '#f4f3ef', color: '#6a6580' }}
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Свернуть</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Показать ещё {rest.length} дней</>}
        </button>
      )}
    </div>
  );
}

// ─── Screen 1: Start ───────────────────────────────────────────────────────────

function StartScreen({ onStart, locale }: { onStart: () => void; locale: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f4f3ef' }}>
      {/* Hero */}
      <div
        className="px-5 pt-12 pb-8 relative"
        style={{ background: 'linear-gradient(145deg, #9c5e6c 0%, #6a5a8e 100%)' }}
      >
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          aria-label="Назад"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="text-center">
          <div className="text-5xl mb-3">🧬</div>
          <h1 className="text-[24px] font-extrabold text-white mb-2">AI Чекап здоровья</h1>
          <p className="text-[13px] text-white/80 leading-relaxed max-w-[280px] mx-auto">
            Полный анализ всех ваших показателей за 30 секунд
          </p>
        </div>

        {/* System icons */}
        <div className="flex justify-center gap-3 mt-6">
          {SYSTEMS_CHECK.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {s.icon}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32 space-y-4">
        {/* What gets checked */}
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
          <p className="text-[13px] font-bold mb-3" style={{ color: '#2a2540' }}>Что будет проверено</p>
          <div className="space-y-2">
            {SYSTEMS_CHECK.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-lg w-6">{s.icon}</span>
                <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>{s.label}</p>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0d4dc', color: '#9c5e6c' }}>
                  AI
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data sources */}
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
          <p className="text-[13px] font-bold mb-3" style={{ color: '#2a2540' }}>На основе ваших данных</p>
          <div className="space-y-2.5">
            {DATA_SOURCES.map(d => (
              <div key={d.label} className="flex items-start gap-2.5">
                <span className="text-base flex-shrink-0 mt-0.5">{d.icon}</span>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: '#2a2540' }}>{d.label}</p>
                  <p className="text-[10px]" style={{ color: '#9a96a8' }}>{d.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] leading-relaxed text-center px-4" style={{ color: '#b0a8c0' }}>
          ⚠️ Результаты носят информационный характер и не заменяют консультацию врача
        </p>
      </div>

      {/* CTA */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, #f4f3ef 70%, transparent)' }}
      >
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl text-[16px] font-extrabold text-white transition active:scale-95 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #6a5a8e 100%)' }}
        >
          🧬 Начать чекап →
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: Analysis ────────────────────────────────────────────────────────

function AnalysisScreen({ onDone, onLimitReached }: { onDone: (result: CheckupResult) => void; onLimitReached: () => void }) {
  const [step, setStep]         = useState(0);
  const [progress, setProgress] = useState(0);
  const resultRef               = useRef<CheckupResult | null>(null);
  const doneFiredRef            = useRef(false);

  // Start API call immediately
  useEffect(() => {
    fetch('/api/proxy/checkup/run', { method: 'POST' })
      .then(async r => {
        if (r.status === 429) {
          const body = await r.json().catch(() => ({})) as { error?: string };
          if (body.error === 'plan_limit') { onLimitReached(); return; }
        }
        return r.json();
      })
      .then((json?: { data?: CheckupResult }) => {
        if (json?.data) resultRef.current = json.data;
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fake progress tick
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + (resultRef.current ? 8 : 2);

        // Advance step
        setStep(Math.min(Math.floor((next / 100) * ANALYSIS_STEPS.length), ANALYSIS_STEPS.length - 1));

        if (next >= 100 && !doneFiredRef.current) {
          doneFiredRef.current = true;
          clearInterval(timer);
          if (resultRef.current) {
            setTimeout(() => onDone(resultRef.current!), 400);
          } else {
            // Wait for result (up to 20s extra)
            const wait = setInterval(() => {
              if (resultRef.current) {
                clearInterval(wait);
                setTimeout(() => onDone(resultRef.current!), 400);
              }
            }, 300);
          }
          return 100;
        }
        return Math.min(next, resultRef.current ? 99 : 85);
      });
    }, 180);
    return () => clearInterval(timer);
  }, [onDone]);

  const size = 140;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (progress / 100) * circ;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: '#f4f3ef' }}
    >
      {/* Ring */}
      <div className="relative mb-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e4dc" strokeWidth={10} />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke="url(#analysisGrad)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.18s linear' }}
          />
          <defs>
            <linearGradient id="analysisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#9c5e6c" />
              <stop offset="100%" stopColor="#6a5a8e" />
            </linearGradient>
          </defs>
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[28px] font-extrabold"
          style={{ color: '#2a2540' }}
        >
          {Math.round(progress)}%
        </div>
      </div>

      {/* Step icons */}
      <div className="flex gap-3 mb-6">
        {ANALYSIS_STEPS.slice(0, 5).map((s, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all duration-300"
            style={{
              background: i <= step ? 'linear-gradient(135deg, #9c5e6c, #6a5a8e)' : '#e8e4dc',
              transform: i === step ? 'scale(1.18)' : 'scale(1)',
              boxShadow: i === step ? '0 4px 12px rgba(156,94,108,0.4)' : 'none',
            }}
          >
            <span style={{ filter: i <= step ? 'none' : 'grayscale(1)' }}>
              {s.icon}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[14px] font-semibold mb-1" style={{ color: '#2a2540' }}>
        {ANALYSIS_STEPS[step]?.label}
      </p>
      <p className="text-[12px]" style={{ color: '#9a96a8' }}>
        Персональный AI-анализ ваших данных
      </p>
    </div>
  );
}

// ─── Screen 3: Result ──────────────────────────────────────────────────────────

function ResultScreen({ result, locale }: { result: CheckupResult; locale: string }) {
  const router = useRouter();
  const ageDiff = result.chronoAge - result.bioAge;
  const agePositive = ageDiff > 0;

  return (
    <div style={{ background: '#f4f3ef' }}>
      {/* Actions row — replaces the removed header (back via TopBar logo, kept print/share) */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>AI Чекап</p>
          <p className="text-[11px]" style={{ color: '#9a96a8' }}>
            {new Date(result.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#f4f3ef' }} aria-label="Распечатать PDF">
            <Download className="w-4 h-4" style={{ color: '#6a6580' }} />
          </button>
          <button onClick={() => { if (navigator.share) void navigator.share({ title: 'AI Чекап AIVITA', url: window.location.href }); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#f4f3ef' }} aria-label="Поделиться">
            <Share2 className="w-4 h-4" style={{ color: '#6a6580' }} />
          </button>
        </div>
      </div>

      <div className="space-y-4" id="report-content">

        {/* Summary card */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(145deg, #9c5e6c 0%, #6a5a8e 100%)' }}
        >
          <p className="text-[11px] text-white/70 mb-1 font-medium">Биологический возраст</p>
          <div className="flex items-end gap-3">
            <p className="text-[42px] font-extrabold text-white leading-none">{result.bioAge}</p>
            <div className="pb-1">
              <p className="text-[14px] text-white font-semibold">лет</p>
              {ageDiff !== 0 && (
                <p
                  className="text-[12px] font-bold"
                  style={{ color: agePositive ? '#86efac' : '#fca5a5' }}
                >
                  {agePositive ? `▼ на ${ageDiff} ${ageDiff === 1 ? 'год' : 'года'} моложе` : `▲ на ${Math.abs(ageDiff)} лет старше`}
                </p>
              )}
            </div>
            <div className="ml-auto relative">
              <ScoreRing score={result.healthScore} size={88} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[18px] font-extrabold text-white leading-none">{result.healthScore}</p>
                  <p className="text-[8px] text-white/70">score</p>
                </div>
              </div>
            </div>
          </div>

          {result.summary && (
            <p className="text-[12px] text-white/80 mt-3 leading-relaxed border-t border-white/20 pt-3">
              {result.summary}
            </p>
          )}
        </div>

        {/* Overall status badge */}
        {(() => {
          const reds = result.problems?.filter(p => p.severity === 'red').length ?? 0;
          const score = result.healthScore ?? 0;
          if (reds > 0 || score < 50) {
            return (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fde8e8', border: '1px solid #fca5a5' }}>
                <span className="text-2xl">🔴</span>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: '#8a3a3a' }}>Требует внимания</p>
                  <p className="text-[11px]" style={{ color: '#8a3a3a' }}>Обнаружены проблемы, требующие консультации врача</p>
                </div>
              </div>
            );
          }
          if (score < 76) {
            return (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff3cd', border: '1px solid #fde68a' }}>
                <span className="text-2xl">🟡</span>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: '#856404' }}>Есть зоны роста</p>
                  <p className="text-[11px]" style={{ color: '#856404' }}>Следуйте рекомендациям для улучшения здоровья</p>
                </div>
              </div>
            );
          }
          return (
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#d4e8d8', border: '1px solid #86efac' }}>
              <span className="text-2xl">🟢</span>
              <div>
                <p className="text-[13px] font-bold" style={{ color: '#3a7a4a' }}>Отличное здоровье!</p>
                <p className="text-[11px]" style={{ color: '#3a7a4a' }}>Поддерживайте текущий образ жизни</p>
              </div>
            </div>
          );
        })()}

        {/* Systems */}
        {result.systems?.length > 0 && (
          <div>
            <p className="text-[13px] font-bold mb-3 px-1" style={{ color: '#2a2540' }}>Системы организма</p>
            <div className="space-y-2">
              {result.systems.map((sys, i) => <SystemCard key={i} sys={sys} />)}
            </div>
          </div>
        )}

        {/* Problems */}
        {result.problems?.length > 0 && (
          <div>
            <p className="text-[13px] font-bold mb-3 px-1" style={{ color: '#2a2540' }}>
              Выявленные проблемы
            </p>
            <div className="space-y-2">
              {result.problems.map((p, i) => <ProblemCard key={i} p={p} locale={locale} />)}
            </div>
          </div>
        )}

        {/* 30-day plan */}
        {result.plan?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
            <p className="text-[13px] font-bold mb-3" style={{ color: '#2a2540' }}>📅 30-дневный план</p>
            <PlanSection plan={result.plan} />
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold transition hover:opacity-80"
            style={{ background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }}
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => {
              if (navigator.share) void navigator.share({ title: 'AI Чекап AIVITA', url: window.location.href });
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold transition hover:opacity-80"
            style={{ background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }}
          >
            <Share2 className="w-4 h-4" />
            Поделиться
          </button>
        </div>

        <button
          onClick={() => router.push(`/${locale}/ai-checkup`)}
          className="w-full py-3 rounded-2xl text-[13px] font-bold transition hover:opacity-80 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #6a5a8e 100%)', color: '#fff' }}
        >
          🧬 Повторный чекап
        </button>
      </div>

    </div>
  );
}

// ─── Main Orchestrator ─────────────────────────────────────────────────────────

type Screen = 'start' | 'analysis' | 'result';

export function CheckupClient({ locale }: { locale: string }) {
  const [screen, setScreen] = useState<Screen>('start');
  const [result, setResult] = useState<CheckupResult | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const handleDone = useCallback((r: CheckupResult) => {
    setResult(r);
    setScreen('result');
  }, []);

  const handleLimitReached = useCallback(() => {
    setScreen('start');
    setShowLimitModal(true);
  }, []);

  return (
    <>
      <PlanLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        locale={locale}
        type="checkup"
      />
      {screen === 'start' && <StartScreen onStart={() => setScreen('analysis')} locale={locale} />}
      {screen === 'analysis' && <AnalysisScreen onDone={handleDone} onLimitReached={handleLimitReached} />}
      {screen === 'result' && result && <ResultScreen result={result} locale={locale} />}
    </>
  );
}
