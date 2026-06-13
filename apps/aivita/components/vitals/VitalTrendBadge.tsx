'use client';

interface Props {
  trend: 'up' | 'down' | 'stable';
  type: string;
}

// For some metrics "down" is good (blood_sugar, blood_pressure, temperature)
const DOWN_IS_GOOD = new Set(['blood_sugar', 'blood_pressure', 'temperature', 'weight']);

export function VitalTrendBadge({ trend, type }: Props) {
  if (trend === 'stable') {
    return (
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: '#e8e6f0', color: '#9a96a8' }}
      >
        → стабильно
      </span>
    );
  }

  const goodTrend = trend === 'down' ? DOWN_IS_GOOD.has(type) : !DOWN_IS_GOOD.has(type);
  const color = goodTrend ? '#3aa86a' : '#e8a000';
  const bg = goodTrend ? '#e8f7ef' : '#fff8e6';
  const arrow = trend === 'up' ? '↑' : '↓';
  const label = trend === 'up' ? 'растёт' : 'снижается';

  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {arrow} {label}
    </span>
  );
}
