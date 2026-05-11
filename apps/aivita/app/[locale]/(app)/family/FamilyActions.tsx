'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

const RELATION_OPTIONS = [
  { value: 'spouse',  label: 'Супруг/а' },
  { value: 'child',   label: 'Ребёнок' },
  { value: 'parent',  label: 'Родитель' },
  { value: 'sibling', label: 'Брат/Сестра' },
  { value: 'other',   label: 'Другое' },
] as const;

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName]           = useState('');
  const [relation, setRelation]   = useState<string>('child');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender]       = useState<'male' | 'female' | ''>('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Введите имя'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${API}/v1/aivita/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberName:      name.trim(),
          memberRelation:  relation,
          memberBirthDate: birthDate || null,
          memberGender:    gender || null,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сервера');
      onAdded();
      onClose();
    } catch {
      setErr('Не удалось сохранить. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold" style={{ color: '#2a2540' }}>Добавить члена семьи</h2>
          <button onClick={onClose} className="text-[20px] text-gray-400 hover:text-gray-600 leading-none">×</button>
        </div>

        {/* Name */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Имя *</p>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
          placeholder="Например: Алия, Дима..."
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
          style={{ color: '#2a2540' }}
        />

        {/* Relation */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Степень родства</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {RELATION_OPTIONS.map(r => (
            <button key={r.value} onClick={() => setRelation(r.value)}
              className="py-2 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{ background: relation === r.value ? 'var(--accent-dark)' : '#f4f3ef', color: relation === r.value ? '#fff' : '#2a2540' }}
            >{r.label}</button>
          ))}
        </div>

        {/* Birth date */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Дата рождения (необязательно)</p>
        <input
          value={birthDate} onChange={e => setBirthDate(e.target.value)}
          type="date"
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
          style={{ color: '#2a2540' }}
        />

        {/* Gender */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Пол (необязательно)</p>
        <div className="flex gap-2 mb-5">
          {(['male', 'female', ''] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)}
              className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{ background: gender === g ? 'var(--accent-dark)' : '#f4f3ef', color: gender === g ? '#fff' : '#2a2540' }}
            >{g === 'male' ? 'Мужской' : g === 'female' ? 'Женский' : 'Не указан'}</button>
          ))}
        </div>

        {err && <p className="text-[12px] mb-3" style={{ color: 'var(--accent-dark)' }}>{err}</p>}

        <button onClick={() => void submit()} disabled={saving || !name.trim()}
          className="w-full py-3 rounded-[12px] text-[14px] font-bold text-white disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          {saving ? 'Сохраняем…' : '👨‍👩‍👧 Добавить'}
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function FamilyActions() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  function handleAdded() {
    router.refresh();
  }

  return (
    <>
      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}

      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-card bg-white text-[13px] font-semibold text-accent-rose border-2 border-dashed border-border-soft hover:bg-bg-app transition-colors mb-4"
      >
        <Plus className="w-4 h-4" />
        Добавить члена семьи
      </button>
    </>
  );
}
