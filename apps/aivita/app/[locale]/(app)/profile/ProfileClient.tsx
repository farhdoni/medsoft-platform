'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { HealthProfile, Allergy, ChronicCondition, HistoryEntry, Medication } from './page';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// ─── Options ──────────────────────────────────────────────────────────────────

const GENDER_OPTS   = [{ v: 'male', l: 'Мужской' }, { v: 'female', l: 'Женский' }];
const BLOOD_OPTS    = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ v, l: v }));
const SMOKING_OPTS  = [{ v: 'never', l: 'Никогда' }, { v: 'quit', l: 'Бросил(а)' }, { v: 'sometimes', l: 'Иногда' }, { v: 'regular', l: 'Регулярно' }];
const ALCOHOL_OPTS  = [{ v: 'never', l: 'Никогда' }, { v: 'rarely', l: 'Редко' }, { v: 'moderate', l: 'Умеренно' }, { v: 'regular', l: 'Регулярно' }];
const ACTIVITY_OPTS = [{ v: 'sedentary', l: 'Сидячий' }, { v: 'light', l: 'Лёгкая' }, { v: 'moderate', l: 'Умеренная' }, { v: 'active', l: 'Активный' }];
const DIET_OPTS     = [{ v: 'regular', l: 'Обычное' }, { v: 'vegetarian', l: 'Вегетарианское' }, { v: 'vegan', l: 'Веганское' }, { v: 'halal', l: 'Халяль' }];
const SLEEP_OPTS    = [{ v: 'early', l: 'Ранний подъём' }, { v: 'normal', l: 'Обычный' }, { v: 'night', l: 'Ночная сова' }, { v: 'irregular', l: 'Нерегулярный' }];
const STRESS_OPTS   = [{ v: 'low', l: 'Низкий' }, { v: 'medium', l: 'Средний' }, { v: 'high', l: 'Высокий' }, { v: 'chronic', l: 'Хронический' }];
const RELATION_OPTS = [{ v: 'spouse', l: 'Супруг(а)' }, { v: 'parent', l: 'Родитель' }, { v: 'child', l: 'Ребёнок' }, { v: 'sibling', l: 'Брат/Сестра' }, { v: 'friend', l: 'Друг' }, { v: 'other', l: 'Другое' }];

