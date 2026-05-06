'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

type HealthProfile = {
  birthDate?: string | null; gender?: string | null; bloodType?: string | null;
  heightCm?: number | null; weightKg?: string | null; smokingStatus?: string | null;
  alcoholFrequency?: string | null; exerciseFrequency?: string | null; dietType?: string | null;
  city?: string | null; phone?: string | null; emergencyContactName?: string | null;
  emergencyContactPhone?: string | null; emergencyContactRelation?: string | null;
  doctorName?: string | null; doctorPhone?: string | null;
  insuranceCompany?: string | null; insuranceNumber?: string | null;
  insuranceExpires?: string | null; insuranceHotline?: string | null;
};
type Allergy = { id: string; allergen: string; type: string; severity?: string };
type ChronicCondition = { id: string; name: string; diagnosedYear?: number | null };
type HistoryEntry = { id: string; name: string; type: string; startDate?: string | null };

interface Props {
  locale: string;
  profile: HealthProfile | null;
  allergies: Allergy[];
  chronic: ChronicCondition[];
  history: HistoryEntry[];
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  label: string;
  value: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  onSave: (v: string) => Promise<void>;
  onClose: () => void;
}

function EditModal({ label, value, type = 'text', options, onSave, onClose }: EditModalProps) {
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave(val);
      onClose();
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl z-[9999]">
        <h2 className="text-[16px] font-bold mb-4" style={{ color: '#2a2540' }}>{label}</h2>
        {type === 'select' && options ? (
          <select
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] mb-4 outline-none"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
          >
            <option value="">— Выбрать —</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] mb-4 outline-none focus:ring-2"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
            autoFocus
          />
        )}
        {error && <p className="text-[12px] mb-3" style={{ color: '#9c5e6c' }}>{error}</p>}
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white mb-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #9c5e6c, #6e5fa0)' }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button onClick={onClose} className="w-full py-2.5 rounded-[14px] text-[14px]" style={{ color: '#9a96a8' }}>
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Add allergy modal ────────────────────────────────────────────────────────

function AddAllergyModal({ onSave, onClose }: { onSave: (a: Omit<Allergy, 'id'>) => Promise<void>; onClose: () => void }) {
  const [allergen, setAllergen] = useState('');
  const [type, setType] = useState('other');
  const [severity, setSeverity] = useState('mild');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!allergen.trim()) { setError('Введите название'); return; }
    setSaving(true);
    try { await onSave({ allergen, type, severity }); onClose(); }
    catch { setError('Ошибка сохранения'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl z-[9999]">
        <h2 className="text-[16px] font-bold mb-4" style={{ color: '#2a2540' }}>Добавить аллергию</h2>
        <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Аллерген</label>
        <input value={allergen} onChange={e => setAllergen(e.target.value)} placeholder="Например: пенициллин"
          className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] mb-3 outline-none focus:ring-2" style={{ borderColor: '#e8e4dc' }} autoFocus />
        <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Тип</label>
        <select value={type} onChange={e => setType(e.target.value)}
          className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] mb-3 outline-none" style={{ borderColor: '#e8e4dc' }}>
          <option value="medication">Лекарство</option>
          <option value="food">Еда</option>
          <option value="material">Материал</option>
          <option value="other">Другое</option>
        </select>
        <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>Тяжесть</label>
        <select value={severity} onChange={e => setSeverity(e.target.value)}
          className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] mb-4 outline-none" style={{ borderColor: '#e8e4dc' }}>
          <option value="mild">Лёгкая</option>
          <option value="moderate">Умеренная</option>
          <option value="severe">Тяжёлая</option>
          <option value="anaphylaxis">Анафилаксия</option>
        </select>
        {error && <p className="text-[12px] mb-3" style={{ color: '#9c5e6c' }}>{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white mb-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #9c5e6c, #6e5fa0)' }}>
          {saving ? 'Сохранение...' : 'Добавить'}
        </button>
        <button onClick={onClose} className="w-full py-2.5 rounded-[14px] text-[14px]" style={{ color: '#9a96a8' }}>Отмена</button>
      </div>
    </div>
  );
}

// ─── Add list item modal ──────────────────────────────────────────────────────

