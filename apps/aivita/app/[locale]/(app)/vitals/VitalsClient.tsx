'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { VitalRow, LatestVitals } from './types';
import Modal from '@/components/ui/Modal';

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
  { type: 'heart_rate',   label: 'Пульс',         unit: 'bpm',   min: 30,  max: 250, icon: '❤️',  color: 'var(--accent-dark)', bg: 'var(--accent-light)' },
  { type: 'blood_pressure', label: 'Давление',     unit: 'mmHg', min: 40,  max: 250, icon: '🩺',  color: '#5e75a8', bg: '#d4dff0', dual: true },
  { type: 'blood_sugar',  label: 'Сахар',          unit: 'мг/дл',min: 20,  max: 600, icon: '🩸',  color: 'var(--accent-dark)', bg: 'var(--accent-light)' },
  { type: 'temperature',  label: 'Температура',    unit: '°C',   min: 34,  max: 42,  step: 0.1, icon: '🌡️', color: '#688844', bg: '#d4e8d8' },
  { type: 'weight',       label: 'Вес',            unit: 'кг',   min: 20,  max: 300, step: 0.1, icon: '⚖️', color: 'var(--accent-dark)', bg: 'var(--accent-bg-light)' },
  { type: 'sleep_hours',  label: 'Сон',            unit: 'часов',min: 0,   max: 24,  step: 0.5, icon: '😴', color: '#5e75a8', bg: '#d4dff0' },
  { type: 'water_ml',     label: 'Вода',           unit: 'мл',   min: 0,   max: 10000,step: 100, icon: '💧', color: '#548068', bg: '#d4e8d8' },
  { type: 'steps',        label: 'Шаги',           unit: 'шагов',min: 0,   max: 100000, icon: '👟', color: 'var(--accent-dark)', bg: 'var(--accent-bg-light)' },
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

// ─── AI Monitor Alerts ────────────────────────────────────────────────────────

interface Alert {
  icon: string;
  title: string;
  text: string;
  level: 'warn' | 'danger' | 'ok';
}

