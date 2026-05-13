'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

type VitalRow = { value: Record<string, unknown>; recordedAt: string } | null;
type LatestVitals = Record<string, VitalRow>;

interface VitalCfg {
  title: string;
  label: string;
  unit: string;
  norm: string;
  icon: string;
  bg: string;
  color: string;
  min: number;
  max: number;
  step?: number;
  dual?: boolean;
}

const VITAL_CONFIG: Record<string, VitalCfg> = {
  heart_rate:     { title: 'Пульс',        label: 'Удары в минуту',               unit: 'bpm',     norm: '60–100',      icon: '❤️',  bg: 'var(--accent-light)',  color: 'var(--accent-dark)',  min: 30,  max: 250, step: 1 },
  blood_pressure: { title: 'Давление',     label: 'Систол. / Диастол.',            unit: 'mmHg',    norm: '100–130/60–90', icon: '🩺', bg: '#d4dff0',              color: '#5e75a8',             min: 40,  max: 250, dual: true },
  glucose:        { title: 'Сахар',        label: 'Уровень глюкозы',              unit: 'ммоль/л', norm: '3.9–6.1',     icon: '🩸',  bg: 'var(--accent-light)',  color: 'var(--accent-dark)',  min: 1,   max: 30,  step: 0.1 },
  weight:         { title: 'Вес',          label: 'Масса тела',                   unit: 'кг',      norm: '—',            icon: '⚖️',  bg: '#f4f3ef',              color: '#6a6580',             min: 20,  max: 300, step: 0.1 },
  spo2:           { title: 'SpO2',         label: 'Кислород в крови',             unit: '%',       norm: '95–100',      icon: '🫁',  bg: '#d4e8d8',              color: '#548068',             min: 80,  max: 100, step: 1 },
  sleep_hours:    { title: 'Сон',          label: 'Часов сна',                    unit: 'ч',       norm: '7–9',         icon: '😴',  bg: '#d4dff0',              color: '#5e75a8',             min: 0,   max: 24,  step: 0.5 },
  temperature:    { title: 'Температура',  label: 'Температура тела',             unit: '°C',      norm: '36.1–37.2',   icon: '🌡️', bg: 'var(--accent-light)',  color: 'var(--accent-dark)',  min: 34,  max: 42,  step: 0.1 },
  steps:          { title: 'Шаги',         label: 'Шагов за день',                unit: '',        norm: '>7000',       icon: '🚶',  bg: '#d4e8d8',              color: '#548068',             min: 0,   max: 99999, step: 100 },
  water_ml:       { title: 'Вода',         label: 'Выпито воды',                  unit: 'мл',      norm: '>2000',       icon: '💧',  bg: '#d4dff0',              color: '#5e75a8',             min: 0,   max: 10000, step: 100 },
};

export const ALL_VITALS_LIST = [
  { key: 'heart_rate',     icon: '❤️',  label: 'Пульс' },
  { key: 'blood_pressure', icon: '🩺',  label: 'Давление' },
  { key: 'glucose',        icon: '🩸',  label: 'Сахар (глюкоза)' },
  { key: 'weight',         icon: '⚖️',  label: 'Вес' },
  { key: 'spo2',           icon: '🫁',  label: 'SpO2' },
  { key: 'sleep_hours',    icon: '😴',  label: 'Сон' },
  { key: 'temperature',    icon: '🌡️', label: 'Температура' },
  { key: 'steps',          icon: '🚶',  label: 'Шаги' },
  { key: 'water_ml',       icon: '💧',  label: 'Вода' },
];

const LS_KEY = 'aivita_home_vitals';
const DEFAULT_VISIBLE = ['heart_rate', 'blood_pressure', 'weight', 'sleep_hours'];
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadVisible(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return DEFAULT_VISIBLE;
}

function isFresh(row: VitalRow): boolean {
  if (!row) return false;
  return Date.now() - new Date(row.recordedAt).getTime() < DAY_MS;
}

