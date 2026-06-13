'use client';

interface Props {
  min: number | null;
  max: number | null;
  avg: number | null;
  unit: string;
}

function fmt(v: number | null) {
  if (v === null) return '—';
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export function VitalStatsCard({ min, max, avg, unit }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Мин', value: min },
        { label: 'Ср', value: avg },
        { label: 'Макс', value: max },
      ].map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center py-2 px-1 rounded-[12px]"
          style={{ background: '#ebe9e4' }}
        >
          <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#9a96a8' }}>{label}</p>
          <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{fmt(value)}</p>
          <p className="text-[9px]" style={{ color: '#9a96a8' }}>{unit}</p>
        </div>
      ))}
    </div>
  );
}