function getAlerts(latest: LatestVitals): Alert[] {
  const alerts: Alert[] = [];

  // Heart rate
  const hr = (latest['heart_rate']?.value as { value?: number })?.value;
  if (hr !== undefined) {
    if (hr > 100) alerts.push({ icon: '❤️', level: 'warn', title: 'Пульс повышен', text: `${hr} bpm — выше нормы (60–100 bpm). Отдохните и измерьте повторно.` });
    else if (hr < 50) alerts.push({ icon: '❤️', level: 'warn', title: 'Пульс занижен', text: `${hr} bpm — ниже нормы (60–100 bpm). Обратитесь к врачу.` });
    else alerts.push({ icon: '❤️', level: 'ok', title: 'Пульс в норме', text: `${hr} bpm — в пределах нормы (60–100 bpm).` });
  }

  // Blood pressure
  const bp = latest['blood_pressure']?.value as { systolic?: number; diastolic?: number } | undefined;
  if (bp?.systolic !== undefined && bp?.diastolic !== undefined) {
    if (bp.systolic >= 140 || bp.diastolic >= 90) {
      alerts.push({ icon: '🩺', level: 'danger', title: 'Давление высокое', text: `${bp.systolic}/${bp.diastolic} mmHg — гипертония. Обратитесь к врачу.` });
    } else if (bp.systolic < 90 || bp.diastolic < 60) {
      alerts.push({ icon: '🩺', level: 'warn', title: 'Давление низкое', text: `${bp.systolic}/${bp.diastolic} mmHg — гипотония. Пейте больше воды.` });
    } else {
      alerts.push({ icon: '🩺', level: 'ok', title: 'Давление в норме', text: `${bp.systolic}/${bp.diastolic} mmHg — нормальный уровень.` });
    }
  }

  // Blood sugar
  const sugar = (latest['blood_sugar']?.value as { value?: number })?.value;
  if (sugar !== undefined) {
    if (sugar > 126) alerts.push({ icon: '🩸', level: 'danger', title: 'Сахар повышен', text: `${sugar} мг/дл — вероятная гипергликемия. Проконсультируйтесь с врачом.` });
    else if (sugar < 70) alerts.push({ icon: '🩸', level: 'danger', title: 'Сахар занижен', text: `${sugar} мг/дл — гипогликемия. Съешьте что-нибудь сладкое.` });
    else alerts.push({ icon: '🩸', level: 'ok', title: 'Сахар в норме', text: `${sugar} мг/дл — в пределах нормы (70–126 мг/дл).` });
  }

  // Temperature
  const temp = (latest['temperature']?.value as { value?: number })?.value;
  if (temp !== undefined) {
    if (temp >= 38) alerts.push({ icon: '🌡️', level: 'danger', title: 'Температура высокая', text: `${temp}°C — жар. Примите жаропонижающее и обратитесь к врачу.` });
    else if (temp >= 37.5) alerts.push({ icon: '🌡️', level: 'warn', title: 'Температура повышена', text: `${temp}°C — субфебрильная. Наблюдайте за динамикой.` });
    else if (temp < 36) alerts.push({ icon: '🌡️', level: 'warn', title: 'Температура понижена', text: `${temp}°C — ниже нормы. Согрейтесь.` });
    else alerts.push({ icon: '🌡️', level: 'ok', title: 'Температура в норме', text: `${temp}°C — нормальная температура тела.` });
  }

  // Sleep
  const sleep = (latest['sleep_hours']?.value as { hours?: number })?.hours;
  if (sleep !== undefined) {
    if (sleep < 6) alerts.push({ icon: '😴', level: 'warn', title: 'Мало сна', text: `${sleep} ч — недосыпание. Рекомендуется 7–9 часов в сутки.` });
    else if (sleep > 10) alerts.push({ icon: '😴', level: 'warn', title: 'Много сна', text: `${sleep} ч — избыточный сон. Может указывать на усталость или болезнь.` });
    else alerts.push({ icon: '😴', level: 'ok', title: 'Сон в норме', text: `${sleep} ч — хороший сон. Отличная работа!` });
  }

  // SpO2
  const spo2 = (latest['spo2']?.value as { value?: number })?.value;
  if (spo2 !== undefined) {
    if (spo2 < 94) alerts.push({ icon: '🫁', level: 'danger', title: 'SpO2 критически низкий', text: `${spo2}% — опасно низкий уровень кислорода. Срочно обратитесь к врачу.` });
    else if (spo2 < 96) alerts.push({ icon: '🫁', level: 'warn', title: 'SpO2 снижен', text: `${spo2}% — чуть ниже нормы (96–100%). Следите за дыханием.` });
    else alerts.push({ icon: '🫁', level: 'ok', title: 'SpO2 в норме', text: `${spo2}% — нормальный уровень кислорода.` });
  }

  // Water
  const water = (latest['water_ml']?.value as { value?: number })?.value;
  if (water !== undefined) {
    if (water < 1500) alerts.push({ icon: '💧', level: 'warn', title: 'Мало воды', text: `${water} мл — пейте больше. Рекомендуется 2000–2500 мл в день.` });
    else alerts.push({ icon: '💧', level: 'ok', title: 'Водный баланс в норме', text: `${water} мл — хорошее потребление воды.` });
  }

  // Steps
  const steps = (latest['steps']?.value as { value?: number })?.value;
  if (steps !== undefined) {
    if (steps < 5000) alerts.push({ icon: '👟', level: 'warn', title: 'Мало шагов', text: `${steps.toLocaleString()} шагов — старайтесь ходить больше. Цель: 8000–10000 шагов.` });
    else if (steps >= 10000) alerts.push({ icon: '👟', level: 'ok', title: 'Отличная активность', text: `${steps.toLocaleString()} шагов — вы достигли дневной нормы!` });
    else alerts.push({ icon: '👟', level: 'ok', title: 'Хорошая активность', text: `${steps.toLocaleString()} шагов — хороший результат.` });
  }

  return alerts;
}

const LEVEL_STYLE: Record<Alert['level'], { bg: string; border: string; badge: string; badgeText: string }> = {
  danger: { bg: '#fff0f0', border: '#ffc5c5', badge: '#ff4444', badgeText: 'Внимание' },
  warn:   { bg: '#fffbec', border: '#ffe4a0', badge: '#e8a000', badgeText: 'Следите' },
  ok:     { bg: '#f0faf4', border: '#b8e8c8', badge: '#3aa86a', badgeText: 'Норма' },
};

function MonitorAlerts({ latest }: { latest: LatestVitals }) {
  const alerts = getAlerts(latest);
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const dangerCount = alerts.filter(a => a.level === 'danger').length;
  const warnCount = alerts.filter(a => a.level === 'warn').length;
  const visible = expanded ? alerts : alerts.filter(a => a.level !== 'ok').slice(0, 3);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold" style={{ color: '#6a6580' }}>AI-МОНИТОР</h2>
        <div className="flex items-center gap-1.5">
          {dangerCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#ff4444' }}>
              {dangerCount} критично
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#e8a000' }}>
              {warnCount} внимание
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {visible.map((alert, i) => {
          const s = LEVEL_STYLE[alert.level];
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-[14px] border"
              style={{ background: s.bg, borderColor: s.border }}
            >
              <span className="text-[18px] flex-shrink-0 mt-0.5">{alert.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>{alert.title}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: s.badge }}>
                    {s.badgeText}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: '#6a6580' }}>{alert.text}</p>
              </div>
            </div>
          );
        })}
      </div>
      {alerts.length > visible.length && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 w-full text-[12px] font-semibold py-2 rounded-[12px] transition-colors hover:bg-[#f4f3ef]"
          style={{ color: '#9a96a8' }}
        >
          Показать все {alerts.length} показателей ↓
        </button>
      )}
      {expanded && alerts.some(a => a.level === 'ok') && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-1 w-full text-[12px] font-semibold py-2 rounded-[12px] transition-colors hover:bg-[#f4f3ef]"
          style={{ color: '#9a96a8' }}
        >
          Свернуть ↑
        </button>
      )}
    </section>
  );
}

