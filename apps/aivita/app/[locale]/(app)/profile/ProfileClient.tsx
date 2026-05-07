'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { HealthProfile, Allergy, ChronicCondition, HistoryEntry, Medication } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// ─── Select options ───────────────────────────────────────────────────────────

const GENDER_OPTS   = [{ v: 'male', l: 'Мужской' }, { v: 'female', l: 'Женский' }];
const BLOOD_OPTS    = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ v, l: v }));
const SMOKING_OPTS  = [{ v: 'never', l: 'Никогда' }, { v: 'quit', l: 'Бросил(а)' }, { v: 'sometimes', l: 'Иногда' }, { v: 'regular', l: 'Регулярно' }];
const ALCOHOL_OPTS  = [{ v: 'never', l: 'Никогда' }, { v: 'rarely', l: 'Редко' }, { v: 'moderate', l: 'Умеренно' }, { v: 'regular', l: 'Регулярно' }];
const ACTIVITY_OPTS = [{ v: 'sedentary', l: 'Сидячий' }, { v: 'light', l: 'Лёгкая' }, { v: 'moderate', l: 'Умеренная' }, { v: 'active', l: 'Активный' }];
const DIET_OPTS     = [{ v: 'regular', l: 'Обычное' }, { v: 'vegetarian', l: 'Вегетарианское' }, { v: 'vegan', l: 'Веганское' }, { v: 'halal', l: 'Халяль' }];
const SLEEP_OPTS    = [{ v: 'early', l: 'Ранний подъём' }, { v: 'normal', l: 'Обычный' }, { v: 'night', l: 'Ночная сова' }, { v: 'irregular', l: 'Нерегулярный' }];
const STRESS_OPTS   = [{ v: 'low', l: 'Низкий' }, { v: 'medium', l: 'Средний' }, { v: 'high', l: 'Высокий' }, { v: 'chronic', l: 'Хронический' }];
const RELATION_OPTS = [{ v: 'spouse', l: 'Супруг(а)' }, { v: 'parent', l: 'Родитель' }, { v: 'child', l: 'Ребёнок' }, { v: 'sibling', l: 'Брат/Сестра' }, { v: 'friend', l: 'Друг' }, { v: 'other', l: 'Другое' }];

