'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

const PROXY = '/api/proxy';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A(I)', 'B(II)', 'AB(III)', 'O(IV)', 'Не знаю'];
const RH_FACTORS   = ['+', '−', '?'];

const CHILD_DISEASES = [
  'Ветрянка', 'Корь', 'Краснуха', 'Скарлатина',
  'Паротит', 'Мононуклеоз', 'Коклюш',
];

// Vaccines by age group from Минздрав РУз calendar
const VACCINE_GROUPS = [
  {
    label: '0–1 год',
    items: ['БЦЖ', 'Гепатит B', 'АКДС', 'Полиомиелит', 'Пневмококк'],
  },
  {
    label: '1–6 лет',
    items: ['КПК (корь, паротит, краснуха)', 'Гемофильная инфекция'],
  },
  {
    label: '7–14 лет',
    items: ['АДС-М (ревакцинация)', 'Грипп'],
  },
  {
    label: '14+ лет',
    items: ['ВПЧ'],
  },
];

const ALL_VACCINES = VACCINE_GROUPS.flatMap(g => g.items);

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaxEntry { name: string; status: string; date?: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (memberId: string, cardNumber: string) => void;
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onAdd, onRemove, placeholder }: {
  tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void; placeholder: string;
}) {
  const [val, setVal] = useState('');
  function add() {
    const t = val.trim();
    if (t && !tags.includes(t)) { onAdd(t); setVal(''); }
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] transition-colors"
          style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
        />
        <button
          onClick={add}
          className="px-3 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#6BA3D6' }}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span
            key={t}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{ background: '#e8f0f8', borderColor: '#b8d4e8', color: '#4a7fb5' }}
          >
            {t}
            <button onClick={() => onRemove(t)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHead({ emoji, title }: { emoji: string; title: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wide mb-3 mt-1 flex items-center gap-1.5" style={{ color: '#6BA3D6' }}>
      <span>{emoji}</span> {title}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChildCardModal({ open, onClose, onSaved }: Props) {
  // 1. Personal
  const [name,      setName]      = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender,    setGender]    = useState('');

  // 2. Body
  const [heightCm,   setHeightCm]   = useState('');
  const [weightKg,   setWeightKg]   = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [rhFactor,   setRhFactor]   = useState('');

  // 3. Allergies
  const [allergyList,   setAllergyList]   = useState<string[]>([]);

  // 4. Chronic + child diseases
  const [chronicList,   setChronicList]   = useState<string[]>([]);
  const [childDiseases, setChildDiseases] = useState<string[]>([]);

  // 5. Vaccinations
  const [vaccinations, setVaccinations] = useState<VaxEntry[]>([]);

  // 6. Notes
  const [parentNotes, setParentNotes] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setName(''); setBirthDate(''); setGender('');
      setHeightCm(''); setWeightKg(''); setBloodGroup(''); setRhFactor('');
      setAllergyList([]); setChronicList([]); setChildDiseases([]);
      setVaccinations([]); setParentNotes(''); setErr('');
    }
  }, [open]);

  function getVaxStatus(vaxName: string): string {
    return vaccinations.find(v => v.name === vaxName)?.status ?? '';
  }
  function setVaxStatus(vaxName: string, status: string) {
    setVaccinations(prev => {
      const filtered = prev.filter(v => v.name !== vaxName);
      return [...filtered, { name: vaxName, status }];
    });
  }

  // Auto-infer relation from gender
  function inferRelation() {
    if (gender === 'male') return 'son';
    if (gender === 'female') return 'daughter';
    return 'child';
  }

  async function handleSave() {
    if (!name.trim()) { setErr('Введите ФИО ребёнка'); return; }
    setSaving(true); setErr('');
    try {
      const body = {
        memberName: name.trim(),
        memberBirthDate: birthDate || null,
        memberGender: gender || null,
        memberRelation: inferRelation(),
        heightCm: heightCm ? parseInt(heightCm, 10) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        bloodGroup: bloodGroup || null,
        rhFactor: rhFactor || null,
        allergies: allergyList,
        chronicDiseases: chronicList,
        childDiseases,
        vaccinations,
        medications: [],
        parentNotes: parentNotes.trim() || null,
      };

      const res = await fetch(`${PROXY}/family/child-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('server_error');
      const json = await res.json() as { data: { id: string; cardNumber: string } };
      onSaved(json.data.id, json.data.cardNumber);
      onClose();
    } catch {
      setErr('Не удалось создать карту. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="👶 Открыть медкарту ребёнку"
      footer={
        <div className="flex flex-col gap-2">
          {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #5580b0, #6BA3D6)' }}
          >
            {saving ? '⏳ Создаём карту…' : '📋 Создать медкарту'}
          </button>
        </div>
      }
    >
      {/* ── 1. ФИО + дата + пол ───────────────────────────────────────────── */}
      <SectionHead emoji="👤" title="Личные данные" />

      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>ФИО ребёнка *</p>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Например: Азиз Каримов"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4 focus:border-[#6BA3D6] transition-colors"
        style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
      />

      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Дата рождения</p>
      <input
        type="date"
        value={birthDate}
        onChange={e => setBirthDate(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4 focus:border-[#6BA3D6] transition-colors"
        style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
      />

      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Пол</p>
      <div className="flex gap-2 mb-5">
        {[
          { value: 'male',   label: '👦 Мальчик' },
          { value: 'female', label: '👧 Девочка' },
        ].map(g => {
          const sel = gender === g.value;
          return (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
              style={{
                borderColor: sel ? '#6BA3D6' : '#e8e4dc',
                background:  sel ? '#dbeeff' : '#fafafa',
                color:        sel ? '#4a7fb5' : '#6a6580',
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* ── 2. Рост/вес/группа крови ─────────────────────────────────────── */}
      <div className="border-t pt-4 mb-1" style={{ borderColor: '#f0ece8' }}>
        <SectionHead emoji="📏" title="Антропометрия" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Рост (см)', value: heightCm, setter: setHeightCm, placeholder: '100' },
          { label: 'Вес (кг)',  value: weightKg, setter: setWeightKg, placeholder: '30' },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>{f.label}</p>
            <input
              type="number" min={0}
              value={f.value}
              onChange={e => f.setter(e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#6BA3D6] transition-colors"
              style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Группа крови</p>
          <div className="flex flex-wrap gap-1">
            {BLOOD_GROUPS.map(bg => {
              const sel = bloodGroup === bg;
              return (
                <button key={bg} onClick={() => setBloodGroup(sel ? '' : bg)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all"
                  style={{ borderColor: sel ? '#6BA3D6' : '#e8e4dc', background: sel ? '#dbeeff' : '#fafafa', color: sel ? '#4a7fb5' : '#6a6580' }}
                >
                  {bg}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Резус-фактор</p>
          <div className="flex gap-1">
            {RH_FACTORS.map(rh => {
              const sel = rhFactor === rh;
              return (
                <button key={rh} onClick={() => setRhFactor(sel ? '' : rh)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all"
                  style={{ borderColor: sel ? '#6BA3D6' : '#e8e4dc', background: sel ? '#dbeeff' : '#fafafa', color: sel ? '#4a7fb5' : '#6a6580' }}
                >
                  {rh}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Аллергии ─────────────────────────────────────────────────── */}
      <div className="border-t pt-4 mb-1" style={{ borderColor: '#f0ece8' }}>
        <SectionHead emoji="⚠️" title="Аллергии" />
      </div>
      <div className="mb-5">
        <TagInput
          tags={allergyList}
          onAdd={t => setAllergyList(prev => [...prev, t])}
          onRemove={t => setAllergyList(prev => prev.filter(x => x !== t))}
          placeholder="Пенициллин, орехи..."
        />
      </div>

      {/* ── 4. Болезни ──────────────────────────────────────────────────── */}
      <div className="border-t pt-4 mb-1" style={{ borderColor: '#f0ece8' }}>
        <SectionHead emoji="🏥" title="Хронические заболевания" />
      </div>
      <div className="mb-5">
        <TagInput
          tags={chronicList}
          onAdd={t => setChronicList(prev => [...prev, t])}
          onRemove={t => setChronicList(prev => prev.filter(x => x !== t))}
          placeholder="Астма, диабет..."
        />
      </div>

      <div className="border-t pt-4 mb-1" style={{ borderColor: '#f0ece8' }}>
        <SectionHead emoji="🤧" title="Детские болезни" />
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {CHILD_DISEASES.map(d => {
          const on = childDiseases.includes(d);
          return (
            <button
              key={d}
              onClick={() => setChildDiseases(prev => on ? prev.filter(x => x !== d) : [...prev, d])}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
              style={{
                borderColor: on ? '#6BA3D6' : '#e8e4dc',
                background:  on ? '#dbeeff' : '#fafafa',
                color:        on ? '#4a7fb5' : '#6a6580',
              }}
            >
              {on ? '✓ ' : ''}{d}
            </button>
          );
        })}
      </div>

      {/* ── 5. Прививки ─────────────────────────────────────────────────── */}
      <div className="border-t pt-4 mb-1" style={{ borderColor: '#f0ece8' }}>
        <SectionHead emoji="💉" title="Прививки (календарь Минздрав РУз)" />
      </div>
      <div className="space-y-4 mb-5">
        {VACCINE_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9a96a8' }}>
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map(vax => {
                const status = getVaxStatus(vax);
                return (
                  <div
                    key={vax}
                    className="rounded-xl p-3"
                    style={{ background: '#fafaf8', border: '1px solid #ede9e4' }}
                  >
                    <p className="text-[12px] font-semibold mb-2" style={{ color: '#2a2540' }}>{vax}</p>
                    <div className="flex gap-1.5">
                      {[
                        { val: 'done',     label: '✅ Сделана' },
                        { val: 'not_done', label: '❌ Нет' },
                        { val: 'unknown',  label: '❓ Не знаю' },
                      ].map(s => (
                        <button
                          key={s.val}
                          onClick={() => setVaxStatus(vax, s.val)}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all"
                          style={{
                            borderColor: status === s.val ? '#6BA3D6' : '#e8e4dc',
                            background:  status === s.val ? '#dbeeff' : '#fff',
                            color:        status === s.val ? '#4a7fb5' : '#9a96a8',
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── 6. Заметки родителя ─────────────────────────────────────────── */}
      <div className="border-t pt-4 mb-1" style={{ borderColor: '#f0ece8' }}>
        <SectionHead emoji="📝" title="Заметки родителя" />
      </div>
      <textarea
        value={parentNotes}
        onChange={e => setParentNotes(e.target.value)}
        placeholder="Особенности здоровья, наблюдения, важные сведения..."
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none focus:border-[#6BA3D6] transition-colors"
        style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
      />
    </Modal>
  );
}
