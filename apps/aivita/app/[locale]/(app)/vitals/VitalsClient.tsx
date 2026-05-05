'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { VitalRow, LatestVitals } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VitalDef {
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
}

export const VITAL_DEFS: VitalDef[] = [
  { type: 'heart_rate',   label: 'Пульс',         unit: 'bpm',   min: 30,  max: 250, icon: '❤️',  color: '#9c5e6c', bg: '#f0d4dc' },
  { type: 'blood_pressure', label: 'Давление',     unit: 'mmHg', min: 40,  max: 250, icon: '🩺',  color: '#5e75a8', bg: '#d4dff0', dual: true },
  { type: 'blood_sugar',  label: 'Сахар',          unit: 'мг/дл',min: 20,  max: 600, icon: '🩸',  color: '#9c5e6c', bg: '#f0d4dc' },
  { type: 'temperature',  label: 'Температура',    unit: '°C',   min: 34,  max: 42,  step: 0.1, icon: '🌡️', color: '#688844', bg: '#d4e8d8' },
  { type: 'weight',       label: 'Вес',            unit: 'кг',   min: 20,  max: 300, step: 0.1, icon: '⚖️', color: '#6e5fa0', bg: '#e0d8f0' },
  { type: 'sleep_hours',  label: 'Сон',            unit: 'часов',min: 0,   max: 24,  step: 0.5, icon: '😴', color: '#5e75a8', bg: '#d4dff0' },
  { type: 'water_ml',     label: 'Вода',           unit: 'мл',   min: 0,   max: 10000,step: 100, icon: '💧', color: '#548068', bg: '#d4e8d8' },
  { type: 'steps',        label: 'Шаги',           unit: 'шагов',min: 0,   max: 100000, icon: '👟', color: '#6e5fa0', bg: '#e0d8f0' },
  { type: 'spo2',         label: 'SpO2',           unit: '%',    min: 70,  max: 100, icon: '🫁', color: '#5e75a8', bg: '#d4dff0' },
];

function getVitalDef(type: string) {
  return VITAL_DEFS.find((v) => v.type === type);
}

function formatValue(row: VitalRow): string {
  const v = row.value as Record<string, unknown>;
  if (typeof v.systolic === 'number' && typeof v.diastolic === 'number') {
    return `${v.systolic}/${v.diastolic}`;
  }
  if (typeof v.hours === 'number') {
    return `${v.hours}`;
  }
  if (typeof v.value === 'number') {
    return v.value % 1 === 0 ? `${v.value}` : `${v.value.toFixed(1)}`;
  }
  return '—';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (today) return `Сегодня · ${time}`;
  if (yesterday) return `Вчера · ${time}`;
  return `${d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })} · ${time}`;
}

// ─── Latest Vitals Grid ────────────────────────────────────────────────────────

