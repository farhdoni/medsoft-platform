'use client';
import { useState } from 'react';
import { Plus, Camera } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

type Meal = {
  id: string;
  name: string;
  emoji: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  time: string;
};

const MOCK_MEALS: Meal[] = [
  { id: '1', name: 'Овсянка с ягодами', emoji: '🥣', type: 'breakfast', calories: 320, protein: 12, fat: 6, carbs: 55, time: '08:30' },
  { id: '2', name: 'Плов узбекский', emoji: '🍚', type: 'lunch', calories: 580, protein: 25, fat: 18, carbs: 78, time: '13:00' },
  { id: '3', name: 'Яблоко', emoji: '🍎', type: 'snack', calories: 80, protein: 0, fat: 0, carbs: 20, time: '15:30' },
];

const DAILY_GOAL = { calories: 2000, protein: 120, fat: 60, carbs: 250 };
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

const MACRO_COLORS = {
  protein: { bg: '#d4dff0', accent: '#5e75a8' },
  fat: { bg: '#f0d4dc', accent: '#9c5e6c' },
  carbs: { bg: '#e0d8f0', accent: '#6e5fa0' },
};

export default function NutritionPage() {
  const [meals] = useState<Meal[]>(MOCK_MEALS);

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const calPct = Math.min((totals.calories / DAILY_GOAL.calories) * 100, 100);
  const remaining = DAILY_GOAL.calories - totals.calories;

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6">
      <PageHeader
        title="Питание"
        subtitle="Дневник питания и макронутриенты"
        accentColor="#80b094"
      />

      <div className="space-y-4 pb-8">

        {/* Calories hero */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #d4e8d8 0%, #e0d8f0 100%)', position: 'relative', overflow: 'hidden' }}
        >
          <div className="absolute -top-2 -right-2 pointer-events-none opacity-60">
            <Icon3D name="food" size={80} />
          </div>
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#548068' }}>
            Калории сегодня
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[40px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
              {totals.calories}
            </span>
            <span className="text-[14px]" style={{ color: '#6a6580' }}>
              / {DAILY_GOAL.calories} ккал
            </span>
            <span className="text-[13px] font-semibold" style={{ color: '#548068' }}>
              ↓ {remaining} осталось
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${calPct}%`,
                background: 'linear-gradient(90deg, #80b094, #9889c4)',
              }}
            />
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { key: 'protein', label: 'Белки', value: totals.protein, goal: DAILY_GOAL.protein },
              { key: 'fat', label: 'Жиры', value: totals.fat, goal: DAILY_GOAL.fat },
              { key: 'carbs', label: 'Углеводы', value: totals.carbs, goal: DAILY_GOAL.carbs },
            ] as const
          ).map(({ key, label, value, goal }) => {
            const { bg, accent } = MACRO_COLORS[key];
            const pct = Math.min((value / goal) * 100, 100);
            return (
              <div key={key} className="rounded-2xl p-3" style={{ background: bg }}>
                <p className="text-[11px] font-semibold mb-1" style={{ color: accent }}>
                  {label}
                </p>
                <p className="text-[18px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
                  {value}г
                </p>
                <p className="text-[10px] mt-0.5 mb-2" style={{ color: '#9a96a8' }}>/ {goal}г</p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.5)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Meals */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>
            Приёмы пищи
          </p>
          <div className="space-y-2">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center gap-4 rounded-2xl p-4"
                style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
              >
                <span className="text-2xl flex-shrink-0">{meal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-semibold truncate" style={{ color: '#2a2540' }}>
                      {meal.name}
                    </p>
                    <p className="text-[13px] font-bold flex-shrink-0 ml-2" style={{ color: '#9c5e6c' }}>
                      {meal.calories} ккал
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                      {MEAL_TYPE_LABELS[meal.type]} · {meal.time}
                    </p>
                    <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                      Б{meal.protein} Ж{meal.fat} У{meal.carbs}г
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex items-center justify-center gap-2 h-12 rounded-2xl text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#ffffff', color: '#9c5e6c', border: '2px dashed #e8e4dc' }}
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
          <button
            className="flex items-center justify-center gap-2 h-12 rounded-2xl text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#e0d8f0', color: '#6e5fa0' }}
          >
            <Camera className="w-4 h-4" />
            AI-камера
          </button>
        </div>
      </div>
    </div>
  );
}
