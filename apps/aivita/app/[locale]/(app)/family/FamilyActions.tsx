'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const PROXY = '/api/proxy';

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
      const res = await fetch(`${PROXY}/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <Modal
      isOpen
      onClose={onClose}
      title="Добавить члена семьи"
      footer={
        <>
          {err && <p className="text-xs mb-2 font-semibold text-[color:var(--accent-dark)]">{err}</p>}
          <button onClick={() => void submit()} disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
          >
            {saving ? 'Сохраняем…' : '👨‍👩‍👧 Добавить'}
          </button>
        </>
      }
    >
      {/* Name */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Имя *</p>
      <input
        autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
        placeholder="Например: Алия, Дима..."
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4"
        style={{ color: '#2a2540' }}
      />

      {/* Relation */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Степень родства</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {RELATION_OPTIONS.map(r => (
          <button key={r.value} onClick={() => setRelation(r.value)}
            className="py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: relation === r.value ? 'var(--accent-dark)' : '#f4f3ef', color: relation === r.value ? '#fff' : '#2a2540' }}
          >{r.label}</button>
        ))}
      </div>

      {/* Birth date */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Дата рождения (необязательно)</p>
      <input
        value={birthDate} onChange={e => setBirthDate(e.target.value)}
        type="date"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4"
        style={{ color: '#2a2540' }}
      />

      {/* Gender */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Пол (необязательно)</p>
      <div className="flex gap-2">
        {(['male', 'female', ''] as const).map((g) => (
          <button key={g} onClick={() => setGender(g)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: gender === g ? 'var(--accent-dark)' : '#f4f3ef', color: gender === g ? '#fff' : '#2a2540' }}
          >{g === 'male' ? 'Мужской' : g === 'female' ? 'Женский' : 'Не указан'}</button>
        ))}
      </div>
    </Modal>
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
