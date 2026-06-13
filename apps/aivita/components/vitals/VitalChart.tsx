'use client';

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface HistoryRow {
  recordedAt: string;
  value: Record<string, unknown>;
}

interface Props {
  type: string;
  history: HistoryRow[];
  unit: string;
  color: string;
}

const BAR_TYPES = new Set(['steps', 'water_ml', 'sleep_hours']);

function extractNumeric(row: HistoryRow): number | null {
  const v = row.value;
  if (typeof v.value === 'number') return v.value;
  if (typeof v.hours === 'number') return v.hours;
  if (typeof v.systolic === 'number') return v.systolic as number;
  return null;
}

function formatDate(iso: string, period?: string) {
  const d = new Date(iso);
  if (period === 'year') return d.toLocaleDateString('ru', { month: 'short' });
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'numeric' });
}

export function VitalChart({ type, history, unit, color }: Props) {
  if (history.length === 0) return null;

  const data = history
    .map((r) => ({ date: r.recordedAt, val: extractNumeric(r) }))
    .filter((d): d is { date: string; val: number } => d.val !== null)
    .map((d) => ({ date: formatDate(d.date), val: d.val }));

  if (data.length === 0) return null;

  const isBar = BAR_TYPES.has(type);
  const Chart = isBar ? BarChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <Chart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: '#9a96a8' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#9a96a8' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e8e6e3',
            borderRadius: 10,
            fontSize: 11,
            color: '#2a2540',
          }}
          formatter={(v: number) => [`${v} ${unit}`, '']}
          labelFormatter={(l) => String(l)}
        />
        {isBar ? (
          <Bar dataKey="val" fill={color} radius={[4, 4, 0, 0]} maxBarSize={20} />
        ) : (
          <Line
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            dot={data.length <= 14 ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
