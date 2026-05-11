'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Camera } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

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
      const res = await fetch(`${API}/v1/aivita/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold" style={{ color: '#2a2540' }}>Добавить приём пищи</h2>
          <button onClick={onClose} className="text-[20px] text-gray-400 hover:text-gray-600 leading-none">×</button>
        </div>

        {/* Emoji picker */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#9a96a8' }}>Эмодзи</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className="w-9 h-9 rounded-[10px] text-[18px] flex items-center justify-center transition-all"
              style={{ background: emoji === e ? 'var(--accent-bg-light)' : '#f4f3ef', border: emoji === e ? '2px solid var(--accent-dark)' : '2px solid transparent' }}
            >{e}</button>
          ))}
        </div>

        {/* Name */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Название *</p>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="Греческий салат, куриный суп..."
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
          style={{ color: '#2a2540' }}
        />

        {/* Meal type */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Приём пищи</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {MEAL_TYPES.map(t => (
            <button key={t.value} onClick={() => setMealType(t.value)}
              className="py-2 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{ background: mealType === t.value ? 'var(--accent-dark)' : '#f4f3ef', color: mealType === t.value ? '#fff' : '#2a2540' }}
            >{t.label}</button>
          ))}
        </div>

        {/* Calories */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Калории *</p>
        <input
          value={calories} onChange={e => setCalories(e.target.value)}
          type="number" min="0" placeholder="ккал"
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
        />

        {/* Macros */}
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>КБЖУ (необязательно)</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input value={protein} onChange={e => setProtein(e.target.value)}
            type="number" min="0" placeholder="Белки г"
            className="rounded-[10px] border px-2 py-2 text-[13px] outline-none text-center"
          />
          <input value={fat} onChange={e => setFat(e.target.value)}
            type="number" min="0" placeholder="Жиры г"
            className="rounded-[10px] border px-2 py-2 text-[13px] outline-none text-center"
          />
          <input value={carbs} onChange={e => setCarbs(e.target.value)}
            type="number" min="0" placeholder="Угл. г"
            className="rounded-[10px] border px-2 py-2 text-[13px] outline-none text-center"
          />
        </div>

        {err && <p className="text-[12px] mb-3" style={{ color: 'var(--accent-dark)' }}>{err}</p>}

        <button onClick={() => void submit()} disabled={saving || !name.trim() || !calories}
          className="w-full py-3 rounded-[12px] text-[14px] font-bold text-white disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          {saving ? 'Сохраняем…' : `${emoji} Добавить`}
        </button>
      </div>
    </div>
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
