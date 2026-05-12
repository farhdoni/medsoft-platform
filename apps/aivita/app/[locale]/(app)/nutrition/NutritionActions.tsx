'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Camera } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const PROXY = '/api/proxy';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch',     label: 'Обед' },
  { value: 'dinner',    label: 'Ужин' },
  { value: 'snack',     label: 'Перекус' },
] as const;

const EMOJI_OPTIONS = ['🍳','🥗','🍜','🥩','🍎','🥑','🧁','🍞','🥪','🍚','🍲','🫙','🥛','🍌','🫐'];

// ─── Add Meal Modal ───────────────────────────────────────────────────────────

function AddMealModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName]         = useState('');
  const [emoji, setEmoji]       = useState('🍽️');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [calories, setCalories] = useState('');
  const [protein, setProtein]   = useState('');
  const [fat, setFat]           = useState('');
  const [carbs, setCarbs]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Введите название'); return; }
    if (!calories || isNaN(Number(calories))) { setErr('Введите калории'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${PROXY}/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          emoji: emoji || '🍽️',
          mealType,
          calories: Number(calories),
          proteinG:  protein ? Number(protein) : null,
          fatG:      fat     ? Number(fat)     : null,
          carbsG:    carbs   ? Number(carbs)   : null,
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
      title="Добавить приём пищи"
      footer={
        <>
          {err && <p className="text-xs mb-2 font-semibold text-[color:var(--accent-dark)]">{err}</p>}
          <button onClick={() => void submit()} disabled={saving || !name.trim() || !calories}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
          >
            {saving ? 'Сохраняем…' : `${emoji} Добавить`}
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
        placeholder="Греческий салат, куриный суп..."
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4"
        style={{ color: '#2a2540' }}
      />

      {/* Meal type */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Приём пищи</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {MEAL_TYPES.map(t => (
          <button key={t.value} onClick={() => setMealType(t.value)}
            className="py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: mealType === t.value ? 'var(--accent-dark)' : '#f4f3ef', color: mealType === t.value ? '#fff' : '#2a2540' }}
          >{t.label}</button>
        ))}
      </div>

      {/* Calories */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">Калории *</p>
      <input
        value={calories} onChange={e => setCalories(e.target.value)}
        type="number" min="0" placeholder="ккал"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4"
      />

      {/* Macros */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-app-t3">КБЖУ (необязательно)</p>
      <div className="grid grid-cols-3 gap-2">
        <input value={protein} onChange={e => setProtein(e.target.value)}
          type="number" min="0" placeholder="Белки г"
          className="rounded-xl border px-2 py-2 text-xs outline-none text-center"
        />
        <input value={fat} onChange={e => setFat(e.target.value)}
          type="number" min="0" placeholder="Жиры г"
          className="rounded-xl border px-2 py-2 text-xs outline-none text-center"
        />
        <input value={carbs} onChange={e => setCarbs(e.target.value)}
          type="number" min="0" placeholder="Угл. г"
          className="rounded-xl border px-2 py-2 text-xs outline-none text-center"
        />
      </div>
    </Modal>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function NutritionActions() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  function handleAdded() {
    router.refresh();
  }

  return (
    <>
      {showAdd && <AddMealModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 h-12 rounded-card bg-white border-2 border-dashed border-border-soft text-[13px] font-semibold text-accent-rose hover:bg-bg-app transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
        <button
          className="flex items-center justify-center gap-2 h-12 rounded-card bg-bg-soft-purple text-[13px] font-semibold text-accent-purple-deep hover:opacity-80 transition-opacity"
          disabled
        >
          <Camera className="w-4 h-4" />
          AI-камера
        </button>
      </div>
    </>
  );
}
