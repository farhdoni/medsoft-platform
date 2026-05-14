'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

const PROXY = '/api/proxy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  memberName: string;
  memberRelation: string;
  memberBirthDate?: string | null;
  memberGender?: string | null;
  phone?: string | null;
  notes?: string | null;
}

// ─── Relation options — 4-column grid ────────────────────────────────────────

const RELATIONS = [
  { value: 'wife',    label: 'Жена',   emoji: '👩' },
  { value: 'husband', label: 'Муж',    emoji: '👨' },
  { value: 'son',     label: 'Сын',    emoji: '👦' },
  { value: 'daughter',label: 'Дочь',   emoji: '👧' },
  { value: 'mother',  label: 'Мама',   emoji: '👩‍🦳' },
  { value: 'father',  label: 'Папа',   emoji: '👨‍🦳' },
  { value: 'brother', label: 'Брат',   emoji: '🧑' },
  { value: 'sister',  label: 'Сестра', emoji: '👩' },
  { value: 'spouse',  label: 'Супруг', emoji: '💑' },
  { value: 'child',   label: 'Ребёнок',emoji: '🧒' },
  { value: 'parent',  label: 'Родитель',emoji: '🧑‍🦳'},
  { value: 'other',   label: 'Другое', emoji: '👤' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  member: FamilyMember | null;  // null = добавление
  onSaved: () => void;
}

export function FamilyMemberModal({ open, onClose, member, onSaved }: Props) {
  const isEdit = !!member;

  const [name,      setName]      = useState('');
  const [relation,  setRelation]  = useState('child');
  const [birthDate, setBirthDate] = useState('');
  const [gender,    setGender]    = useState('');
  const [phone,     setPhone]     = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [err,       setErr]       = useState('');

  // Заполняем поля при открытии для редактирования
  useEffect(() => {
    if (open) {
      setName(member?.memberName ?? '');
      setRelation(member?.memberRelation ?? 'child');
      setBirthDate(member?.memberBirthDate ?? '');
      setGender(member?.memberGender ?? '');
      setPhone(member?.phone ?? '');
      setNotes(member?.notes ?? '');
      setErr('');
    }
  }, [open, member]);

  async function handleSave() {
    if (!name.trim()) { setErr('Введите имя'); return; }
    setSaving(true); setErr('');
    try {
      const body = {
        memberName:      name.trim(),
        memberRelation:  relation,
        memberBirthDate: birthDate || null,
        memberGender:    gender || null,
        phone:           phone.trim() || null,
        notes:           notes.trim() || null,
      };

      const url = isEdit ? `${PROXY}/family/${member!.id}` : `${PROXY}/family`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('server_error');
      onSaved();
      onClose();
    } catch {
      setErr('Не удалось сохранить. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!member) return;
    if (!confirm(`Удалить ${member.memberName} из семьи?`)) return;
    setDeleting(true);
    try {
      await fetch(`${PROXY}/family/${member.id}`, { method: 'DELETE' });
      onSaved();
      onClose();
    } catch {
      setErr('Не удалось удалить.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? `Редактировать: ${member?.memberName}` : 'Добавить члена семьи'}
      footer={
        <div className="flex flex-col gap-2">
          {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c), var(--accent-dark, #7a3d4a))' }}
          >
            {saving ? 'Сохраняем…' : isEdit ? '💾 Сохранить изменения' : '👨‍👩‍👧 Добавить'}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              {deleting ? 'Удаляем…' : '🗑 Удалить из семьи'}
            </button>
          )}
        </div>
      }
    >
      {/* Имя */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Имя *</p>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }}
        placeholder="Например: Алия, Дима..."
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-5 focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />

      {/* Кем приходится — 4-column grid */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9a96a8' }}>Кем приходится</p>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {RELATIONS.map(r => {
          const selected = relation === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setRelation(r.value)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-[14px] text-center cursor-pointer transition-all border-2"
              style={{
                borderColor: selected ? '#9c5e6c' : '#e8e4dc',
                background:  selected ? '#f0d4dc' : '#fafafa',
              }}
            >
              <span className="text-lg leading-none">{r.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight" style={{ color: selected ? '#7a3d4a' : '#6a6580' }}>
                {r.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Дата рождения */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Дата рождения (необязательно)</p>
      <input
        value={birthDate}
        onChange={e => setBirthDate(e.target.value)}
        type="date"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-5 focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />

      {/* Пол */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Пол</p>
      <div className="flex gap-2 mb-5">
        {[
          { value: 'male',   label: '👨 Мужской' },
          { value: 'female', label: '👩 Женский' },
          { value: '',       label: '— Не указан' },
        ].map(g => {
          const sel = gender === g.value;
          return (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border-2"
              style={{
                borderColor: sel ? '#9c5e6c' : '#e8e4dc',
                background:  sel ? '#f0d4dc' : '#fafafa',
                color:        sel ? '#7a3d4a' : '#6a6580',
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Телефон */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Телефон (необязательно)</p>
      <input
        value={phone}
        onChange={e => setPhone(e.target.value)}
        type="tel"
        placeholder="+998 90 123 45 67"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-5 focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />

      {/* Заметки */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Заметки (необязательно)</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Аллергии, особенности здоровья..."
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />
    </Modal>
  );
}