function getDisplayValue(type: string, row: VitalRow): string | null {
  if (!row || !isFresh(row)) return null;
  const v = row.value;
  if (type === 'blood_pressure') {
    const sys = (v as { systolic?: number }).systolic;
    const dia = (v as { diastolic?: number }).diastolic;
    if (typeof sys === 'number' && typeof dia === 'number') return `${sys}/${dia}`;
    return null;
  }
  if (type === 'sleep_hours') {
    const h = (v as { hours?: number; value?: number }).hours ?? (v as { value?: number }).value;
    if (typeof h === 'number') return h % 1 === 0 ? `${h}` : h.toFixed(1);
    return null;
  }
  const val = (v as { value?: number }).value;
  if (typeof val === 'number') return val % 1 === 0 ? `${val}` : val.toFixed(1);
  return null;
}

// ─── Add Vital Modal ──────────────────────────────────────────────────────────

function AddVitalModal({
  type, cfg, onClose, onSaved,
}: {
  type: string; cfg: VitalCfg; onClose: () => void; onSaved: (type: string, val: string) => void;
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

    if (cfg.dual) {
      const sys = parseFloat(systolic);
      const dia = parseFloat(diastolic);
      if (!systolic || !diastolic || isNaN(sys) || isNaN(dia)) {
        setError('Введите верхнее и нижнее давление'); return;
      }
      valuePayload = { systolic: sys, diastolic: dia };
      displayVal = `${sys}/${dia}`;
    } else {
      const num = parseFloat(value);
      if (!value || isNaN(num) || num < cfg.min || num > cfg.max) {
        setError(`Значение от ${cfg.min} до ${cfg.max}`); return;
      }
      valuePayload = { value: num, unit: cfg.unit };
      displayVal = cfg.step && cfg.step < 1 ? num.toFixed(1) : `${num}`;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: valuePayload, source: 'manual', note: note || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? 'Ошибка сервера');
      }
      onSaved(type, displayVal);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${cfg.icon} ${cfg.title}`}
      footer={
        <>
          {error && <p className="text-xs mb-2 text-center font-semibold" style={{ color: '#e05a6a' }}>{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
          >
            {saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
        </>
      }
    >
      <p className="text-xs text-app-t3 mb-0.5">
        Норма: <span className="font-semibold">{cfg.norm}</span>
      </p>
      <p className="text-xs text-app-t3 mb-4">{cfg.label}</p>

      {cfg.dual ? (
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1.5 text-app-t3">Верхнее (сист.)</label>
            <input
              type="number" value={systolic} onChange={e => setSystolic(e.target.value)}
              placeholder="120" min={cfg.min} max={cfg.max} autoFocus
              className="w-full rounded-xl border px-3 py-3 text-2xl text-center font-bold outline-none"
              style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
            />
          </div>
          <div className="flex items-center pt-7 text-xl font-bold text-app-t3">/</div>
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1.5 text-app-t3">Нижнее (диаст.)</label>
            <input
              type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)}
              placeholder="80" min={40} max={150}
              className="w-full rounded-xl border px-3 py-3 text-2xl text-center font-bold outline-none"
              style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <input
              type="number" value={value} onChange={e => setValue(e.target.value)}
              placeholder={`${cfg.min}–${cfg.max}`}
              min={cfg.min} max={cfg.max} step={cfg.step ?? 1} autoFocus
              className="flex-1 rounded-xl border px-3 py-4 text-2xl text-center font-bold outline-none"
              style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
            />
            {cfg.unit && <span className="text-sm font-medium flex-shrink-0 text-app-t3">{cfg.unit}</span>}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1.5 text-app-t3">Заметка (необязательно)</label>
        <input
          type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Например: после пробежки"
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
        />
      </div>
    </Modal>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function VitalsSettingsModal({
  visible, onClose, onChange,
}: {
  visible: string[]; onClose: () => void; onChange: (keys: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(visible);

  function toggle(key: string) {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function handleSave() {
    onChange(selected);
    try { localStorage.setItem(LS_KEY, JSON.stringify(selected)); } catch {}
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="⚙️ Настроить показатели"
      footer={
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          Сохранить
        </button>
      }
    >
      <p className="text-xs text-app-t3 mb-4">Выберите показатели для главной страницы</p>
      <div className="space-y-2">
        {ALL_VITALS_LIST.map(v => {
          const on = selected.includes(v.key);
          return (
            <button
              key={v.key}
              onClick={() => toggle(v.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
              style={{
                background: on ? 'var(--accent-bg-light)' : '#f4f3ef',
                border: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              }}
            >
              <span className="text-lg w-7 text-center">{v.icon}</span>
              <span className="flex-1 text-sm font-semibold" style={{ color: '#2a2540' }}>{v.label}</span>
              <div
                className="w-11 h-6 rounded-full flex items-center px-1 transition-all flex-shrink-0"
                style={{ background: on ? 'var(--accent-dark)' : '#d0ccc4' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white transition-all"
                  style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HomeVitals({ initialLatest }: { initialLatest: LatestVitals }) {
  const router = useRouter();
  const [latest, setLatest] = useState<LatestVitals>(initialLatest);
  const [visible, setVisible] = useState<string[]>(DEFAULT_VISIBLE);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { setVisible(loadVisible()); }, []);

  function handleSaved(type: string, displayVal: string) {
    let optimisticValue: Record<string, unknown>;
    if (type === 'blood_pressure') {
      const [sys, dia] = displayVal.split('/').map(Number);
      optimisticValue = { systolic: sys, diastolic: dia };
    } else if (type === 'sleep_hours') {
      optimisticValue = { hours: parseFloat(displayVal) };
    } else {
      optimisticValue = { value: parseFloat(displayVal), unit: VITAL_CONFIG[type]?.unit ?? '' };
    }
    setLatest(prev => ({ ...prev, [type]: { value: optimisticValue, recordedAt: new Date().toISOString() } }));
    router.refresh();
  }

  const shownVitals = visible.filter(k => k in VITAL_CONFIG);

  if (shownVitals.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-bold" style={{ color: '#6a6580' }}>📊 ПОКАЗАТЕЛИ</p>
        <button
          onClick={() => setShowSettings(true)}
          className="text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          ⚙️ Настроить
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {shownVitals.map(type => {
          const cfg = VITAL_CONFIG[type];
          if (!cfg) return null;
          const val = getDisplayValue(type, latest[type] ?? null);
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className="relative rounded-[16px] p-3 flex flex-col gap-1 text-left cursor-pointer active:scale-[0.97] transition-all group hover:opacity-90"
              style={{ background: cfg.bg }}
              aria-label={`Ввести ${cfg.title}`}
            >
              <span className="absolute top-2 right-2 text-[11px] opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: cfg.color }}>✎</span>
              <span className="text-[20px]">{cfg.icon}</span>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                {cfg.title}
              </p>
              {val ? (
                <p className="text-[16px] font-bold" style={{ color: '#2a2540' }}>
                  {val}{' '}
                  <span className="text-[10px] font-normal" style={{ color: '#9a96a8' }}>{cfg.unit}</span>
                </p>
              ) : (
                <p className="text-[11px]" style={{ color: '#9a96a8' }}>Нет данных</p>
              )}
              <p className="text-[9px] mt-auto pt-1" style={{ color: cfg.color, opacity: 0.6 }}>
                Нажмите для ввода
              </p>
            </button>
          );
        })}
      </div>

      {activeType && VITAL_CONFIG[activeType] && (
        <AddVitalModal
          type={activeType}
          cfg={VITAL_CONFIG[activeType]}
          onClose={() => setActiveType(null)}
          onSaved={(type, val) => { handleSaved(type, val); setActiveType(null); }}
        />
      )}

      {showSettings && (
        <VitalsSettingsModal
          visible={visible}
          onClose={() => setShowSettings(false)}
          onChange={setVisible}
        />
      )}
    </>
  );
}
