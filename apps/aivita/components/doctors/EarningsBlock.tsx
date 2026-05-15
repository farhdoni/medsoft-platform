'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api-client';

type Period = 'day' | 'week' | 'month';

interface ChartPoint {
  label: string;
  value: number;
  consultations: number;
  idx: number;
}

interface DashStats {
  totalEarnings: number;
  earningsChange: number;
  consultationsCount: number;
  consultationsChange: number;
  onlineCount: number;
  offlineCount: number;
  newPatientsCount: number;
  pendingPayouts: number;
  chartData: ChartPoint[];
}

const PERIOD_LABELS: Record<Period, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
};

const PERIOD_TITLES: Record<Period, string> = {
  day: 'сегодня',
  week: 'неделю',
  month: 'месяц',
};

function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

export function EarningsBlock({ locale }: { locale: string }) {
  const [period, setPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(true);

  const load = useCallback(async (p: Period) => {
    setFade(false);
    const res = await apiRequest<DashStats>(`/doctor/dashboard-stats?period=${p}`);
    setStats('data' in res ? res.data ?? null : null);
    setLoading(false);
    // trigger fade-in
    requestAnimationFrame(() => setFade(true));
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const changePeriod = (p: Period) => {
    if (p === period) return;
    setPeriod(p);
  };

  // chart
  const chartData = stats?.chartData ?? [];
  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  // detect current bucket
  const now = new Date();
  let currentIdx = -1;
  if (period === 'day') currentIdx = now.getHours();
  else if (period === 'week') currentIdx = ((now.getDay() || 7) - 1);
  else currentIdx = now.getDate() - 1;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: '#e8e4dc' }}>

      {/* ── Period toggle ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 pt-4 pb-0">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button key={p} type="button" onClick={() => changePeriod(p)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={period === p
              ? { background: '#6BA3D6', color: '#fff' }
              : { background: '#f4f3ef', color: '#6a6580' }}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── Content with fade ─────────────────────────────────────── */}
      <div className="p-4 space-y-3" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.2s ease' }}>

        {/* Earnings card */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #5580b0, #6BA3D6)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Доход за {PERIOD_TITLES[period]}
              </p>
              <p className="font-black leading-none" style={{ fontSize: 28, color: '#fff', letterSpacing: '-0.5px' }}>
                {loading ? '—' : fmt(stats?.totalEarnings ?? 0)} <span className="text-[14px] font-semibold opacity-80">сум</span>
              </p>
            </div>
            {!loading && stats && stats.earningsChange !== 0 && (
              <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full mt-0.5"
                style={stats.earningsChange >= 0
                  ? { background: 'rgba(52,211,153,0.2)', color: '#34d399' }
                  : { background: 'rgba(248,113,113,0.2)', color: '#f87171' }}>
                {stats.earningsChange >= 0 ? '↑' : '↓'} {Math.abs(stats.earningsChange)}%
              </span>
            )}
          </div>
        </div>

        {/* 3 mini-cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '💬', label: 'Консультации', value: stats?.consultationsCount ?? 0, change: stats?.consultationsChange ?? 0 },
            { icon: '📱', label: 'Онлайн',        value: stats?.onlineCount ?? 0,        change: null },
            { icon: '👤', label: 'Новые пациенты', value: stats?.newPatientsCount ?? 0,  change: null },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-3 border flex flex-col gap-1"
              style={{ background: '#fff', borderColor: '#e8e4dc' }}>
              <span className="text-base leading-none">{card.icon}</span>
              <span className="text-[18px] font-extrabold leading-tight" style={{ color: '#2a2540' }}>
                {loading ? '—' : card.value}
              </span>
              <span className="text-[10px] leading-tight" style={{ color: '#9a96a8' }}>{card.label}</span>
              {card.change !== null && card.change !== 0 && !loading && (
                <span className="text-[10px] font-semibold"
                  style={{ color: card.change >= 0 ? '#34d399' : '#f87171' }}>
                  {card.change >= 0 ? '↑' : '↓'}{Math.abs(card.change)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl px-2 pt-3 pb-1" style={{ background: '#f8f7f3' }}>
          {loading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{ borderColor: '#6BA3D6', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              <div className="flex items-end gap-[2px] h-16">
                {chartData.map((pt, i) => {
                  const pct = maxVal > 0 ? Math.max((pt.value / maxVal) * 100, pt.consultations > 0 ? 15 : 0) : 0;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className="rounded-sm transition-all duration-300"
                        style={{
                          height: `${pct}%`,
                          minHeight: pt.value > 0 || pt.consultations > 0 ? 4 : 0,
                          background: '#6BA3D6',
                          opacity: isCurrent ? 1 : 0.4,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels — show only every Nth to avoid crowding */}
              <div className="flex items-center gap-[2px] mt-1">
                {chartData.map((pt, i) => {
                  const show = period === 'day' ? i % 6 === 0
                    : period === 'week' ? true
                    : i % 5 === 0;
                  return (
                    <div key={i} className="flex-1 text-center">
                      <span className="text-[8px]" style={{ color: '#9a96a8' }}>
                        {show ? pt.label : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pending payouts row */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[12px]" style={{ color: '#6a6580' }}>
            Ожидает выплаты:{' '}
            <span className="font-semibold" style={{ color: '#2a2540' }}>
              {loading ? '—' : fmt(stats?.pendingPayouts ?? 0)} сум
            </span>
          </p>
          <Link href={`/${locale}/doctor-settings/earnings`}
            className="text-[11px] font-semibold"
            style={{ color: '#6BA3D6' }}>
            Подробнее →
          </Link>
        </div>
      </div>
    </div>
  );
}