function labelOf(opts: { v: string; l: string }[], val?: string | null) {
  return opts.find(o => o.v === val)?.l ?? val ?? null;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function putProfile(body: Record<string, string | number>) {
  const res = await fetch(`${API}/v1/aivita/health-profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('save_failed');
  return (await res.json()).data as HealthProfile;
}

// ─── InlineField — universal click-to-edit row ────────────────────────────────

interface InlineFieldProps {
  label: string;
  field: string;
  value?: string | number | null;
  displayValue?: string | null;   // formatted label for selects
  inputType?: 'text' | 'number' | 'date' | 'tel';
  options?: { v: string; l: string }[];
  onSave: (field: string, val: string) => Promise<void>;
  placeholder?: string;
}

function InlineField({
  label, field, value, displayValue, inputType = 'text', options, onSave, placeholder = '+ добавить',
}: InlineFieldProps) {
  const [editing, setEditing]   = useState(false);
  const [val, setVal]           = useState(String(value ?? ''));
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState(false);
  const inputRef                = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Sync external value changes (after server refresh)
  useEffect(() => { if (!editing) setVal(String(value ?? '')); }, [value, editing]);

  const shown = displayValue ?? (typeof value === 'number' ? String(value) : value) ?? null;

  function startEdit() { setVal(String(value ?? '')); setEditing(true); setErr(false); }

  async function commit(newVal: string) {
    if (newVal === String(value ?? '')) { setEditing(false); return; }
    setSaving(true); setErr(false);
    try {
      await onSave(field, newVal);
      setEditing(false);
    } catch {
      setErr(true);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    if (options) {
      return (
        <div className={`flex items-center justify-between py-2 border-b border-[#f0ede8] last:border-0 ${err ? 'bg-red-50' : ''}`}>
          <span className="text-[12px] flex-shrink-0 mr-2" style={{ color: '#9a96a8' }}>{label}</span>
          <select
            autoFocus
            value={val}
            onChange={async e => { const v = e.target.value; setVal(v); await commit(v); }}
            onBlur={() => setEditing(false)}
            className="text-[13px] rounded-[8px] border px-2 py-1 outline-none bg-white flex-1 max-w-[200px]"
            style={{ borderColor: '#9889c4', color: '#2a2540' }}
          >
            <option value="">— выбрать —</option>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-between py-2 border-b border-[#f0ede8] last:border-0 ${err ? 'bg-red-50' : ''}`}>
        <span className="text-[12px] flex-shrink-0 mr-2" style={{ color: '#9a96a8' }}>{label}</span>
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type={inputType}
          value={val}
          autoFocus
          onChange={e => setVal(e.target.value)}
          onBlur={() => commit(val)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(val); } if (e.key === 'Escape') setEditing(false); }}
          disabled={saving}
          className="text-[13px] rounded-[8px] border px-2 py-1 outline-none text-right flex-1 max-w-[200px] disabled:opacity-50"
          style={{ borderColor: err ? '#cc8a96' : '#9889c4', color: '#2a2540' }}
        />
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="w-full flex items-center justify-between py-2 border-b border-[#f0ede8] last:border-0 hover:bg-[#f9f8f5] -mx-1 px-1 rounded transition text-left group"
    >
      <span className="text-[12px]" style={{ color: '#9a96a8' }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: shown ? '#2a2540' : '#cc8a96' }}>
        {saving ? '…' : (shown || placeholder)}
        {shown && <span className="ml-1 opacity-0 group-hover:opacity-40 text-[10px]">✎</span>}
      </span>
    </button>
  );
}

// ─── MetricCard — clickable card for height/weight/blood ─────────────────────

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  bg: string;
  color: string;
  field: string;
  inputType?: 'number' | 'text';
  options?: { v: string; l: string }[];
  onSave: (field: string, val: string) => Promise<void>;
  readOnly?: boolean;
}

function MetricCard({ label, value, unit, bg, color, field, inputType = 'text', options, onSave, readOnly }: MetricCardProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value ?? ''));
  const [saving, setSaving]   = useState(false);

  useEffect(() => { if (!editing) setVal(String(value ?? '')); }, [value, editing]);

  async function commit(newVal: string) {
    if (!newVal || newVal === String(value ?? '')) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(field, newVal); setEditing(false); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="rounded-[14px] p-3 flex flex-col gap-1 cursor-pointer select-none transition-transform active:scale-95"
      style={{ background: bg }}
      onClick={() => !readOnly && !editing && setEditing(true)}
    >
      <p className="text-[10px] font-semibold" style={{ color }}>{label}</p>
      {editing && !readOnly ? (
        options ? (
          <select
            autoFocus value={val}
            onChange={async e => { setVal(e.target.value); await commit(e.target.value); }}
            onBlur={() => setEditing(false)}
            className="text-[13px] rounded-[6px] border px-1 py-0.5 outline-none bg-white w-full"
            style={{ borderColor: color }}
            onClick={e => e.stopPropagation()}
          >
            <option value="">—</option>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ) : (
          <input
            type={inputType} value={val} autoFocus
            onChange={e => setVal(e.target.value)}
            onBlur={() => commit(val)}
            onKeyDown={e => { if (e.key === 'Enter') commit(val); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
            disabled={saving}
            className="text-[14px] font-bold rounded-[6px] border px-1 py-0.5 outline-none w-full disabled:opacity-50"
            style={{ borderColor: color, color: '#2a2540' }}
          />
        )
      ) : (
        value !== null && value !== undefined && value !== '' ? (
          <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
            {saving ? '…' : value}
            {unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: '#9a96a8' }}>{unit}</span>}
          </p>
        ) : (
          <p className="text-[12px] font-medium" style={{ color: '#cc8a96' }}>
            {readOnly ? '—' : '+ добавить'}
          </p>
        )
      )}
    </div>
  );
}