function labelOf(opts: { v: string; l: string }[], val?: string | null): string | null {
  return opts.find(o => o.v === val)?.l ?? val ?? null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/v1/aivita${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/v1/aivita${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiDelete(path: string) {
  await fetch(`${API}/v1/aivita${path}`, { method: 'DELETE', credentials: 'include' });
}

// ─── InlineField ──────────────────────────────────────────────────────────────

interface InlineFieldProps {
  label: string;
  field: string;
  value?: string | number | null;
  displayValue?: string | null;
  inputType?: 'text' | 'number' | 'date' | 'tel';
  options?: { v: string; l: string }[];
  onSave: (field: string, val: string) => Promise<void>;
  placeholder?: string;
}

function InlineField({ label, field, value, displayValue, inputType = 'text', options, onSave, placeholder = '+ добавить' }: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value ?? ''));
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(false);

  useEffect(() => {
    if (!editing) setVal(String(value ?? ''));
  }, [value, editing]);

  const shown: string | null = displayValue ?? (value !== null && value !== undefined ? String(value) : null);

  function startEdit() {
    setVal(String(value ?? ''));
    setEditing(true);
    setErr(false);
  }

  async function commit(newVal: string) {
    const trimmed = newVal.trim();
    if (trimmed === String(value ?? '').trim()) { setEditing(false); return; }
    setSaving(true);
    setErr(false);
    try {
      await onSave(field, trimmed);
      setEditing(false);
    } catch {
      setErr(true);
    } finally {
      setSaving(false);
    }
  }

  const rowClass = 'flex items-center justify-between py-2.5 border-b border-[#f0ede8] last:border-0';

  if (editing) {
    if (options) {
      return (
        <div className={rowClass}>
          <span className="text-[12px] flex-shrink-0 mr-3" style={{ color: '#9a96a8' }}>{label}</span>
          <select
            autoFocus
            value={val}
            className="text-[13px] rounded-[8px] border px-2 py-1 outline-none bg-white max-w-[180px] flex-1"
            style={{ borderColor: err ? '#cc8a96' : '#9889c4', color: '#2a2540' }}
            onChange={e => {
              const v = e.target.value;
              setVal(v);
              // auto-save on change for selects
              setSaving(true);
              onSave(field, v)
                .then(() => setEditing(false))
                .catch(() => setErr(true))
                .finally(() => setSaving(false));
            }}
            onBlur={() => { if (!saving) setEditing(false); }}
          >
            <option value="">— выбрать —</option>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div className={rowClass}>
        <span className="text-[12px] flex-shrink-0 mr-3" style={{ color: '#9a96a8' }}>{label}</span>
        <input
          type={inputType}
          value={val}
          autoFocus
          disabled={saving}
          className="text-[13px] rounded-[8px] border px-2 py-1 outline-none text-right max-w-[180px] flex-1 disabled:opacity-50"
          style={{ borderColor: err ? '#cc8a96' : '#9889c4', color: '#2a2540' }}
          onChange={e => setVal(e.target.value)}
          onBlur={() => commit(val)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); void commit(val); }
            if (e.key === 'Escape') { setEditing(false); }
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="w-full flex items-center justify-between py-2.5 border-b border-[#f0ede8] last:border-0 hover:bg-[#f9f8f5] rounded transition-colors text-left group"
    >
      <span className="text-[12px]" style={{ color: '#9a96a8' }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: shown ? '#2a2540' : '#cc8a96' }}>
        {saving ? '…' : (shown || placeholder)}
      </span>
    </button>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  field: string;
  value: string | number | null;
  unit?: string;
  bg: string;
  color: string;
  inputType?: 'number' | 'text';
  options?: { v: string; l: string }[];
  onSave: (field: string, val: string) => Promise<void>;
  readOnly?: boolean;
}

function MetricCard({ label, field, value, unit, bg, color, inputType = 'text', options, onSave, readOnly }: MetricCardProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value ?? ''));
  const [saving, setSaving]   = useState(false);

  useEffect(() => { if (!editing) setVal(String(value ?? '')); }, [value, editing]);

  async function commit(newVal: string) {
    if (!newVal || newVal === String(value ?? '')) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(field, newVal); setEditing(false); }
    catch { /* keep editing open */ }
    finally { setSaving(false); }
  }

  const displayVal = value !== null && value !== undefined && String(value) !== '' ? String(value) : null;

  return (
    <div
      className="rounded-[14px] p-3 flex flex-col gap-1 cursor-pointer select-none"
      style={{ background: bg }}
      onClick={() => { if (!readOnly && !editing) setEditing(true); }}
    >
      <p className="text-[10px] font-semibold" style={{ color }}>{label}</p>

      {editing && !readOnly ? (
        options ? (
          <select
            autoFocus value={val}
            className="text-[12px] rounded-[6px] border px-1 py-0.5 outline-none bg-white w-full"
            style={{ borderColor: color }}
            onClick={e => e.stopPropagation()}
            onChange={e => {
              const v = e.target.value;
              setVal(v);
              setSaving(true);
              onSave(field, v)
                .then(() => setEditing(false))
                .catch(() => {})
                .finally(() => setSaving(false));
            }}
            onBlur={() => setEditing(false)}
          >
            <option value="">—</option>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ) : (
          <input
            type={inputType} value={val} autoFocus disabled={saving}
            className="text-[14px] font-bold rounded-[6px] border px-1 py-0.5 outline-none w-full disabled:opacity-50"
            style={{ borderColor: color, color: '#2a2540' }}
            onClick={e => e.stopPropagation()}
            onChange={e => setVal(e.target.value)}
            onBlur={() => void commit(val)}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter') void commit(val);
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        )
      ) : (
        displayVal ? (
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
            {saving ? '…' : displayVal}
            {unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: '#9a96a8' }}>{unit}</span>}
          </p>
        ) : (
          <p className="text-[12px] font-medium" style={{ color: readOnly ? '#9a96a8' : '#cc8a96' }}>
            {readOnly ? '—' : '+ добавить'}
          </p>
        )
      )}
    </div>
  );
}

