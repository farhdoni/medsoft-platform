/**
 * /home — Dashboard page.
 * Hero: purple gradient + AI search bar + compact health ring (right).
 * Metrics, Activity, Report: adapted from "готовый деплой" reference.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashIcon } from '@/components/cabinet/icons/DashIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

type Metrics = {
  heartRate: { bpm: number; deltaWeek: number };
  water: { liters: number; goalLiters: number };
  steps: { count: number; deltaPctWeek: number };
  habits: { completed: number; total: number };
  healthIndex: { score: number; label: string };
};

type ActivityPoint = {
  day: string;
  steps: number;
  km: number;
  sleepHours: number;
};

const DEFAULT_METRICS: Metrics = {
  heartRate: { bpm: 72, deltaWeek: 3 },
  water: { liters: 1.4, goalLiters: 2.0 },
  steps: { count: 8200, deltaPctWeek: 12 },
  habits: { completed: 2, total: 3 },
  healthIndex: { score: 76, label: 'хорошо' },
};

const DEFAULT_ACTIVITY: ActivityPoint[] = [
  { day: 'Пн', steps: 5400, km: 3.6, sleepHours: 7.2 },
  { day: 'Вт', steps: 7100, km: 4.7, sleepHours: 6.8 },
  { day: 'Ср', steps: 6200, km: 4.2, sleepHours: 7.5 },
  { day: 'Чт', steps: 8800, km: 5.9, sleepHours: 7.0 },
  { day: 'Пт', steps: 7600, km: 5.1, sleepHours: 6.5 },
  { day: 'Сб', steps: 9200, km: 6.2, sleepHours: 8.1 },
  { day: 'Вс', steps: 8200, km: 5.5, sleepHours: 7.8 },
];

const PROMPTS = ['Анализы', 'Сон', 'Питание', 'Тренировки'] as const;
type Metric = 'Шаги' | 'Км' | 'Сон';
const FIELD: Record<Metric, 'steps' | 'km' | 'sleepHours'> = {
  'Шаги': 'steps',
  'Км': 'km',
  'Сон': 'sleepHours',
};

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({ userName, metrics, locale }: { userName: string; metrics: Metrics; locale: string }) {
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? 'Доброй ночи' :
    hour < 12 ? 'Доброе утро' :
    hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const firstName = userName.split(' ')[0];

  function ask(q: string) {
    if (!q.trim() || submitting) return;
    setSubmitting(true);
    window.location.href = `/${locale}/chat?q=${encodeURIComponent(q)}`;
  }

  const score = metrics.healthIndex.score;
  const C = 2 * Math.PI * 56;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * C;

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-8 text-white"
      style={{ background: 'linear-gradient(135deg, #b89dc4 0%, #a890b8 45%, #957aaa 100%)' }}
    >
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">

        {/* LEFT: greeting + AI search + chips */}
        <div>
          <div className="text-[13px] font-medium opacity-85">
            {greeting}, {firstName}
          </div>
          <h1 className="mt-2 max-w-md text-[28px] font-bold leading-[1.15]">
            Чем сегодня помочь<br />твоему здоровью?
          </h1>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(question); }}
            className="mt-6 flex max-w-md items-center gap-2 rounded-full bg-white/95 p-1.5 pl-4"
            style={{ boxShadow: '0 4px 12px rgba(42,37,64,0.12)' }}
          >
            <span aria-hidden className="text-[18px]">💬</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Задай вопрос AI о здоровье…"
              className="flex-1 bg-transparent py-2 text-[14px] text-[#2a2540] placeholder:text-[#9a96a8] focus:outline-none"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
              style={{ background: '#9c5e6c' }}
            >
              {submitting ? '…' : 'Спросить'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ask(p)}
                className="rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white/95 transition hover:bg-white/20"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: compact health-index ring card */}
        <div
          className="rounded-2xl p-5 text-[#2a2540]"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 12px rgba(42,37,64,0.12)', minWidth: 200 }}
        >
          <div className="text-center text-[12px] font-medium text-[#6a6580]">
            Индекс здоровья
          </div>
          <div className="relative mx-auto mt-3 grid place-items-center" style={{ width: 140, height: 140 }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="56" fill="none" stroke="#f0d4dc" strokeWidth="10" />
              <circle
                cx="70" cy="70" r="56"
                fill="none"
                stroke="url(#ring-grad-h)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
              />
              <defs>
                <linearGradient id="ring-grad-h" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#cc8a96" />
                  <stop offset="55%" stopColor="#9889c4" />
                  <stop offset="100%" stopColor="#80b094" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <div className="text-[34px] font-extrabold leading-none">{score}</div>
              <div className="text-[10px] font-medium text-[#9a96a8]">/100</div>
            </div>
          </div>
          <Link
            href={`/${locale}/test`}
            className="mt-3 block w-full rounded-full py-2.5 text-center text-[12px] font-semibold text-white transition hover:opacity-80"
            style={{ background: '#9c5e6c' }}
          >
            Пройти тест →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Metrics Row ──────────────────────────────────────────────────────────────

function MetricsRow({ metrics }: { metrics: Metrics }) {
  const cards = [
    {
      icon: 'heart' as const,
      value: String(metrics.heartRate.bpm),
      label: 'Пульс, bpm',
      meta: `↑ ${metrics.heartRate.deltaWeek}`,
      metaColor: '#9c5e6c',
      bg: '#f0d4dc',
    },
    {
      icon: 'drop' as const,
      value: `${metrics.water.liters} л`,
      label: `Вода (${Math.round((metrics.water.liters / metrics.water.goalLiters) * 100)}%)`,
      meta: `${metrics.water.liters}/${metrics.water.goalLiters} цели`,
      metaColor: '#6e5fa0',
      bg: '#e0d8f0',
    },
    {
      icon: 'steps' as const,
      value: `${(metrics.steps.count / 1000).toFixed(1)}K`,
      label: 'Шагов сегодня',
      meta: `↑ ${metrics.steps.deltaPctWeek}%`,
      metaColor: '#548068',
      bg: '#d4e8d8',
    },
    {
      icon: 'habit' as const,
      value: `${metrics.habits.completed}/${metrics.habits.total}`,
      label: 'Привычки',
      meta: `${Math.round((metrics.habits.completed / metrics.habits.total) * 100)}%`,
      metaColor: '#9a96a8',
      bg: '#d4dff0',
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative flex min-h-[110px] flex-col justify-between rounded-2xl p-4"
          style={{ background: c.bg }}
        >
          <div className="flex items-start justify-between">
            <DashIcon name={c.icon} size={32} />
            <div className="text-[10px] font-semibold" style={{ color: c.metaColor }}>
              {c.meta}
            </div>
          </div>
          <div>
            <div className="text-[22px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
              {c.value}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: '#6a6580' }}>{c.label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Activity Chart ───────────────────────────────────────────────────────────

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const [metric, setMetric] = useState<Metric>('Шаги');
  const field = FIELD[metric];
  const max = Math.max(...data.map((d) => d[field]));

  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e8e4dc' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[14px] font-bold" style={{ color: '#2a2540' }}>
            Активность за 7 дней
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: '#9a96a8' }}>
            Шаги, км, активные минуты
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full p-1" style={{ background: '#f4f3ef' }}>
          {(Object.keys(FIELD) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
              style={
                metric === m
                  ? { background: '#f0d4dc', color: '#9c5e6c' }
                  : { color: '#9a96a8' }
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-end gap-3" style={{ height: 110 }}>
        {data.map((d, i) => {
          const v = d[field];
          const barH = Math.max(8, Math.round((v / max) * 110));
          const isToday = i === data.length - 1;
          return (
            <div key={d.day} className="flex-1 rounded-md transition-all" style={{
              height: barH,
              background: isToday
                ? 'linear-gradient(180deg, #cc8a96 0%, #9889c4 100%)'
                : '#e8e4dc',
            }} />
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-3 text-center text-[11px]" style={{ color: '#9a96a8' }}>
        {data.map((d) => <div key={d.day}>{d.day}</div>)}
      </div>
    </section>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ locale }: { locale: string }) {
  return (
    <section
      className="flex flex-col gap-3 rounded-2xl p-5"
      style={{ background: '#e0d8f0', border: '1px solid #e8e4dc' }}
    >
      <div
        className="grid h-12 w-12 place-items-center rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.6)' }}
      >
        <DashIcon name="report" size={32} />
      </div>
      <div>
        <div className="text-[14px] font-bold" style={{ color: '#2a2540' }}>
          Отчёт врачу готов
        </div>
        <div className="mt-1 text-[12px] leading-snug" style={{ color: '#6a6580' }}>
          Сводка за 30 дней — биомаркеры, сон, активность.
        </div>
      </div>
      <Link
        href={`/${locale}/report`}
        className="inline-flex w-fit items-center gap-1 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition hover:bg-white/60"
        style={{ borderColor: '#e8e4dc', background: 'rgba(255,255,255,0.8)', color: '#2a2540' }}
      >
        Скачать PDF →
      </Link>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  const [userName, setUserName] = useState('Пользователь');
  const [metrics] = useState<Metrics>(DEFAULT_METRICS);
  const [activity] = useState<ActivityPoint[]>(DEFAULT_ACTIVITY);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.name) setUserName(d.name); })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 space-y-4">
      <HeroSection userName={userName} metrics={metrics} locale={locale} />
      <MetricsRow metrics={metrics} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ActivityChart data={activity} />
        <ReportCard locale={locale} />
      </div>
    </div>
  );
}