// ─── QuickAddList — inline tag list with add-by-Enter ─────────────────────────

interface QuickAddListProps {
  items: { id: string; name: string }[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => void;
  placeholder: string;
  tagBg: string;
  tagColor: string;
}

function QuickAddList({ items, onAdd, onDelete, placeholder, tagBg, tagColor }: QuickAddListProps) {
  const [adding, setAdding] = useState(false);
  const [val, setVal]       = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!val.trim()) { setAdding(false); return; }
    setSaving(true);
    try { await onAdd(val.trim()); setVal(''); setAdding(false); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {items.map(item => (
        <span key={item.id} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tagBg, color: tagColor }}>
          {item.name}
          <button onClick={() => onDelete(item.id)} className="opacity-50 hover:opacity-100 ml-0.5 leading-none">×</button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus value={val} disabled={saving}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setVal(''); setAdding(false); } }}
          onBlur={() => { if (!val.trim()) setAdding(false); else handleAdd(); }}
          placeholder={placeholder}
          className="text-[12px] rounded-full border px-2 py-0.5 outline-none disabled:opacity-50"
          style={{ borderColor: tagColor, color: '#2a2540', width: 120 }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-dashed transition hover:opacity-80"
          style={{ borderColor: tagColor, color: tagColor }}
        >
          + добавить
        </button>
      )}
    </div>
  );
}

// ─── AllergyList — special case with type+severity ───────────────────────────