function LatestGrid({ latest }: { latest: LatestVitals }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {VITAL_DEFS.map((def) => {
        const row = latest[def.type];
        const val = row ? formatValue(row as VitalRow) : null;
        return (
          <div
            key={def.type}
            className="rounded-[16px] p-3 flex flex-col gap-1"
            style={{ background: def.bg }}
          >
            <span className="text-[20px]">{def.icon}</span>
            <p className="text-[11px] font-semibold" style={{ color: def.color }}>{def.label}</p>
            {val ? (
              <p className="text-[16px] font-bold" style={{ color: '#2a2540' }}>
                {val} <span className="text-[10px] font-normal" style={{ color: '#9a96a8' }}>{def.unit}</span>
              </p>
            ) : (
              <p className="text-[12px]" style={{ color: '#9a96a8' }}>Нет данных</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── History List ──────────────────────────────────────────────────────────────

function HistoryList({ rows, onDelete }: { rows: VitalRow[]; onDelete: (id: string) => void }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[14px]" style={{ color: '#9a96a8' }}>Записей пока нет</p>
        <p className="text-[12px]" style={{ color: '#9a96a8' }}>Добавьте первый показатель</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const def = getVitalDef(row.type);
        return (
          <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-[#f4f3ef] transition-colors group">
            <span className="text-[18px] flex-shrink-0">{def?.icon ?? '📊'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: '#2a2540' }}>
                {def?.label ?? row.type} — {formatValue(row)} {def?.unit}
              </p>
              <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                {formatTime(row.recordedAt)} · {row.source === 'manual' ? '✋ Вручную' : `⌚ ${row.source}`}
              </p>
            </div>
            <button
              onClick={() => onDelete(row.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[18px] p-1"
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Vital Modal ───────────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function AddVitalModal({ onClose, onSaved }: ModalProps) {
  const [type, setType] = useState('heart_rate');
  const [value, setValue] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const def = getVitalDef(type)!;

  async function handleSave() {
    setError('');

    let valuePayload: Record<string, unknown>;

    if (def.dual) {
      const sys = parseFloat(systolic);
      const dia = parseFloat(diastolic);
      if (!systolic || !diastolic || isNaN(sys) || isNaN(dia)) {
        setError('Введите верхнее и нижнее давление');
        return;
      }
      valuePayload = { systolic: sys, diastolic: dia };
    } else {
      const num = parseFloat(value);
      if (!value || isNaN(num) || num < def.min || num > def.max) {
        setError(`Значение должно быть от ${def.min} до ${def.max}`);
        return;
      }
      valuePayload = { value: num, unit: def.unit };
    }

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, value: valuePayload, source: 'manual', note: note || undefined }),
      });
      if (!res.ok) throw new Error('Ошибка сервера');
      onSaved();
      onClose();
    } catch {
      setError('Ошибка сохранения, попробуйте ещё раз');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl z-[9999]">
        <h2 className="text-[18px] font-bold mb-4" style={{ color: '#2a2540' }}>Добавить показатель</h2>

        {/* Type selector */}
        <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Тип</label>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setValue(''); setSystolic(''); setDiastolic(''); }}
          className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] mb-4 outline-none focus:ring-2"
          style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
        >
          {VITAL_DEFS.map((d) => (
            <option key={d.type} value={d.type}>{d.icon} {d.label}</option>
          ))}
        </select>

        {/* Value input */}
        {def.dual ? (
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Верхнее (систолическое)</label>
              <input
                type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)}
                placeholder="120" min={def.min} max={def.max}
                className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
                style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Нижнее (диастолическое)</label>
              <input
                type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)}
                placeholder="80" min={40} max={150}
                className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
                style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>
              Значение ({def.unit})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={`${def.min}–${def.max}`}
                min={def.min} max={def.max} step={def.step ?? 1}
                className="flex-1 rounded-[12px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
                style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
              />
              <span className="text-[13px]" style={{ color: '#9a96a8' }}>{def.unit}</span>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-4">
          <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Заметка (необязательно)</label>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Например: после пробежки"
            className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
          />
        </div>

        {error && <p className="text-[12px] mb-3" style={{ color: '#9c5e6c' }}>{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mb-2"
          style={{ background: 'linear-gradient(135deg, #9c5e6c, #6e5fa0)' }}
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

// ─── Main Client Component ─────────────────────────────────────────────────────

interface Props {
  initialLatest: LatestVitals;
  initialRows: VitalRow[];
}

export function VitalsClient({ initialLatest, initialRows }: Props) {
  const router = useRouter();
  const [latest, setLatest] = useState<LatestVitals>(initialLatest);
  const [rows, setRows] = useState<VitalRow[]>(initialRows);
  const [showModal, setShowModal] = useState(false);
  const [, startTransition] = useTransition();

  function handleSaved() {
    startTransition(() => router.refresh());
    // Optimistic: reload vitals from API
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/vitals`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json) => { if (json.data) setRows(json.data); })
      .catch(() => {});

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/vitals/latest`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json) => { if (json.data) setLatest(json.data); })
      .catch(() => {});
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/vitals/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9a96a8' }}>
            ЗДОРОВЬЕ
          </p>
          <h1 className="text-[22px] font-extrabold" style={{ color: '#2a2540' }}>Биометрия</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[20px] font-bold hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #cc8a96 0%, #9889c4 100%)' }}
          aria-label="Добавить показатель"
        >
          +
        </button>
      </div>

      {/* Latest vitals grid */}
      <section className="mb-6">
        <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ПОСЛЕДНИЕ ПОКАЗАТЕЛИ</h2>
        <LatestGrid latest={latest} />
      </section>

      {/* History */}
      <section className="mb-6">
        <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ИСТОРИЯ ЗАПИСЕЙ</h2>
        <div className="rounded-[20px] bg-white border p-3" style={{ borderColor: '#e8e4dc' }}>
          <HistoryList rows={rows} onDelete={handleDelete} />
        </div>
      </section>

      {/* Add button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3.5 rounded-[16px] text-[14px] font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #9c5e6c, #6e5fa0)' }}
      >
        + Добавить показатель
      </button>

      {showModal && (
        <AddVitalModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
