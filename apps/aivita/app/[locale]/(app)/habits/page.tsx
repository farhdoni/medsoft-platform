'use client';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { api } from '@/lib/api-client';
import { getTodayDate } from '@/lib/date-utils';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

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
  streak?: number;
};

function toGoalLabel(h: ApiHabit): string {
  if (h.goalValue && h.goalUnit) return `${h.goalValue} ${h.goalUnit}`;
  if (h.goalType === 'binary') return '1 раз';
  if (h.goalValue) return String(h.goalValue);
  return '—';
}

const FALLBACK_HABITS: Habit[] = [
  { id: '1', name: 'Вода', emoji: '💧', goal: '2.5л', done: false, streak: 5 },
  { id: '2', name: 'Прогулка', emoji: '🚶', goal: '8000 шагов', done: false, streak: 3 },
  { id: '3', name: 'Сон 7ч+', emoji: '🌙', goal: '7 часов', done: false, streak: 7 },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getTodayDate();
    Promise.allSettled([api.habits.list(), api.habits.todayLogs(today)]).then(
      ([habitsRes, logsRes]) => {
        const rawHabits: ApiHabit[] =
          habitsRes.status === 'fulfilled' && 'data' in habitsRes.value
            ? (habitsRes.value.data as ApiHabit[])
            : [];
        const rawLogs: ApiLog[] =
          logsRes.status === 'fulfilled' && 'data' in logsRes.value
            ? (logsRes.value.data as ApiLog[])
            : [];
        const doneIds = new Set(rawLogs.map((l) => l.habitId));
        setHabits(
          rawHabits.length === 0
            ? FALLBACK_HABITS
            : rawHabits.map((h) => ({
                id: h.id,
                name: h.name,
                emoji: h.emoji ?? '✅',
                goal: toGoalLabel(h),
                done: doneIds.has(h.id),
              }))
        );
        setLoading(false);
      }
    );
  }, []);

  function toggleHabit(id: string) {
    setHabits((prev) => {
      const habit = prev.find((h) => h.id === id);
      if (habit && !habit.done) {
        api.habits.log(id, { date: getTodayDate(), value: '1' }).catch(() => {});
      }
      return prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h));
    });
  }

  const doneToday = habits.filter((h) => h.done).length;
  const total = habits.length || 1;
  const pct = Math.round((doneToday / total) * 100);

  return (
    <PageShell active="habits">
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="Привычки"
        subtitle="Ежедневные привычки для здоровья"
        accentColor="#cc8a96"
      />

      <div className="space-y-4 pb-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Done card */}
          <div
            className="rounded-2xl p-4"
            style={{ background: '#f0d4dc' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon3D name="book" size={28} />
            </div>
            <p className="text-[28px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
              {doneToday}/{habits.length}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#6a6580' }}>выполнено сегодня</p>
          </div>

          {/* Progress card */}
          <div
            className="rounded-2xl p-4 flex flex-col justify-between"
            style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
          >
            <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Прогресс</p>
            <div>
              <div
                className="h-2 rounded-full overflow-hidden mb-2"
                style={{ background: '#e8e4dc' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #cc8a96, #9889c4)',
                  }}
                />
              </div>
              <p className="text-[22px] font-extrabold" style={{ color: '#9c5e6c' }}>{pct}%</p>
            </div>
          </div>
        </div>

        {/* Habits list */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider mb-3 px-0.5" style={{ color: '#9a96a8' }}>
            На сегодня
          </p>

          <div className="space-y-2">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl h-16 animate-pulse"
                    style={{ background: '#e8e4dc' }}
                  />
                ))
              : habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-4 rounded-2xl p-4 transition-all"
                    style={{
                      background: habit.done ? '#d4e8d8' : '#ffffff',
                      border: `1px solid ${habit.done ? '#80b09440' : '#e8e4dc'}`,
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{habit.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold"
                        style={{
                          color: habit.done ? '#548068' : '#2a2540',
                          textDecoration: habit.done ? 'line-through' : 'none',
                          textDecorationColor: '#80b094',
                        }}
                      >
                        {habit.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                          Цель: {habit.goal}
                        </p>
                        {habit.streak && habit.streak > 1 && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#f0d4dc', color: '#9c5e6c' }}
                          >
                            🔥 {habit.streak} дн
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Checkbox */}
                    <button
                      onClick={() => toggleHabit(habit.id)}
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: habit.done ? '#548068' : 'transparent',
                        border: `2px solid ${habit.done ? '#548068' : '#e8e4dc'}`,
                      }}
                    >
                      {habit.done && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
          </div>
        </div>

        {/* Add habit */}
        <button
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#ffffff', color: '#9c5e6c', border: '2px dashed #e8e4dc' }}
        >
          <Plus className="w-4 h-4" />
          Добавить привычку
        </button>
      </div>
    </div>
    </PageShell>
  );
}