function AllergyList({ items, onAdd, onDelete }: {
  items: Allergy[];
  onAdd: (a: Omit<Allergy, 'id'>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [allergen, setAllergen] = useState('');
  const [type, setType]     = useState('other');
  const [severity, setSev]  = useState('mild');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!allergen.trim()) return;
    setSaving(true);
    try { await onAdd({ allergen: allergen.trim(), type, severity }); setAllergen(''); setAdding(false); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 items-center mb-1">
        {items.map(a => (
          <span key={a.id} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0d4dc]" style={{ color: '#9c5e6c' }}>
            {a.allergen}
            <button onClick={() => onDelete(a.id)} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
          </span>
        ))}
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-dashed transition hover:opacity-80" style={{ borderColor: '#9c5e6c', color: '#9c5e6c' }}>
            + добавить
          </button>
        )}
      </div>
      {adding && (
        <div className="bg-[#fdf8f9] rounded-[10px] p-2 flex flex-col gap-1.5 mt-1">
          <input autoFocus value={allergen} onChange={e => setAllergen(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Название аллергена"
            className="text-[12px] rounded-[8px] border px-2 py-1 outline-none w-full" style={{ borderColor: '#f0d4dc' }} />
          <div className="flex gap-1">
            <select value={type} onChange={e => setType(e.target.value)} className="flex-1 text-[11px] rounded-[8px] border px-1 py-1 outline-none" style={{ borderColor: '#f0d4dc' }}>
              <option value="medication">Лекарство</option>
              <option value="food">Еда</option>
              <option value="material">Материал</option>
              <option value="other">Другое</option>
            </select>
            <select value={severity} onChange={e => setSev(e.target.value)} className="flex-1 text-[11px] rounded-[8px] border px-1 py-1 outline-none" style={{ borderColor: '#f0d4dc' }}>
              <option value="mild">Лёгкая</option>
              <option value="moderate">Умеренная</option>
              <option value="severe">Тяжёлая</option>
              <option value="anaphylaxis">Анафилаксия</option>
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={handleAdd} disabled={saving || !allergen.trim()} className="flex-1 py-1 rounded-[8px] text-[12px] font-semibold text-white disabled:opacity-40" style={{ background: '#9c5e6c' }}>
              {saving ? '…' : 'Добавить'}
            </button>
            <button onClick={() => { setAllergen(''); setAdding(false); }} className="px-3 py-1 rounded-[8px] text-[12px]" style={{ color: '#9a96a8' }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

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

// ─── Passport accordion ───────────────────────────────────────────────────────

function PassportSection({ profile, onSave }: { profile: HealthProfile | null; onSave: (f: string, v: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const hasData = profile?.pinfl || profile?.passportIssuedBy;

  return (
    <div className="border border-[#e8e4dc] rounded-[12px] mb-3 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f9f8f5] transition">
        <span className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>🪪 Паспортные данные</span>
        <div className="flex items-center gap-2">
          {hasData && <span className="text-[10px] bg-[#d4e8d8] text-[#548068] font-bold px-2 py-0.5 rounded-full">🔒 e2e</span>}
          <span className="text-[11px]" style={{ color: '#9a96a8' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-[#e8e4dc]">
          <InlineField label="Дата рождения"  field="birthDate"        value={profile?.birthDate}        inputType="date"   onSave={onSave} />
          <InlineField label="Серия / Номер"  field="pinfl"            value={profile?.pinfl}                               onSave={onSave} />
          <InlineField label="Кем выдан"      field="passportIssuedBy"  value={profile?.passportIssuedBy}                   onSave={onSave} />
          <InlineField label="Дата выдачи"    field="passportIssuedDate" value={profile?.passportIssuedDate} inputType="date" onSave={onSave} />
          <InlineField label="Срок действия"  field="passportExpires"  value={profile?.passportExpires}  inputType="date"   onSave={onSave} />
        </div>
      )}
    </div>
  );
}

// ─── Completion bar ───────────────────────────────────────────────────────────

function calcCompletion(p: HealthProfile | null, allergies: Allergy[]): number {
  if (!p) return 0;
  const fields = [
    { filled: !!p.birthDate, w: 3 }, { filled: !!p.gender, w: 3 },
    { filled: !!p.heightCm, w: 3 }, { filled: !!p.weightKg, w: 3 },
    { filled: allergies.length > 0, w: 3 }, { filled: !!p.city, w: 2 },
    { filled: !!p.bloodType, w: 2 }, { filled: !!p.smokingStatus, w: 2 },
    { filled: !!p.alcoholFrequency, w: 2 }, { filled: !!p.exerciseFrequency, w: 2 },
    { filled: !!p.emergencyContactName, w: 2 }, { filled: !!p.dietType, w: 1 },
    { filled: !!p.doctorName, w: 1 },
  ];
  const total = fields.reduce((s, f) => s + f.w, 0);
  const done  = fields.filter(f => f.filled).reduce((s, f) => s + f.w, 0);
  return Math.round((done / total) * 100);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  locale: string;
  profile: HealthProfile | null;
  allergies: Allergy[];
  chronic: ChronicCondition[];
  history: HistoryEntry[];
  medications: Medication[];
}

export function ProfileClient({
  locale,
  profile: initProfile,
  allergies: initAllergies,
  chronic: initChronic,
  history: initHistory,
  medications: initMeds,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [profile,    setProfile]    = useState<HealthProfile | null>(initProfile);
  const [allergies,  setAllergies]  = useState<Allergy[]>(initAllergies);
  const [chronic,    setChronic]    = useState<ChronicCondition[]>(initChronic);
  const [history,    setHistory]    = useState<HistoryEntry[]>(initHistory);
  const [meds,       setMeds]       = useState<Medication[]>(initMeds);

  function refresh() { startTransition(() => router.refresh()); }

  // ── Save any profile field ────────────────────────────────────────────────
  async function saveField(field: string, value: string) {
    const body: Record<string, string | number> = {};
    body[field] = field === 'heightCm' ? Number(value) : value;
    const updated = await putProfile(body);
    setProfile(updated);
    refresh();
  }

  // ── Computed BMI ──────────────────────────────────────────────────────────
  const bmi =
    profile?.heightCm && profile?.weightKg
      ? (Number(profile.weightKg) / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
      : null;

  const completion = calcCompletion(profile, allergies);

  // ── Allergy CRUD ──────────────────────────────────────────────────────────
  async function addAllergy(data: Omit<Allergy, 'id'>) {
    const res = await fetch(`${API}/v1/aivita/health-profile/allergies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('error');
    setAllergies(a => [...a, (await res.json()).data]);
  }
  function deleteAllergy(id: string) {
    fetch(`${API}/v1/aivita/health-profile/allergies/${id}`, { method: 'DELETE', credentials: 'include' });
    setAllergies(a => a.filter(x => x.id !== id));
  }

  // ── Chronic CRUD ──────────────────────────────────────────────────────────
  async function addChronic(name: string) {
    const res = await fetch(`${API}/v1/aivita/health-profile/chronic-conditions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('error');
    setChronic(c => [...c, (await res.json()).data]);
  }
  function deleteChronic(id: string) {
    fetch(`${API}/v1/aivita/health-profile/chronic-conditions/${id}`, { method: 'DELETE', credentials: 'include' });
    setChronic(c => c.filter(x => x.id !== id));
  }

  // ── History CRUD (with type) ──────────────────────────────────────────────
  async function addHistory(name: string, type: string) {
    const res = await fetch(`${API}/v1/aivita/health-profile/medical-history`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name, type }),
    });
    if (!res.ok) throw new Error('error');
    setHistory(h => [...h, (await res.json()).data]);
  }
  function deleteHistory(id: string) {
    fetch(`${API}/v1/aivita/health-profile/medical-history/${id}`, { method: 'DELETE', credentials: 'include' });
    setHistory(h => h.filter(x => x.id !== id));
  }

  // ── Medications CRUD ──────────────────────────────────────────────────────
  async function addMed(name: string) {
    const res = await fetch(`${API}/v1/aivita/health-profile/medications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('error');
    setMeds(m => [...m, (await res.json()).data]);
  }
  function deleteMed(id: string) {
    fetch(`${API}/v1/aivita/health-profile/medications/${id}`, { method: 'DELETE', credentials: 'include' });
    setMeds(m => m.filter(x => x.id !== id));
  }

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
          <div className="h-full rounded-full transition-all" style={{ width: `${completion}%`, background: 'linear-gradient(90deg,#9c5e6c,#6e5fa0)' }} />
        </div>
        {completion < 100 && (
          <p className="text-[11px] mt-1.5" style={{ color: '#9a96a8' }}>Заполните профиль для лучших AI-рекомендаций</p>
        )}
      </section>

      {/* ── Metric cards (editable) ─────────────────────────────────────────── */}
      <section className="grid grid-cols-4 gap-2 mb-4">
        <MetricCard label="Рост"  field="heightCm" value={profile?.heightCm ?? null} unit="см" bg="#f0d4dc" color="#9c5e6c" inputType="number" onSave={saveField} />
        <MetricCard label="Вес"   field="weightKg" value={profile?.weightKg ?? null} unit="кг" bg="#e0d8f0" color="#6e5fa0" inputType="number" onSave={saveField} />
        <MetricCard label="ИМТ"   field="bmi"      value={bmi}                       bg="#d4e8d8" color="#548068" onSave={saveField} readOnly />
        <MetricCard label="Кровь" field="bloodType" value={profile?.bloodType ?? null} bg="#d4dff0" color="#5e75a8" options={BLOOD_OPTS} onSave={saveField} />
      </section>

      {/* ── Gender + chips ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {profile?.gender && <span className="bg-[#e0d8f0] text-[#6e5fa0] text-[11px] font-semibold px-2 py-0.5 rounded-full">{labelOf(GENDER_OPTS, profile.gender)}</span>}
        {profile?.city   && <span className="bg-[#d4dff0] text-[#5e75a8] text-[11px] font-semibold px-2 py-0.5 rounded-full">📍 {profile.city}</span>}
        {profile?.bloodType && <span className="bg-[#f0d4dc] text-[#9c5e6c] text-[11px] font-semibold px-2 py-0.5 rounded-full">🩸 {profile.bloodType}</span>}
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">

        {/* ── Personal data ────────────────────────────────────────────── */}
        <Card title="Личные данные" icon="👤">
          <PassportSection profile={profile} onSave={saveField} />
          <InlineField label="Пол"      field="gender"    value={profile?.gender}   displayValue={labelOf(GENDER_OPTS, profile?.gender)} options={GENDER_OPTS} onSave={saveField} />
          <InlineField label="Город"    field="city"      value={profile?.city}      onSave={saveField} />
          <InlineField label="Телефон"  field="phone"     value={profile?.phone}    inputType="tel" onSave={saveField} />
          <InlineField label="Telegram" field="telegram"  value={profile?.telegram}  onSave={saveField} placeholder="@username" />
          <InlineField label="WhatsApp" field="whatsapp"  value={profile?.whatsapp} inputType="tel" onSave={saveField} />
        </Card>

        {/* ── Lifestyle ────────────────────────────────────────────────── */}
        <Card title="Образ жизни" icon="🌿">
          <InlineField label="Курение"         field="smokingStatus"   value={profile?.smokingStatus}   displayValue={labelOf(SMOKING_OPTS, profile?.smokingStatus)}   options={SMOKING_OPTS}  onSave={saveField} />
          <InlineField label="Алкоголь"        field="alcoholFrequency" value={profile?.alcoholFrequency} displayValue={labelOf(ALCOHOL_OPTS, profile?.alcoholFrequency)} options={ALCOHOL_OPTS}  onSave={saveField} />
          <InlineField label="Активность"      field="exerciseFrequency" value={profile?.exerciseFrequency} displayValue={labelOf(ACTIVITY_OPTS, profile?.exerciseFrequency)} options={ACTIVITY_OPTS} onSave={saveField} />
          <InlineField label="Питание"         field="dietType"        value={profile?.dietType}        displayValue={labelOf(DIET_OPTS, profile?.dietType)}             options={DIET_OPTS}     onSave={saveField} />
          <InlineField label="Режим сна"       field="sleepSchedule"   value={profile?.sleepSchedule}   displayValue={labelOf(SLEEP_OPTS, profile?.sleepSchedule)}       options={SLEEP_OPTS}    onSave={saveField} />
          <InlineField label="Уровень стресса" field="stressLevel"     value={profile?.stressLevel}     displayValue={labelOf(STRESS_OPTS, profile?.stressLevel)}         options={STRESS_OPTS}   onSave={saveField} />
        </Card>

        {/* ── Medical profile ──────────────────────────────────────────── */}
        <Card title="Медицинский профиль" icon="🏥">
          <div className="space-y-3">
            <ListRow label="Аллергии" tagBg="#f0d4dc" tagColor="#9c5e6c">
              <AllergyList items={allergies} onAdd={addAllergy} onDelete={deleteAllergy} />
            </ListRow>
            <ListRow label="Хронические" tagBg="#d4dff0" tagColor="#5e75a8">
              <QuickAddList
                items={chronic.map(c => ({ id: c.id, name: c.name + (c.diagnosedYear ? ` (${c.diagnosedYear})` : '') }))}
                onAdd={addChronic} onDelete={deleteChronic}
                placeholder="Название болезни" tagBg="#d4dff0" tagColor="#5e75a8"
              />
            </ListRow>
            <ListRow label="Препараты" tagBg="#d4e8d8" tagColor="#548068">
              <QuickAddList
                items={meds.map(m => ({ id: m.id, name: m.dosage ? `${m.name} ${m.dosage}` : m.name }))}
                onAdd={addMed} onDelete={deleteMed}
                placeholder="Название препарата" tagBg="#d4e8d8" tagColor="#548068"
              />
            </ListRow>
            <ListRow label="Прививки" tagBg="#e0d8f0" tagColor="#6e5fa0">
              <QuickAddList
                items={vaccinations.map(v => ({ id: v.id, name: v.name }))}
                onAdd={n => addHistory(n, 'other')} onDelete={deleteHistory}
                placeholder="Название прививки" tagBg="#e0d8f0" tagColor="#6e5fa0"
              />
            </ListRow>
            <ListRow label="Операции" tagBg="#f0ede8" tagColor="#9a96a8">
              <QuickAddList
                items={surgeries.map(s => ({ id: s.id, name: s.name }))}
                onAdd={n => addHistory(n, 'surgery')} onDelete={deleteHistory}
                placeholder="Название операции" tagBg="#f0ede8" tagColor="#9a96a8"
              />
            </ListRow>
            <ListRow label="История болезней" tagBg="#f4f3ef" tagColor="#6a6580">
              <QuickAddList
                items={illnesses.map(h => ({ id: h.id, name: h.name }))}
                onAdd={n => addHistory(n, 'illness')} onDelete={deleteHistory}
                placeholder="Название болезни" tagBg="#f4f3ef" tagColor="#6a6580"
              />
            </ListRow>
          </div>
        </Card>

        {/* ── Emergency contacts ───────────────────────────────────────── */}
        <Card title="Экстренные контакты" icon="🆘">
          <InlineField label="Контактное лицо" field="emergencyContactName"     value={profile?.emergencyContactName}     onSave={saveField} />
          <InlineField label="Телефон"         field="emergencyContactPhone"    value={profile?.emergencyContactPhone}    inputType="tel" onSave={saveField} />
          <InlineField label="Кем приходится"  field="emergencyContactRelation" value={profile?.emergencyContactRelation} displayValue={labelOf(RELATION_OPTS, profile?.emergencyContactRelation)} options={RELATION_OPTS} onSave={saveField} />
          <InlineField label="Мой врач"        field="doctorName"               value={profile?.doctorName}               onSave={saveField} />
          <InlineField label="Телефон врача"   field="doctorPhone"              value={profile?.doctorPhone}              inputType="tel" onSave={saveField} />
          <InlineField label="Моя клиника"     field="clinic"                   value={profile?.clinic}                   onSave={saveField} />
        </Card>

        {/* ── Family ───────────────────────────────────────────────────── */}
        <Card title="Моя семья" icon="👨‍👩‍👧">
          <p className="text-[13px] text-center py-3" style={{ color: '#9a96a8' }}>Нет членов семьи</p>
          <Link href={`/${locale}/family`}
            className="block text-center text-[13px] font-semibold py-2 rounded-[12px] border border-[#e8e4dc] hover:bg-[#f4f3ef] transition"
            style={{ color: '#6e5fa0' }}>
            + Пригласить члена семьи
          </Link>
          <div className="mt-3 rounded-[10px] bg-[#f4f3ef] p-3">
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#6a6580' }}>Семья видит: <span className="font-normal">Health Score, шаги, вода</span></p>
            <p className="text-[11px] font-semibold" style={{ color: '#6a6580' }}>Семья НЕ видит: <span className="font-normal">AI-чат, документы, паспорт</span></p>
          </div>
        </Card>

        {/* ── Insurance ────────────────────────────────────────────────── */}
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

// ─── Helper: labelled list row ────────────────────────────────────────────────

function ListRow({ label, children, tagBg, tagColor }: { label: string; children: React.ReactNode; tagBg: string; tagColor: string }) {
  return (
    <div className="pt-2 first:pt-0 border-t border-[#f0ede8] first:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-semibold" style={{ color: '#9a96a8' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}
