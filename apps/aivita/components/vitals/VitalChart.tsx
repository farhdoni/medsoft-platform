'use client';

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface BucketPoint {
  label: string;
  value: number;
}

interface Props {
  type: string;
  buckets: BucketPoint[];
  unit: string;
  color: string;
}

const BAR_TYPES = new Set(['steps', 'water_ml', 'sleep_hours']);

export function VitalChart({ type, buckets, unit, color }: Props) {
  if (buckets.length === 0) return null;

  const data = buckets.map(b => ({ date: b.label, val: b.value }));

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