function AddItemModal({ title, fields, onSave, onClose }: {
  title: string;
  fields: { key: string; label: string; placeholder?: string }[];
  onSave: (data: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    try { await onSave(values); onClose(); }
    catch { setError('Ошибка сохранения'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl z-[9999]">
        <h2 className="text-[16px] font-bold mb-4" style={{ color: '#2a2540' }}>{title}</h2>
        {fields.map(f => (
          <div key={f.key} className="mb-3">
            <label className="block text-[12px] font-semibold mb-1" style={{ color: '#6a6580' }}>{f.label}</label>
            <input value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full rounded-[12px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2" style={{ borderColor: '#e8e4dc' }} />
          </div>
        ))}
        {error && <p className="text-[12px] mb-3" style={{ color: '#9c5e6c' }}>{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white mb-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #9c5e6c, #6e5fa0)' }}>
          {saving ? 'Сохранение...' : 'Добавить'}
        </button>
        <button onClick={onClose} className="w-full py-2.5 rounded-[14px] text-[14px]" style={{ color: '#9a96a8' }}>Отмена</button>
      </div>
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

// ─── Editable row ─────────────────────────────────────────────────────────────

function Row({ label, value, onClick }: { label: string; value?: string | null; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 border-b border-[#f0ede8] last:border-0 hover:bg-[#f9f8f5] -mx-1 px-1 rounded transition text-left"
    >
      <span className="text-[12px]" style={{ color: '#9a96a8' }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: value ? '#2a2540' : '#cc8a96' }}>
        {value || '+ добавить'}
      </span>
    </button>
  );
}

// ─── Passport accordion ───────────────────────────────────────────────────────

function PassportAccordion({ birthDate, onEdit }: { birthDate?: string | null; onEdit: (field: string, label: string, value: string, type?: 'text' | 'date') => void }) {
  const [open, setOpen] = useState(false);
  const formatted = birthDate ? new Date(birthDate).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="border border-[#e8e4dc] rounded-[12px] mb-2 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f9f8f5] transition">
        <span className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>🪪 Паспортные данные</span>
        <span className="text-[11px]" style={{ color: '#9a96a8' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-[#e8e4dc]">
          <div className="mb-2">
            <span className="text-[10px] bg-[#d4e8d8] text-[#548068] font-bold px-2 py-0.5 rounded-full">🔒 Зашифровано e2e</span>
          </div>
          <Row label="Дата рождения" value={formatted} onClick={() => onEdit('birthDate', 'Дата рождения', birthDate ?? '', 'date')} />
          <Row label="Серия / Номер" value={null} onClick={() => {}} />
          <Row label="Кем выдан" value={null} onClick={() => {}} />
          <Row label="Дата выдачи" value={null} onClick={() => {}} />
          <Row label="Срок действия" value={null} onClick={() => {}} />
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProfileClient({ locale, profile: initialProfile, allergies: initialAllergies, chronic: initialChronic, history: initialHistory }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [profile, setProfile] = useState<HealthProfile | null>(initialProfile);
  const [allergies, setAllergies] = useState<Allergy[]>(initialAllergies);
  const [chronic, setChronic] = useState<ChronicCondition[]>(initialChronic);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);

  // Modal state
  const [editModal, setEditModal] = useState<{ field: string; label: string; value: string; type?: 'text'|'number'|'date'|'select'; options?: {value:string;label:string}[] } | null>(null);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showAddChronic, setShowAddChronic] = useState(false);
  const [showAddHistory, setShowAddHistory] = useState(false);

  function refresh() { startTransition(() => router.refresh()); }

  // Save profile field
  async function saveField(field: string, value: string) {
    const body: Record<string, string | number> = {};
    if (field === 'heightCm') body[field] = Number(value);
    else body[field] = value;

    const res = await fetch(`${API}/v1/aivita/health-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('error');
    const json = await res.json();
    setProfile(json.data);
    refresh();
  }

  function openEdit(field: string, label: string, value: string | null | undefined, type: 'text'|'number'|'date'|'select' = 'text', options?: {value:string;label:string}[]) {
    setEditModal({ field, label, value: value ?? '', type, options });
  }

  // Labels maps
  const smokingOpts = [{ value: 'never', label: 'Никогда' }, { value: 'quit', label: 'Бросил' }, { value: 'sometimes', label: 'Иногда' }, { value: 'regular', label: 'Регулярно' }];
  const alcoholOpts = [{ value: 'never', label: 'Никогда' }, { value: 'rarely', label: 'Редко' }, { value: 'moderate', label: 'Умеренно' }, { value: 'regular', label: 'Регулярно' }];
  const activityOpts = [{ value: 'sedentary', label: 'Сидячий' }, { value: 'light', label: 'Лёгкая' }, { value: 'moderate', label: 'Умеренная' }, { value: 'active', label: 'Активный' }];
  const dietOpts = [{ value: 'regular', label: 'Обычное' }, { value: 'vegetarian', label: 'Вегетарианское' }, { value: 'vegan', label: 'Веганское' }, { value: 'halal', label: 'Халяль' }];
  const genderOpts = [{ value: 'male', label: 'Мужской' }, { value: 'female', label: 'Женский' }];
  const bloodOpts = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }));

  function labelOf(opts: {value:string;label:string}[], val?: string|null) {
    return opts.find(o => o.value === val)?.label ?? val ?? null;
  }

  // Delete allergy
  async function deleteAllergy(id: string) {
    await fetch(`${API}/v1/aivita/health-profile/allergies/${id}`, { method: 'DELETE', credentials: 'include' });
    setAllergies(a => a.filter(x => x.id !== id));
  }
  // Add allergy
  async function addAllergy(data: Omit<Allergy, 'id'>) {
    const res = await fetch(`${API}/v1/aivita/health-profile/allergies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('error');
    const json = await res.json();
    setAllergies(a => [...a, json.data]);
  }
  // Delete chronic
  async function deleteChronic(id: string) {
    await fetch(`${API}/v1/aivita/health-profile/chronic-conditions/${id}`, { method: 'DELETE', credentials: 'include' });
    setChronic(c => c.filter(x => x.id !== id));
  }
  // Add chronic
  async function addChronic(data: Record<string, string>) {
    const res = await fetch(`${API}/v1/aivita/health-profile/chronic-conditions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name: data.name, diagnosedYear: data.year ? Number(data.year) : undefined }),
    });
    if (!res.ok) throw new Error('error');
    const json = await res.json();
    setChronic(c => [...c, json.data]);
  }
  // Delete history
  async function deleteHistory(id: string) {
    await fetch(`${API}/v1/aivita/health-profile/medical-history/${id}`, { method: 'DELETE', credentials: 'include' });
    setHistory(h => h.filter(x => x.id !== id));
  }
  // Add history
  async function addHistory(data: Record<string, string>) {
    const res = await fetch(`${API}/v1/aivita/health-profile/medical-history`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name: data.name, type: data.type || 'illness', startDate: data.startDate || undefined }),
    });
    if (!res.ok) throw new Error('error');
    const json = await res.json();
    setHistory(h => [...h, json.data]);
  }

  return (
    <>
      {/* ── Two-column grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">

        {/* Left: Personal data */}
        <Card title="Личные данные" icon="👤">
          <PassportAccordion birthDate={profile?.birthDate} onEdit={(f, l, v, t) => openEdit(f, l, v, t)} />
          <Row label="Пол" value={labelOf(genderOpts, profile?.gender)} onClick={() => openEdit('gender', 'Пол', profile?.gender, 'select', genderOpts)} />
          <Row label="Город" value={profile?.city} onClick={() => openEdit('city', 'Город', profile?.city)} />
          <Row label="Телефон" value={profile?.phone} onClick={() => openEdit('phone', 'Телефон', profile?.phone)} />
          <Row label="Telegram" value={null} onClick={() => {}} />
          <Row label="WhatsApp" value={null} onClick={() => {}} />
        </Card>

        {/* Right: Lifestyle */}
        <Card title="Образ жизни" icon="🌿">
          <Row label="Курение" value={labelOf(smokingOpts, profile?.smokingStatus)} onClick={() => openEdit('smokingStatus', 'Курение', profile?.smokingStatus, 'select', smokingOpts)} />
          <Row label="Алкоголь" value={labelOf(alcoholOpts, profile?.alcoholFrequency)} onClick={() => openEdit('alcoholFrequency', 'Алкоголь', profile?.alcoholFrequency, 'select', alcoholOpts)} />
          <Row label="Активность" value={labelOf(activityOpts, profile?.exerciseFrequency)} onClick={() => openEdit('exerciseFrequency', 'Активность', profile?.exerciseFrequency, 'select', activityOpts)} />
          <Row label="Питание" value={labelOf(dietOpts, profile?.dietType)} onClick={() => openEdit('dietType', 'Питание', profile?.dietType, 'select', dietOpts)} />
          <Row label="Режим сна" value={null} onClick={() => {}} />
          <Row label="Уровень стресса" value={null} onClick={() => {}} />
        </Card>

        {/* Left: Medical profile */}
        <Card title="Медицинский профиль" icon="🏥">
          {/* Allergies */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px]" style={{ color: '#9a96a8' }}>Аллергии</span>
              <button onClick={() => setShowAddAllergy(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f0d4dc]" style={{ color: '#9c5e6c' }}>
                {allergies.length > 0 ? `${allergies.length} + добавить` : '+ добавить'}
              </button>
            </div>
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allergies.map(a => (
                  <span key={a.id} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0d4dc]" style={{ color: '#9c5e6c' }}>
                    {a.allergen}
                    <button onClick={() => deleteAllergy(a.id)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Chronic */}
          <div className="mb-3 pt-2 border-t border-[#f0ede8]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px]" style={{ color: '#9a96a8' }}>Хронические</span>
              <button onClick={() => setShowAddChronic(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d4dff0]" style={{ color: '#5e75a8' }}>
                {chronic.length > 0 ? `${chronic.length} + добавить` : '+ добавить'}
              </button>
            </div>
            {chronic.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {chronic.map(c => (
                  <span key={c.id} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#d4dff0]" style={{ color: '#5e75a8' }}>
                    {c.name}{c.diagnosedYear ? ` (${c.diagnosedYear})` : ''}
                    <button onClick={() => deleteChronic(c.id)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* History */}
          <div className="pt-2 border-t border-[#f0ede8]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px]" style={{ color: '#9a96a8' }}>История болезней</span>
              <button onClick={() => setShowAddHistory(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d4e8d8]" style={{ color: '#548068' }}>
                {history.length > 0 ? `${history.length} + добавить` : '+ добавить'}
              </button>
            </div>
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-1">
                <span className="text-[12px]" style={{ color: '#2a2540' }}>{h.name}</span>
                <div className="flex items-center gap-2">
                  {h.startDate && <span className="text-[11px]" style={{ color: '#9a96a8' }}>{new Date(h.startDate).getFullYear()}</span>}
                  <button onClick={() => deleteHistory(h.id)} className="text-[12px] opacity-40 hover:opacity-80">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[#f0ede8] mt-2">
            <Row label="Препараты" value={null} onClick={() => {}} />
            <Row label="Прививки" value={null} onClick={() => {}} />
            <Row label="Операции" value={null} onClick={() => {}} />
          </div>
        </Card>

        {/* Right: Emergency contacts */}
        <Card title="Экстренные контакты" icon="🆘">
          <Row label="Контактное лицо" value={profile?.emergencyContactName} onClick={() => openEdit('emergencyContactName', 'Контактное лицо', profile?.emergencyContactName)} />
          <Row label="Телефон" value={profile?.emergencyContactPhone} onClick={() => openEdit('emergencyContactPhone', 'Телефон контакта', profile?.emergencyContactPhone)} />
          <Row label="Кем приходится" value={profile?.emergencyContactRelation} onClick={() => openEdit('emergencyContactRelation', 'Кем приходится', profile?.emergencyContactRelation)} />
          <Row label="Мой врач" value={profile?.doctorName} onClick={() => openEdit('doctorName', 'Имя врача', profile?.doctorName)} />
          <Row label="Телефон врача" value={profile?.doctorPhone} onClick={() => openEdit('doctorPhone', 'Телефон врача', profile?.doctorPhone)} />
          <Row label="Моя клиника" value={null} onClick={() => {}} />
        </Card>

        {/* Left: Family */}
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

        {/* Right: Insurance */}
        <Card title="Страхование" icon="🛡️">
          <Row label="Страховая компания" value={profile?.insuranceCompany} onClick={() => openEdit('insuranceCompany', 'Страховая компания', profile?.insuranceCompany)} />
          <Row label="Номер полиса" value={profile?.insuranceNumber} onClick={() => openEdit('insuranceNumber', 'Номер полиса', profile?.insuranceNumber)} />
          <Row label="Срок действия" value={profile?.insuranceExpires} onClick={() => openEdit('insuranceExpires', 'Срок действия', profile?.insuranceExpires, 'date')} />
          <Row label="Горячая линия" value={profile?.insuranceHotline} onClick={() => openEdit('insuranceHotline', 'Горячая линия', profile?.insuranceHotline)} />
        </Card>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {editModal && (
        <EditModal
          label={editModal.label}
          value={editModal.value}
          type={editModal.type}
          options={editModal.options}
          onSave={v => saveField(editModal.field, v)}
          onClose={() => setEditModal(null)}
        />
      )}
      {showAddAllergy && <AddAllergyModal onSave={addAllergy} onClose={() => setShowAddAllergy(false)} />}
      {showAddChronic && (
        <AddItemModal
          title="Добавить хроническое заболевание"
          fields={[{ key: 'name', label: 'Название', placeholder: 'Например: гипертония' }, { key: 'year', label: 'Год диагноза', placeholder: '2020' }]}
          onSave={addChronic}
          onClose={() => setShowAddChronic(false)}
        />
      )}
      {showAddHistory && (
        <AddItemModal
          title="Добавить запись"
          fields={[{ key: 'name', label: 'Название', placeholder: 'Например: ангина' }, { key: 'startDate', label: 'Дата (ГГГГ-ММ-ДД)', placeholder: '2022-01-15' }]}
          onSave={addHistory}
          onClose={() => setShowAddHistory(false)}
        />
      )}
    </>
  );
}
