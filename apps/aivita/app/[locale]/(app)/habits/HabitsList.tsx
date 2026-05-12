'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

// All API calls go through Next.js proxy (/api/proxy/*) to avoid CORS issues
const PROXY = '/api/proxy';

export interface HabitWithStatus {
  id: string;
  name: string;
  emoji: string;
  goal: string;
  done: boolean;
}

// ─── Add Habit Modal ──────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ['💧','🏃','🧘','😴','🥗','📚','💊','🚴','🏋️','🧹','✍️','🎯','🚶','🍎','☕'];

function AddHabitModal({ onClose, onAdded }: { onClose: () => void; onAdded: (h: HabitWithStatus) => void }) {
  const [name, setName]         = useState('');
  const [emoji, setEmoji]       = useState('✅');
  const [goalType, setGoalType] = useState<'binary' | 'count'>('binary');
  const [goalValue, setGoalValue] = useState('1');
  const [goalUnit, setGoalUnit]   = useState('раз');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Введите название'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${PROXY}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          emoji: emoji || '✅',
          goalType,
          goalValue: goalType === 'count' ? goalValue : null,
          goalUnit:  goalType === 'count' ? goalUnit  : null,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сервера');
      const json = await res.json();
      const h = json.data;
      onAdded({
        id: h.id,
        name: h.name,
        emoji: h.emoji ?? '✅',
        goal: goalType === 'count' ? `${goalValue} ${goalUnit}` : '1 раз',
        done: false,
      });
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
      title="Новая привычка"
      footer={
        <>
          {err && <p className="text-xs mb-2 font-semibold text-[color:var(--accent-dark)]">{err}</p>}
          <button onClick={() => void submit()} disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
          >
            {saving ? 'Сохраняем…' : `${emoji} Добавить привычку`}
          </button>
        </>
      }
    >
      {/* Emoji picker */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-app-t3">Эмодзи</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {EMOJI_OPTIONS.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
            style={{ background: emoji === e ? 'var(--accent-bg-light)' : '#f4f3ef', border: emoji === e ? '2px solid var(--accent-dark)' : '2px solid transparent' }}
          >{e}</button>
        ))}
      </div>

      {/* Name */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Название *</p>
      <input
        autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
        placeholder="Например: пить воду, читать..."
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4"
        style={{ color: '#2a2540' }}
      />

      {/* Goal type */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Тип цели</p>
      <div className="flex gap-2 mb-4">
        {(['binary', 'count'] as const).map(t => (
          <button key={t} onClick={() => setGoalType(t)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: goalType === t ? 'var(--accent-dark)' : '#f4f3ef', color: goalType === t ? '#fff' : '#2a2540' }}
          >{t === 'binary' ? 'Да/Нет' : 'Количество'}</button>
        ))}
      </div>

      {goalType === 'count' && (
        <div className="flex gap-2">
          <input value={goalValue} onChange={e => setGoalValue(e.target.value)}
            type="number" min="1" placeholder="Кол-во"
            className="w-24 rounded-xl border px-3 py-2 text-sm outline-none"
          />
          <input value={goalUnit} onChange={e => setGoalUnit(e.target.value)}
            placeholder="раз / мин / мл"
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          />
        </div>
      )}
    </Modal>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialHabits: HabitWithStatus[];
  today: string;
}

export function HabitsList({ initialHabits, today }: Props) {
  const router = useRouter();
  const [habits, setHabits]   = useState<HabitWithStatus[]>(initialHabits);
  const [showAdd, setShowAdd] = useState(false);

  function toggleHabit(id: string) {
    setHabits((prev) => {
      const habit = prev.find((h) => h.id === id);
      if (habit && !habit.done) {
        fetch(`${PROXY}/habits/${id}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, value: '1' }),
        }).catch(() => {});
      }
      return prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h));
    });
  }

  function handleAdded(h: HabitWithStatus) {
    setHabits(prev => [...prev, h]);
    router.refresh();
  }

  return (
    <>
      {showAdd && <AddHabitModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="text-4xl">🌱</span>
          <p className="text-[14px] text-text-muted">Нет привычек — добавь первую!</p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-chip px-5 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent-dark)', color: '#ffffff' }}
          >
            + Добавить привычку
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center gap-4 p-4 rounded-card transition-all"
              style={{
                background: habit.done ? '#eef6f1' : '#ffffff',
                border: `1px solid ${habit.done ? '#a8d4b8' : '#e8e4dc'}`,
              }}
            >
              <span className="text-2xl flex-shrink-0 leading-none">{habit.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold leading-snug"
                  style={{ color: habit.done ? '#548068' : '#2a2540', textDecoration: habit.done ? 'line-through' : 'none', textDecorationColor: '#80b094' }}>
                  {habit.name}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">Цель: {habit.goal}</p>
              </div>
              <button
                onClick={() => toggleHabit(habit.id)}
                aria-label={habit.done ? 'Отметить невыполненной' : 'Отметить выполненной'}
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                style={{ background: habit.done ? '#548068' : 'transparent', border: `2px solid ${habit.done ? '#548068' : '#d0ccc4'}` }}
              >
                {habit.done && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          ))}

          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-card text-[13px] font-semibold transition-opacity hover:opacity-80 mt-1"
            style={{ background: '#ffffff', color: '#9a96a8', border: '2px dashed #e8e4dc' }}
          >
            + Добавить привычку
          </button>
        </div>
      )}
    </>
  );
}
