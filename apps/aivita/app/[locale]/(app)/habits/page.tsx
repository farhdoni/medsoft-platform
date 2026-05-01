'use client';
import { useState, useEffect } from 'react';
import { Plus, Flame } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { api } from '@/lib/api-client';
import { getTodayDate } from '@/lib/date-utils';

type ApiHabit = {
  id: string;
  name: string;
  emoji: string | null;
  goalType: string;
  goalValue: string | null;
  goalUnit: string | null;
  isActive: boolean;
};

type ApiLog = {
  habitId: string;
  date: string;
  value: string | null;
};

type Habit = {
  id: string;
  name: string;
  emoji: string;
  goal: string;
  done: boolean;
};

function toGoalLabel(h: ApiHabit): string {
  if (h.goalValue && h.goalUnit) return `${h.goalValue} ${h.goalUnit}`;
  if (h.goalType === 'binary') return '1 раз';
  if (h.goalValue) return String(h.goalValue);
  return '—';
}

const FALLBACK_HABITS: Habit[] = [
  { id: '1', name: 'Вода', emoji: '💧', goal: '2.5л', done: false },
  { id: '2', name: 'Прогулка', emoji: '🚶', goal: '8000 шагов', done: false },
  { id: '3', name: 'Сон 7ч+', emoji: '🌙', goal: '7 часов', done: false },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getTodayDate();

    Promise.allSettled([
      api.habits.list(),
      api.habits.todayLogs(today),
    ]).then(([habitsRes, logsRes]) => {
      const rawHabits: ApiHabit[] =
        habitsRes.status === 'fulfilled' && 'data' in habitsRes.value
          ? (habitsRes.value.data as ApiHabit[])
          : [];

      const rawLogs: ApiLog[] =
        logsRes.status === 'fulfilled' && 'data' in logsRes.value
          ? (logsRes.value.data as ApiLog[])
          : [];

      const doneIds = new Set(rawLogs.map((l) => l.habitId));

      if (rawHabits.length === 0) {
        setHabits(FALLBACK_HABITS);
      } else {
        setHabits(
          rawHabits.map((h) => ({
            id: h.id,
            name: h.name,
            emoji: h.emoji ?? '✅',
            goal: toGoalLabel(h),
            done: doneIds.has(h.id),
          }))
        );
      }
      setLoading(false);
    });
  }, []);

  function toggleHabit(id: string) {
    // Read current done-state inside updater to avoid stale closure, then fire API side-effect
    setHabits((prev) => {
      const habit = prev.find((h) => h.id === id);
      if (habit && !habit.done) {
        // Mark as done — log to API (fire-and-forget)
        api.habits.log(id, { date: getTodayDate(), value: '1' }).catch(() => {});
      }
      // Unmark: no delete-log endpoint yet — optimistic only
      return prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h));
    });
  }

  const doneToday = habits.filter((h) => h.done).length;
  const total = habits.length || 1;

  return (
    <div className="min-h-screen">
      <AppHeader name="Привычки" />

      <div className="px-5 space-y-4 pb-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 text-center">
            {loading ? (
              <div className="h-8 w-16 mx-auto bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-bold text-navy">{doneToday}/{habits.length}</p>
            )}
            <p className="text-xs text-[rgb(var(--text-muted))]">сегодня</p>
          </div>
          <div className="bg-orange-50/80 backdrop-blur-xl rounded-2xl border border-orange-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{doneToday}</p>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))]">выполнено</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4">
          <div className="flex justify-between text-xs text-[rgb(var(--text-secondary))] mb-2">
            <span>Выполнено сегодня</span>
            <span className="font-semibold text-navy">
              {Math.round((doneToday / total) * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-pink-blue-mint rounded-full transition-all duration-500"
              style={{ width: `${(doneToday / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Habits list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-navy px-1">На сегодня</h2>

          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white/80 rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 h-16 animate-pulse" />
            ))
          ) : (
            habits.map((habit) => (
              <div
                key={habit.id}
                className={`bg-white/80 backdrop-blur-xl rounded-2xl border p-4 shadow-soft transition-all ${
                  habit.done ? 'border-emerald-100 bg-emerald-50/60' : 'border-[rgba(120,160,200,0.15)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{habit.emoji}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-navy">{habit.name}</span>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Цель: {habit.goal}</p>
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      habit.done
                        ? 'bg-gradient-pink-blue-mint border-transparent'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    {habit.done && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add button */}
        <button className="w-full flex items-center justify-center gap-2 h-12 bg-white/80 backdrop-blur border border-dashed border-[rgba(120,160,200,0.3)] text-[rgb(var(--text-secondary))] rounded-2xl text-sm hover:bg-white transition-all">
          <Plus className="w-4 h-4" />
          Добавить привычку
        </button>
      </div>
    </div>
  );
}
