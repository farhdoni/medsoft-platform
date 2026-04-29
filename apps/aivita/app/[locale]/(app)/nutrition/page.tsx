'use client';
import { useState } from 'react';
import { Plus, Camera } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

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

  return (
    <div className="min-h-screen">
      <AppHeader name="Питание" />

      <div className="px-5 space-y-4 pb-6">
        {/* Calories card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-secondary))]">
                КАЛОРИИ СЕГОДНЯ
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-light text-navy">{totals.calories}</span>
                <span className="text-sm text-[rgb(var(--text-muted))]">/ {DAILY_GOAL.calories} ккал</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[rgb(var(--text-muted))]">Осталось</p>
              <p className="text-xl font-semibold text-emerald-600">{DAILY_GOAL.calories - totals.calories}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-pink-blue-mint rounded-full"
              style={{ width: `${Math.min((totals.calories / DAILY_GOAL.calories) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Белки', value: totals.protein, goal: DAILY_GOAL.protein, unit: 'г', color: 'bg-blue-400' },
            { label: 'Жиры', value: totals.fat, goal: DAILY_GOAL.fat, unit: 'г', color: 'bg-orange-400' },
            { label: 'Углеводы', value: totals.carbs, goal: DAILY_GOAL.carbs, unit: 'г', color: 'bg-pink-400' },
          ].map(({ label, value, goal, unit, color }) => (
            <div key={label} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-3">
              <p className="text-xs text-[rgb(var(--text-muted))] mb-1">{label}</p>
              <p className="font-semibold text-navy text-sm">{value}{unit}</p>
              <p className="text-[10px] text-[rgb(var(--text-muted))]">/ {goal}{unit}</p>
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full`}
                  style={{ width: `${Math.min((value / goal) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Meals list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-navy px-1">Приёмы пищи</h2>
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meal.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-navy">{meal.name}</span>
                    <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">{meal.calories} ккал</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-[rgb(var(--text-muted))]">
                      {MEAL_TYPE_LABELS[meal.type]} · {meal.time}
                    </span>
                    <span className="text-[10px] text-[rgb(var(--text-muted))]">
                      Б {meal.protein}г · Ж {meal.fat}г · У {meal.carbs}г
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add meal buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 h-12 bg-white/80 backdrop-blur border border-dashed border-[rgba(120,160,200,0.3)] text-[rgb(var(--text-secondary))] rounded-2xl text-sm hover:bg-white transition-all">
            <Plus className="w-4 h-4" />
            Добавить
          </button>
          <button className="flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-pink-50 to-blue-50 border border-[rgba(236,72,153,0.2)] text-navy rounded-2xl text-sm font-medium hover:shadow-soft transition-all">
            <Camera className="w-4 h-4 text-pink-500" />
            AI-камера
          </button>
        </div>
      </div>
    </div>
  );
}