// ─── QuickAddList ─────────────────────────────────────────────────────────────

interface QuickAddItem { id: string; name: string }

function QuickAddList({ items, onAdd, onDelete, placeholder, tagBg, tagColor }: {
  items: QuickAddItem[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => void;
  placeholder: string;
  tagBg: string;
  tagColor: string;
}) {
  const [adding, setAdding] = useState(false);
  const [val, setVal]       = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const name = val.trim();
    if (!name) { setAdding(false); return; }
    setSaving(true);
    try { await onAdd(name); setVal(''); setAdding(false); }
    catch { /* stay open */ }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
      {items.map(item => (
        <span key={item.id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tagBg, color: tagColor }}>
          {item.name}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="opacity-50 hover:opacity-100 leading-none ml-0.5 font-bold"
          >×</button>
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          type="text"
          value={val}
          disabled={saving}
          placeholder={placeholder}
          className="text-[12px] rounded-full border px-2 py-0.5 outline-none disabled:opacity-50"
          style={{ borderColor: tagColor, color: '#2a2540', width: 140 }}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); void handleAdd(); }
            if (e.key === 'Escape') { setVal(''); setAdding(false); }
          }}
          onBlur={() => { if (!val.trim()) setAdding(false); else void handleAdd(); }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-dashed transition-opacity hover:opacity-70"
          style={{ borderColor: tagColor, color: tagColor }}
        >+ добавить</button>
      )}
    </div>
  );
}

// ─── AllergyList ──────────────────────────────────────────────────────────────

