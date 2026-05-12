'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type VitalTileDef = {
  type: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  icon: string;
  color: string;
  bg: string;
  dual?: boolean;
};

const TILES: VitalTileDef[] = [
  { type: 'heart_rate',    label: 'Пульс',    unit: 'bpm',   min: 30,  max: 250, icon: '❤️',  color: 'var(--accent-dark)', bg: 'var(--accent-light)' },
  { type: 'blood_pressure', label: 'Давление', unit: 'mmHg', min: 40,  max: 250, icon: '🩺',  color: '#5e75a8', bg: '#d4dff0', dual: true },
  { type: 'weight',        label: 'Вес',      unit: 'кг',   min: 20,  max: 300, step: 0.1, icon: '⚖️', color: 'var(--accent-dark)', bg: 'var(--accent-bg-light)' },
  { type: 'sleep_hours',   label: 'Сон',      unit: 'ч',    min: 0,   max: 24,  step: 0.5, icon: '😴', color: '#5e75a8', bg: '#d4dff0' },
];

type LatestVitals = Record<string, { value: Record<string, unknown>; recordedAt: string } | null>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function isFresh(row: { recordedAt: string } | null | undefined) {
  if (!row) return false;
  return Date.now() - new Date(row.recordedAt).getTime() < DAY_MS;
}

function getNumericVal(row: { value: Record<string, unknown>; recordedAt: string } | null | undefined): string | null {
  if (!row || !isFresh(row)) return null;
  const v = row.value;
  if (typeof v.value === 'number') return v.value % 1 === 0 ? `${v.value}` : v.value.toFixed(1);
  if (typeof v.systolic === 'number' && typeof v.diastolic === 'number') return `${v.systolic}/${v.diastolic}`;
  if (typeof v.hours === 'number') return `${v.hours}`;
  return null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AddModal({
  def,
  onClose,
  onSaved,
}: {
  def: VitalTileDef;
  onClose: () => void;
  onSaved: (displayVal: string) => void;
}) {
  const [value, setValue] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');

    let valuePayload: Record<string, unknown>;
    let displayVal: string;

    if (def.dual) {
      const sys = parseFloat(systolic);
      const dia = parseFloat(diastolic);
      if (!systolic || !diastolic || isNaN(sys) || isNaN(dia)) {
        setError('Введите верхнее и нижнее давление');
        return;
      }
      valuePayload = { systolic: sys, diastolic: dia };
      displayVal = `${sys}/${dia}`;
    } else {
      const num = parseFloat(value);
      if (!value || isNaN(num) || num < def.min || num > def.max) {
        setError(`Значение от ${def.min} до ${def.max}`);
        return;
      }
      valuePayload = { value: num, unit: def.unit };
      displayVal = def.step && def.step < 1 ? num.toFixed(1) : `${num}`;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: def.type,
          value: valuePayload,
          source: 'manual',
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? 'Ошибка сервера');
      }
      onSaved(displayVal);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl z-[9999]">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[28px]">{def.icon}</span>
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: '#2a2540' }}>
              {def.label}
            </h2>
            <p className="text-[12px]" style={{ color: '#9a96a8' }}>Введите показатель</p>
          </div>
        </div>

        {def.dual ? (
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#6a6580' }}>
                Верхнее (сист.)
              </label>
              <input
                type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)}
                placeholder="120" min={def.min} max={def.max} autoFocus
                className="w-full rounded-[12px] border px-3 py-3 text-[16px] text-center font-bold outline-none focus:ring-2"
                style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
              />
            </div>
            <div className="flex items-center pt-7 text-[20px] font-bold" style={{ color: '#9a96a8' }}>/</div>
            <div className="flex-1">
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#6a6580' }}>
                Нижнее (диаст.)
              </label>
              <input
                type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)}
                placeholder="80" min={40} max={150}
                className="w-full rounded-[12px] border px-3 py-3 text-[16px] text-center font-bold outline-none focus:ring-2"
                style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#6a6580' }}>
              Значение ({def.unit})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={`${def.min}–${def.max}`}
                min={def.min} max={def.max} step={def.step ?? 1} autoFocus
                className="flex-1 rounded-[12px] border px-3 py-3 text-[20px] text-center font-bold outline-none focus:ring-2"
                style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
              />
              <span className="text-[14px] font-medium flex-shrink-0" style={{ color: '#9a96a8' }}>{def.unit}</span>
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#6a6580' }}>
            Заметка (необязательно)
          </label>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Например: после пробежки"
            className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
            style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
          />
        </div>

        {error && (
          <p className="text-[12px] mb-3 text-center font-semibold" style={{ color: '#c0474e' }}>{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-[14px] text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mb-2"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          {saving ? 'Сохранение...' : '💾 Сохранить'}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-[14px] text-[14px] font-semibold transition-colors hover:bg-[#f4f3ef]"
          style={{ color: '#9a96a8' }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialLatest: LatestVitals;
  locale: string;
}

export function BiometricsSection({ initialLatest, locale }: Props) {
  const router = useRouter();
  const [latest, setLatest] = useState<LatestVitals>(initialLatest);
  const [activeDef, setActiveDef] = useState<VitalTileDef | null>(null);

  function handleSaved(type: string, displayVal: string) {
    // Optimistic update — build correct value shape per vital type
    let optimisticValue: Record<string, unknown>;
    if (type === 'blood_pressure') {
      const [sys, dia] = displayVal.split('/').map(Number);
      optimisticValue = { systolic: sys, diastolic: dia };
    } else if (type === 'sleep_hours') {
      optimisticValue = { hours: parseFloat(displayVal) };
    } else {
      optimisticValue = { value: parseFloat(displayVal) };
    }
    setLatest((prev) => ({
      ...prev,
      [type]: {
        value: optimisticValue,
        recordedAt: new Date().toISOString(),
      },
    }));
    // Refresh server component data
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TILES.map((def) => {
          const row = latest[def.type];
          const val = getNumericVal(row);
          return (
            <button
              key={def.type}
              type="button"
              onClick={() => setActiveDef(def)}
              className="rounded-[16px] p-3 flex flex-col gap-1 text-left cursor-pointer active:scale-95 transition-transform hover:opacity-90"
              style={{ background: def.bg }}
              aria-label={`Ввести ${def.label}`}
            >
              <span className="text-[20px]">{def.icon}</span>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: def.color }}>
                {def.label}
              </p>
              {val ? (
                <p className="text-[16px] font-bold" style={{ color: '#2a2540' }}>
                  {val}{' '}
                  <span className="text-[10px] font-normal" style={{ color: '#9a96a8' }}>{def.unit}</span>
                </p>
              ) : (
                <p className="text-[11px]" style={{ color: '#9a96a8' }}>Нет данных</p>
              )}
              {/* Tap hint */}
              <p className="text-[9px] mt-auto pt-1" style={{ color: def.color, opacity: 0.6 }}>
                Нажмите для ввода
              </p>
            </button>
          );
        })}
      </div>

      {activeDef && (
        <AddModal
          def={activeDef}
          onClose={() => setActiveDef(null)}
          onSaved={(displayVal) => {
            handleSaved(activeDef.type, displayVal);
            setActiveDef(null);
          }}
        />
      )}
    </>
  );
}
