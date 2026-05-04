import { Plus, Camera } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import { loadNutritionData } from './data';

// ─── Config ───────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
};

const MACROS = [
  { key: 'protein' as const, label: 'Белки',    bg: 'bg-bg-soft-blue',   accent: 'text-accent-blue-deep',   goal: 120 },
  { key: 'fat'     as const, label: 'Жиры',     bg: 'bg-bg-soft-pink',   accent: 'text-accent-rose',        goal: 60  },
  { key: 'carbs'   as const, label: 'Углеводы', bg: 'bg-bg-soft-purple', accent: 'text-accent-purple-deep', goal: 250 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NutritionPage() {
  const { totals, meals, waterLiters, caloriesGoal } = await loadNutritionData();

  const calPct   = Math.min(Math.round((totals.calories / caloriesGoal) * 100), 100);
  const remaining = Math.max(caloriesGoal - totals.calories, 0);

  return (
    <PageShell active="nutrition">
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Hero — calories ───────────────────────────────────────────────── */}
        <section
          className="rounded-hero p-6 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #d4e8d8 0%, #c8d8f0 100%)' }}
        >
          <div className="absolute -top-3 -right-3 opacity-40 pointer-events-none">
            <Icon name="food" size={90} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">
            КАЛОРИИ СЕГОДНЯ
          </p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[44px] font-extrabold leading-none text-text-primary">
              {totals.calories}
            </span>
            <span className="text-[15px] text-text-secondary">/ {caloriesGoal} ккал</span>
          </div>
          <p className="text-[12px] text-text-secondary mb-3">
            Б {Math.round(totals.protein)}г · Ж {Math.round(totals.fat)}г · У {Math.round(totals.carbs)}г · Вода {waterLiters} л
          </p>
          <div className="h-2.5 rounded-full overflow-hidden bg-white/40">
            <div
              className="h-full rounded-full bg-gradient-pink-purple transition-all duration-500"
              style={{ width: `${calPct}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">
            {remaining > 0 ? `↓ ${remaining} ккал осталось` : '✓ Цель достигнута'}
          </p>
        </section>

        {/* ── Macros grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {MACROS.map(({ key, label, bg, accent, goal }) => {
            const value = Math.round(totals[key]);
            const pct = Math.min(Math.round((value / goal) * 100), 100);
            return (
              <div key={key} className={`rounded-card p-3 ${bg}`}>
                <p className={`text-[11px] font-semibold mb-1 ${accent}`}>{label}</p>
                <p className="text-[20px] font-extrabold leading-none text-text-primary">{value}г</p>
                <p className="text-[10px] text-text-muted mt-0.5 mb-2">/ {goal}г</p>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/50">
                  <div className="h-full rounded-full bg-gradient-pink-purple" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Meals list ────────────────────────────────────────────────────── */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
          Приёмы пищи
        </p>

        {meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center rounded-card bg-white border border-border-soft mb-4">
            <span className="text-4xl">🍽️</span>
            <p className="text-[14px] font-semibold text-text-primary">Ещё ничего не записано</p>
            <p className="text-[12px] text-text-muted">Добавь первый приём пищи сегодня</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {meals.map((meal) => {
              const time = meal.consumedAt
                ? new Date(meal.consumedAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <div key={meal.id} className="flex items-center gap-3 p-4 rounded-card bg-white border border-border-soft">
                  <span className="text-2xl flex-shrink-0 leading-none">{meal.emoji ?? '🍽️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-text-primary truncate">{meal.name}</p>
                      <p className="text-[13px] font-bold text-accent-rose flex-shrink-0">
                        {Math.round(Number(meal.calories))} ккал
                      </p>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {MEAL_LABELS[meal.mealType] ?? meal.mealType}
                      {time ? ` · ${time}` : ''}
                      {meal.proteinG ? ` · Б${Math.round(Number(meal.proteinG))} Ж${Math.round(Number(meal.fatG ?? 0))} У${Math.round(Number(meal.carbsG ?? 0))}г` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 h-12 rounded-card bg-white border-2 border-dashed border-border-soft text-[13px] font-semibold text-accent-rose hover:bg-bg-app transition-colors">
            <Plus className="w-4 h-4" />
            Добавить
          </button>
          <button className="flex items-center justify-center gap-2 h-12 rounded-card bg-bg-soft-purple text-[13px] font-semibold text-accent-purple-deep hover:opacity-80 transition-opacity" disabled>
            <Camera className="w-4 h-4" />
            AI-камера
          </button>
        </div>

        {/* AI placeholder */}
        <div className="rounded-card bg-bg-soft-blue p-4 mt-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-white/60 flex-shrink-0 flex items-center justify-center">
            <Icon name="doctor" size={20} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text-primary mb-0.5">
              Скоро: AI-распознавание блюд
            </p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Сфотографируй тарелку — AI определит КБЖУ автоматически
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
