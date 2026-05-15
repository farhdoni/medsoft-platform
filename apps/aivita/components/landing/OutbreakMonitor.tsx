'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MapPoint {
  city:            string;
  lat:             number;
  lon:             number;
  diseaseCategory: string;
  diseaseLabel:    string;
  activeCases:     number;
  trend:           'rising' | 'stable' | 'falling';
  color:           string;
  size:            number;
}

interface SummaryItem {
  diseaseCategory: string;
  diseaseLabel:    string;
  totalCases:      number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// Uzbekistan bounding box for simple SVG map projection
// lat: 37.2 – 45.6  lon: 56.0 – 73.1
const LAT_MIN = 37.2, LAT_MAX = 45.6;
const LON_MIN = 56.0, LON_MAX = 73.1;
const MAP_W = 480, MAP_H = 220;

function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H;
  return { x, y };
}

const TREND_ICON: Record<string, string> = {
  rising:  '↑',
  falling: '↓',
  stable:  '→',
};
const TREND_COLOR: Record<string, string> = {
  rising:  '#ef4444',
  falling: '#22c55e',
  stable:  '#9a96a8',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OutbreakMonitor() {
  const [points,    setPoints]    = useState<MapPoint[]>([]);
  const [summary,   setSummary]   = useState<SummaryItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [tooltip,   setTooltip]   = useState<MapPoint | null>(null);

  const load = useCallback(async () => {
    try {
      const [mapRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/v1/aivita/outbreak/map`,     { next: { revalidate: 1800 } }),
        fetch(`${API_BASE}/v1/aivita/outbreak/summary`, { next: { revalidate: 1800 } }),
      ]);

      if (mapRes.ok) {
        const data = await mapRes.json() as { data: MapPoint[]; updatedAt: string };
        setPoints(data.data ?? []);
        setUpdatedAt(data.updatedAt ?? null);
      }
      if (sumRes.ok) {
        const data = await sumRes.json() as { data: SummaryItem[] };
        setSummary(data.data ?? []);
      }
    } catch {
      // silently fail — monitoring is secondary
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const fmtTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section
      className="py-20 px-4"
      style={{ background: 'linear-gradient(180deg, #0f1923 0%, #1a2535 100%)' }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" />
            Мониторинг вспышек · Live
          </span>
          <h2
            className="text-[28px] md:text-[36px] font-extrabold mb-3"
            style={{ color: '#f1f0f8' }}
          >
            Эпидемиологическая карта Узбекистана
          </h2>
          <p className="text-[14px] max-w-[520px] mx-auto" style={{ color: '#8a9bb5' }}>
            Анонимные агрегированные данные из AI-чекапов и биометрии пользователей AIVITA.
            Обновляется каждые 30 минут.
          </p>
        </div>

        {/* Map card */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Map SVG */}
          <div className="relative" style={{ background: '#1a2535' }}>
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              className="w-full"
              style={{ height: 220, display: 'block' }}
            >
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />

              {/* Country outline approximate paths for Uzbekistan shape */}
              <path
                d="M 80,60 L 120,30 L 200,20 L 280,25 L 340,15 L 400,30 L 450,55 L 460,90 L 440,130 L 400,160 L 350,175 L 300,185 L 250,195 L 200,200 L 150,195 L 100,185 L 60,160 L 40,130 L 45,90 Z"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />

              {/* Outbreak points */}
              {!loading && points.map((p, i) => {
                const { x, y } = project(p.lat, p.lon);
                return (
                  <g key={i} style={{ cursor: 'pointer' }} onClick={() => setTooltip(tooltip?.city === p.city && tooltip?.diseaseCategory === p.diseaseCategory ? null : p)}>
                    {/* Pulse ring for rising trend */}
                    {p.trend === 'rising' && (
                      <circle cx={x} cy={y} r={p.size * 2.5} fill="none" stroke={p.color} strokeWidth="1" opacity="0.3">
                        <animate attributeName="r" values={`${p.size * 2};${p.size * 3.5};${p.size * 2}`} dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
                      </circle>
                    )}
                    <circle
                      cx={x} cy={y}
                      r={p.size}
                      fill={p.color}
                      opacity="0.85"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="0.5"
                    />
                    {/* City label for big points */}
                    {p.size >= 5 && (
                      <text x={x} y={y - p.size - 2} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontWeight="600">
                        {p.city}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Loading shimmer */}
              {loading && (
                <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="rgba(255,255,255,0.02)">
                  <animate attributeName="opacity" values="0.02;0.06;0.02" dur="1.5s" repeatCount="indefinite"/>
                </rect>
              )}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute top-3 right-3 rounded-xl px-3 py-2.5 text-left"
                style={{ background: '#0f1923', border: '1px solid rgba(255,255,255,0.12)', minWidth: 160 }}
              >
                <p className="text-[12px] font-bold mb-1" style={{ color: '#f1f0f8' }}>{tooltip.city}</p>
                <p className="text-[11px] mb-1" style={{ color: '#8a9bb5' }}>{tooltip.diseaseLabel}</p>
                <p className="text-[13px] font-extrabold" style={{ color: tooltip.color }}>{tooltip.activeCases} случаев</p>
                <p className="text-[10px]" style={{ color: TREND_COLOR[tooltip.trend] }}>
                  {TREND_ICON[tooltip.trend]} {tooltip.trend === 'rising' ? 'Рост' : tooltip.trend === 'falling' ? 'Снижение' : 'Стабильно'}
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { color: '#ef4444', label: '>200 случаев' },
              { color: '#f97316', label: '100-200' },
              { color: '#eab308', label: '50-100' },
              { color: '#22c55e', label: '20-50' },
              { color: '#3b82f6', label: '<20' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-[10px]" style={{ color: '#8a9bb5' }}>{l.label}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px]" style={{ color: '#6a7a8a' }}>
                {updatedAt ? `Обновлено: ${fmtTime(updatedAt)}` : 'Загрузка…'}
              </span>
            </div>
          </div>
        </div>

        {/* Disease summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', height: 72 }} />
              ))
            : summary.slice(0, 6).map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[18px] font-extrabold leading-tight" style={{ color: '#f1f0f8' }}>
                    {s.totalCases}
                  </p>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: '#8a9bb5' }}>
                    {s.diseaseLabel}
                  </p>
                </div>
              ))
          }
        </div>

        {/* Bottom disclaimer */}
        <p className="text-center text-[10px]" style={{ color: '#4a5a6a' }}>
          🔒 Данные анонимизированы и агрегированы. Личные данные пользователей не передаются.
          Минимум 5 случаев для отображения точки.
        </p>
      </div>
    </section>
  );
}