function AllergyList({ items, onAdd, onDelete }: {
  items: Allergy[];
  onAdd: (a: Omit<Allergy, 'id'>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [allergen, setAllergen] = useState('');
  const [type, setType]         = useState('other');
  const [severity, setSev]      = useState('mild');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  async function handleAdd() {
    if (!allergen.trim()) { setErr('Введите название'); return; }
    setSaving(true); setErr('');
    try {
      await onAdd({ allergen: allergen.trim(), type, severity });
      setAllergen(''); setAdding(false);
    } catch { setErr('Ошибка. Проверьте подключение'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 items-center mb-1">
        {items.map(a => (
          <span key={a.id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0d4dc]" style={{ color: '#9c5e6c' }}>
            {a.allergen}
            <button type="button" onClick={() => onDelete(a.id)} className="opacity-50 hover:opacity-100 ml-0.5 font-bold">×</button>
          </span>
        ))}
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-dashed hover:opacity-70 transition-opacity" style={{ borderColor: '#9c5e6c', color: '#9c5e6c' }}>
            + добавить
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-[#fdf8f9] rounded-[10px] p-2.5 flex flex-col gap-2 mt-1">
          <input
            autoFocus value={allergen}
            onChange={e => setAllergen(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Аллерген (напр: пенициллин)"
            className="text-[12px] rounded-[8px] border px-2 py-1.5 outline-none w-full"
            style={{ borderColor: '#f0d4dc' }}
          />
          <div className="flex gap-1.5">
            <select value={type} onChange={e => setType(e.target.value)} className="flex-1 text-[11px] rounded-[8px] border px-1.5 py-1 outline-none bg-white" style={{ borderColor: '#f0d4dc' }}>
              <option value="medication">Лекарство</option>
              <option value="food">Еда</option>
              <option value="material">Материал</option>
              <option value="other">Другое</option>
            </select>
            <select value={severity} onChange={e => setSev(e.target.value)} className="flex-1 text-[11px] rounded-[8px] border px-1.5 py-1 outline-none bg-white" style={{ borderColor: '#f0d4dc' }}>
              <option value="mild">Лёгкая</option>
              <option value="moderate">Умеренная</option>
              <option value="severe">Тяжёлая</option>
              <option value="anaphylaxis">Анафилаксия</option>
            </select>
          </div>
          {err && <p className="text-[11px]" style={{ color: '#9c5e6c' }}>{err}</p>}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => void handleAdd()} disabled={saving || !allergen.trim()}
              className="flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold text-white disabled:opacity-40"
              style={{ background: '#9c5e6c' }}>
              {saving ? '…' : 'Добавить'}
            </button>
            <button type="button" onClick={() => { setAllergen(''); setAdding(false); }}
              className="px-3 py-1.5 rounded-[8px] text-[12px]" style={{ color: '#9a96a8' }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] bg-white border border-[#e8e4dc] p-4 mb-3">
      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

// ─── List section row ─────────────────────────────────────────────────────────

function ListSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-2.5 first:pt-0 border-t border-[#f0ede8] first:border-0">
      <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#9a96a8' }}>{label}</p>
      {children}
    </div>
  );
}

// ─── Passport accordion ───────────────────────────────────────────────────────

function PassportSection({ profile, onSave }: {
  profile: HealthProfile | null;
  onSave: (field: string, val: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#e8e4dc] rounded-[12px] mb-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f9f8f5] transition-colors text-left"
      >
        <span className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>🪪 Паспортные данные</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-[#d4e8d8] text-[#548068] font-bold px-1.5 py-0.5 rounded-full">🔒 e2e</span>
          <span className="text-[11px]" style={{ color: '#9a96a8' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-[#e8e4dc]">
          <InlineField label="Дата рождения"  field="birthDate"         value={profile?.birthDate}         inputType="date"   onSave={onSave} />
          <InlineField label="Серия / Номер"  field="pinfl"             value={profile?.pinfl}                                onSave={onSave} />
          <InlineField label="Кем выдан"      field="passportIssuedBy"  value={profile?.passportIssuedBy}                    onSave={onSave} />
          <InlineField label="Дата выдачи"    field="passportIssuedDate" value={profile?.passportIssuedDate} inputType="date" onSave={onSave} />
          <InlineField label="Срок действия"  field="passportExpires"   value={profile?.passportExpires}    inputType="date"   onSave={onSave} />
        </div>
      )}
    </div>
  );
}

// ─── Completion ───────────────────────────────────────────────────────────────

function calcCompletion(p: HealthProfile | null, allergies: Allergy[]): number {
  if (!p) return 0;
  const fields = [
    { filled: !!p.birthDate, w: 3 }, { filled: !!p.gender, w: 3 },
    { filled: !!p.heightCm, w: 3 }, { filled: !!p.weightKg, w: 3 },
    { filled: allergies.length > 0, w: 3 }, { filled: !!p.city, w: 2 },
    { filled: !!p.bloodType, w: 2 }, { filled: !!p.smokingStatus, w: 2 },
    { filled: !!p.exerciseFrequency, w: 2 }, { filled: !!p.emergencyContactName, w: 2 },
    { filled: !!p.dietType, w: 1 }, { filled: !!p.doctorName, w: 1 },
  ];
  const total = fields.reduce((s, f) => s + f.w, 0);
  const done  = fields.filter(f => f.filled).reduce((s, f) => s + f.w, 0);
  return Math.round((done / total) * 100);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  locale: string;
  profile: HealthProfile | null;
  allergies: Allergy[];
  chronic: ChronicCondition[];
  history: HistoryEntry[];
  medications: Medication[];
}

export function ProfileClient({ locale, profile: initProfile, allergies: initAllergies, chronic: initChronic, history: initHistory, medications: initMeds }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [profile,   setProfile]   = useState<HealthProfile | null>(initProfile);
  const [allergies, setAllergies] = useState<Allergy[]>(initAllergies);
  const [chronic,   setChronic]   = useState<ChronicCondition[]>(initChronic);
  const [history,   setHistory]   = useState<HistoryEntry[]>(initHistory);
  const [meds,      setMeds]      = useState<Medication[]>(initMeds);

  function refresh() { startTransition(() => router.refresh()); }

  // ── Save profile field ──────────────────────────────────────────────────────
  async function saveField(field: string, value: string) {
    const body: Record<string, string | number> = {
      [field]: field === 'heightCm' ? Number(value) : value,
    };
    const json = await apiPut('/health-profile', body);
    setProfile(json.data as HealthProfile);
    refresh();
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const bmi = profile?.heightCm && profile?.weightKg
    ? (Number(profile.weightKg) / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
    : null;
  const completion = calcCompletion(profile, allergies);

  // ── Allergies ───────────────────────────────────────────────────────────────
  async function addAllergy(data: Omit<Allergy, 'id'>) {
    const json = await apiPost('/health-profile/allergies', data as Record<string, unknown>);
    setAllergies(prev => [...prev, json.data as Allergy]);
  }
  function deleteAllergy(id: string) {
    void apiDelete(`/health-profile/allergies/${id}`);
    setAllergies(prev => prev.filter(x => x.id !== id));
  }

  // ── Chronic ─────────────────────────────────────────────────────────────────
  async function addChronic(name: string) {
    const json = await apiPost('/health-profile/chronic-conditions', { name });
    setChronic(prev => [...prev, json.data as ChronicCondition]);
  }
  function deleteChronic(id: string) {
    void apiDelete(`/health-profile/chronic-conditions/${id}`);
    setChronic(prev => prev.filter(x => x.id !== id));
  }

  // ── History ─────────────────────────────────────────────────────────────────
  async function addHistory(name: string, type: string) {
    const json = await apiPost('/health-profile/medical-history', { name, type });
    setHistory(prev => [...prev, json.data as HistoryEntry]);
  }
  function deleteHistory(id: string) {
    void apiDelete(`/health-profile/medical-history/${id}`);
    setHistory(prev => prev.filter(x => x.id !== id));
  }

  // ── Medications ─────────────────────────────────────────────────────────────
  async function addMed(name: string) {
    const json = await apiPost('/health-profile/medications', { name });
    setMeds(prev => [...prev, json.data as Medication]);
  }
  function deleteMed(id: string) {
    void apiDelete(`/health-profile/medications/${id}`);
    setMeds(prev => prev.filter(x => x.id !== id));
  }

  // ── Partition history by type ───────────────────────────────────────────────
  const surgeries    = history.filter(h => h.type === 'surgery');
  const illnesses    = history.filter(h => h.type !== 'surgery' && h.type !== 'other');
  const vaccinations = history.filter(h => h.type === 'other');

  return (
    <>
      {/* ── Completion bar ──────────────────────────────────────────────────── */}
      <section className="rounded-[16px] bg-white border border-[#e8e4dc] p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Профиль заполнен</p>
          <p className="text-[13px] font-bold" style={{ color: '#9c5e6c' }}>{completion}%</p>
        </div>
        <div className="h-2 rounded-full bg-[#f0d4dc] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completion}%`, background: 'linear-gradient(90deg,#9c5e6c,#6e5fa0)' }} />
        </div>
        {completion < 100 && (
          <p className="text-[11px] mt-1.5" style={{ color: '#9a96a8' }}>
            Заполните профиль для лучших AI-рекомендаций
          </p>
        )}
      </section>

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-4 gap-2 mb-4">
        <MetricCard label="Рост"  field="heightCm" value={profile?.heightCm ?? null} unit="см" bg="#f0d4dc" color="#9c5e6c" inputType="number" onSave={saveField} />
        <MetricCard label="Вес"   field="weightKg" value={profile?.weightKg ?? null} unit="кг" bg="#e0d8f0" color="#6e5fa0" inputType="number" onSave={saveField} />
        <MetricCard label="ИМТ"   field="bmi"      value={bmi}                        bg="#d4e8d8" color="#548068" onSave={saveField} readOnly />
        <MetricCard label="Кровь" field="bloodType" value={profile?.bloodType ?? null} bg="#d4dff0" color="#5e75a8" options={BLOOD_OPTS} onSave={saveField} />
      </section>

      {/* ── Profile chips ────────────────────────────────────────────────────── */}
      {(profile?.gender || profile?.city || profile?.bloodType) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.gender   && <span className="bg-[#e0d8f0] text-[#6e5fa0] text-[11px] font-semibold px-2 py-0.5 rounded-full">{labelOf(GENDER_OPTS, profile.gender)}</span>}
          {profile.city     && <span className="bg-[#d4dff0] text-[#5e75a8] text-[11px] font-semibold px-2 py-0.5 rounded-full">📍 {profile.city}</span>}
          {profile.bloodType && <span className="bg-[#f0d4dc] text-[#9c5e6c] text-[11px] font-semibold px-2 py-0.5 rounded-full">🩸 {profile.bloodType}</span>}
        </div>
      )}

      {/* ── Two-column grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">

        {/* Personal data */}
        <Card title="Личные данные" icon="👤">
          <PassportSection profile={profile} onSave={saveField} />
          <InlineField label="Пол"      field="gender"   value={profile?.gender}   displayValue={labelOf(GENDER_OPTS, profile?.gender)} options={GENDER_OPTS} onSave={saveField} />
          <InlineField label="Город"    field="city"     value={profile?.city}     onSave={saveField} />
          <InlineField label="Телефон"  field="phone"    value={profile?.phone}    inputType="tel" onSave={saveField} />
          <InlineField label="Telegram" field="telegram" value={profile?.telegram} onSave={saveField} placeholder="@username" />
          <InlineField label="WhatsApp" field="whatsapp" value={profile?.whatsapp} inputType="tel" onSave={saveField} />
        </Card>

        {/* Lifestyle */}
        <Card title="Образ жизни" icon="🌿">
          <InlineField label="Курение"         field="smokingStatus"    value={profile?.smokingStatus}    displayValue={labelOf(SMOKING_OPTS, profile?.smokingStatus)}    options={SMOKING_OPTS}  onSave={saveField} />
          <InlineField label="Алкоголь"        field="alcoholFrequency" value={profile?.alcoholFrequency} displayValue={labelOf(ALCOHOL_OPTS, profile?.alcoholFrequency)}  options={ALCOHOL_OPTS}  onSave={saveField} />
          <InlineField label="Активность"      field="exerciseFrequency" value={profile?.exerciseFrequency} displayValue={labelOf(ACTIVITY_OPTS, profile?.exerciseFrequency)} options={ACTIVITY_OPTS} onSave={saveField} />
          <InlineField label="Питание"         field="dietType"         value={profile?.dietType}         displayValue={labelOf(DIET_OPTS, profile?.dietType)}              options={DIET_OPTS}     onSave={saveField} />
          <InlineField label="Режим сна"       field="sleepSchedule"    value={profile?.sleepSchedule}    displayValue={labelOf(SLEEP_OPTS, profile?.sleepSchedule)}        options={SLEEP_OPTS}    onSave={saveField} />
          <InlineField label="Уровень стресса" field="stressLevel"      value={profile?.stressLevel}      displayValue={labelOf(STRESS_OPTS, profile?.stressLevel)}         options={STRESS_OPTS}   onSave={saveField} />
        </Card>

        {/* Medical profile */}
        <Card title="Медицинский профиль" icon="🏥">
          <div className="space-y-3">
            <ListSection label="Аллергии">
              <AllergyList items={allergies} onAdd={addAllergy} onDelete={deleteAllergy} />
            </ListSection>
            <ListSection label="Хронические заболевания">
              <QuickAddList
                items={chronic.map(c => ({ id: c.id, name: c.name + (c.diagnosedYear ? ` (${c.diagnosedYear})` : '') }))}
                onAdd={addChronic} onDelete={deleteChronic}
                placeholder="Название болезни" tagBg="#d4dff0" tagColor="#5e75a8"
              />
            </ListSection>
            <ListSection label="Препараты">
              <QuickAddList
                items={meds.map(m => ({ id: m.id, name: m.dosage ? `${m.name} ${m.dosage}` : m.name }))}
                onAdd={addMed} onDelete={deleteMed}
                placeholder="Название препарата" tagBg="#d4e8d8" tagColor="#548068"
              />
            </ListSection>
            <ListSection label="Прививки">
              <QuickAddList
                items={vaccinations.map(v => ({ id: v.id, name: v.name }))}
                onAdd={n => addHistory(n, 'other')} onDelete={deleteHistory}
                placeholder="Название прививки" tagBg="#e0d8f0" tagColor="#6e5fa0"
              />
            </ListSection>
            <ListSection label="Операции">
              <QuickAddList
                items={surgeries.map(s => ({ id: s.id, name: s.name }))}
                onAdd={n => addHistory(n, 'surgery')} onDelete={deleteHistory}
                placeholder="Название операции" tagBg="#f0ede8" tagColor="#9a96a8"
              />
            </ListSection>
            <ListSection label="История болезней">
              <QuickAddList
                items={illnesses.map(h => ({ id: h.id, name: h.name }))}
                onAdd={n => addHistory(n, 'illness')} onDelete={deleteHistory}
                placeholder="Название болезни" tagBg="#f4f3ef" tagColor="#6a6580"
              />
            </ListSection>
          </div>
        </Card>

        {/* Emergency contacts */}
        <Card title="Экстренные контакты" icon="🆘">
          <InlineField label="Контактное лицо" field="emergencyContactName"     value={profile?.emergencyContactName}     onSave={saveField} />
          <InlineField label="Телефон"         field="emergencyContactPhone"    value={profile?.emergencyContactPhone}    inputType="tel" onSave={saveField} />
          <InlineField label="Кем приходится"  field="emergencyContactRelation" value={profile?.emergencyContactRelation} displayValue={labelOf(RELATION_OPTS, profile?.emergencyContactRelation)} options={RELATION_OPTS} onSave={saveField} />
          <InlineField label="Мой врач"        field="doctorName"               value={profile?.doctorName}               onSave={saveField} />
          <InlineField label="Телефон врача"   field="doctorPhone"              value={profile?.doctorPhone}              inputType="tel" onSave={saveField} />
          <InlineField label="Моя клиника"     field="clinic"                   value={profile?.clinic}                   onSave={saveField} />
        </Card>

        {/* Family */}
        <Card title="Моя семья" icon="👨‍👩‍👧">
          <p className="text-[13px] text-center py-3" style={{ color: '#9a96a8' }}>Нет членов семьи</p>
          <Link
            href={`/${locale}/family`}
            className="block text-center text-[13px] font-semibold py-2 rounded-[12px] border border-[#e8e4dc] hover:bg-[#f4f3ef] transition-colors"
            style={{ color: '#6e5fa0' }}
          >
            + Пригласить члена семьи
          </Link>
          <div className="mt-3 rounded-[10px] bg-[#f4f3ef] p-3">
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#6a6580' }}>Семья видит: <span className="font-normal">Health Score, шаги, вода</span></p>
            <p className="text-[11px] font-semibold" style={{ color: '#6a6580' }}>Семья НЕ видит: <span className="font-normal">AI-чат, документы, паспорт</span></p>
          </div>
        </Card>

        {/* Insurance */}
        <Card title="Страхование" icon="🛡️">
          <InlineField label="Страховая компания" field="insuranceCompany" value={profile?.insuranceCompany} onSave={saveField} />
          <InlineField label="Номер полиса"       field="insuranceNumber"  value={profile?.insuranceNumber}  onSave={saveField} />
          <InlineField label="Срок действия"      field="insuranceExpires" value={profile?.insuranceExpires} inputType="date" onSave={saveField} />
          <InlineField label="Горячая линия"      field="insuranceHotline" value={profile?.insuranceHotline} inputType="tel"  onSave={saveField} />
        </Card>
      </div>
    </>
  );
}
