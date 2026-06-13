'use client';

export type Period = 'week' | 'month' | 'year';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
];

interface Props {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: '#ebe9e4' }}>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className="flex-1 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
          style={
            value === p.value
              ? { background: '#fff', color: '#9c5e6c', boxShadow: '0 1px 4px rgba(0,0,0,.1)' }
              : { color: '#9a96a8' }
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