// ─── Latest Vitals Grid ────────────────────────────────────────────────────────

function LatestGrid({ latest, onCardClick }: { latest: LatestVitals; onCardClick: (type: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {VITAL_DEFS.map((def) => {
        const row = latest[def.type];
        const val = row ? formatValue(row as VitalRow) : null;
        return (
          <div
            key={def.type}
            className="rounded-[16px] p-3 flex flex-col gap-1 cursor-pointer active:scale-95 transition-transform"
            style={{ background: def.bg }}
            onClick={() => onCardClick(def.type)}
            role="button"
            aria-label={`Добавить ${def.label}`}
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

interface AddVitalModalProps {
  onClose: () => void;
  onSaved: () => void;
  initialType?: string;
}

function AddVitalModal({ onClose, onSaved, initialType }: AddVitalModalProps) {
  const [type, setType] = useState(initialType ?? 'heart_rate');
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
      if (def.type === 'sleep_hours') {
        valuePayload = { hours: num };
      } else if (def.type === 'water_ml' || def.type === 'steps') {
        valuePayload = { value: num };
      } else {
        valuePayload = { value: num, unit: def.unit };
      }
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
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения, попробуйте ещё раз');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Добавить показатель"
      footer={
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          {saving ? 'Сохранение...' : '💾 Сохранить'}
        </button>
      }
    >
      {/* Type selector */}
      <label className="block text-xs font-semibold mb-1 text-app-t3">Тип</label>
      <select
        value={type}
        onChange={(e) => { setType(e.target.value); setValue(''); setSystolic(''); setDiastolic(''); }}
        className="w-full rounded-xl border px-3 py-2.5 text-sm mb-4 outline-none"
        style={{ color: '#2a2540' }}
      >
        {VITAL_DEFS.map((d) => (
          <option key={d.type} value={d.type}>{d.icon} {d.label}</option>
        ))}
      </select>

      {/* Value input */}
      {def.dual ? (
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1 text-app-t3">Верхнее (систолическое)</label>
            <input
              type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)}
              placeholder="120" min={def.min} max={def.max}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ color: '#2a2540' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1 text-app-t3">Нижнее (диастолическое)</label>
            <input
              type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)}
              placeholder="80" min={40} max={150}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ color: '#2a2540' }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1 text-app-t3">
            Значение ({def.unit})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" value={value} onChange={(e) => setValue(e.target.value)}
              placeholder={`${def.min}–${def.max}`}
              min={def.min} max={def.max} step={def.step ?? 1}
              className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ color: '#2a2540' }}
            />
            <span className="text-xs text-app-t3">{def.unit}</span>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="mb-2">
        <label className="block text-xs font-semibold mb-1 text-app-t3">Заметка (необязательно)</label>
        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Например: после пробежки"
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ color: '#2a2540' }}
        />
      </div>

      {error && <p className="text-xs mt-2 font-semibold text-[color:var(--accent-dark)]">{error}</p>}
    </Modal>
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
  const [modalType, setModalType] = useState<string>('heart_rate');
  const [, startTransition] = useTransition();

  function handleSaved() {
    startTransition(() => router.refresh());
    // Reload via Next.js proxy (cookie forwarded server-side)
    fetch('/api/vitals')
      .then((r) => r.json())
      .then((json) => { if (json.data) setRows(json.data); })
      .catch(() => {});

    fetch('/api/vitals/latest')
      .then((r) => r.json())
      .then((json) => { if (json.data) setLatest(json.data); })
      .catch(() => {});
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    fetch(`/api/vitals/${id}`, { method: 'DELETE' }).catch(() => {});
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
          style={{ background: 'linear-gradient(135deg, var(--accent-rose-light) 0%, var(--accent) 100%)' }}
          aria-label="Добавить показатель"
        >
          +
        </button>
      </div>

      {/* AI Monitor Alerts */}
      <MonitorAlerts latest={latest} />

      {/* Latest vitals grid */}
      <section className="mb-6">
        <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ПОСЛЕДНИЕ ПОКАЗАТЕЛИ</h2>
        <LatestGrid latest={latest} onCardClick={(type) => { setModalType(type); setShowModal(true); }} />
      </section>

      {/* History */}
      <section className="mb-6">
        <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ИСТОРИЯ ЗАПИСЕЙ</h2>
        <div className="rounded-[20px] bg-white border p-3 border-app-border">
          <HistoryList rows={rows} onDelete={handleDelete} />
        </div>
      </section>

      {/* Add button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3.5 rounded-[16px] text-[14px] font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
      >
        + Добавить показатель
      </button>

      {showModal && (
        <AddVitalModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          initialType={modalType}
        />
      )}
    </>
  );
}
