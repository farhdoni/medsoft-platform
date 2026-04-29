'use client';
import { useState } from 'react';
import { Plus, Flame } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

type Habit = {
  id: string;
  name: string;
  emoji: string;
  goal: string;
  streak: number;
  done: boolean;
  progress: number; // 0-100
};

const INITIAL_HABITS: Habit[] = [
  { id: '1', name: 'Вода', emoji: '💧', goal: '2.5л', streak: 7, done: true, progress: 56 },
  { id: '2', name: 'Прогулка', emoji: '🚶', goal: '8000 шагов', streak: 3, done: true, progress: 82 },
  { id: '3', name: 'Сон 7ч+', emoji: '🌙', goal: '7 часов', streak: 5, done: false, progress: 0 },
  { id: '4', name: 'Медитация', emoji: '🧘', goal: '10 мин', streak: 2, done: false, progress: 0 },
  { id: '5', name: 'Витамины', emoji: '💊', goal: '1 раз', streak: 12, done: true, progress: 100 },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

  function toggleHabit(id: string) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, done: !h.done, progress: h.done ? 0 : 100 } : h
      )
    );
  }

  const doneToday = habits.filter((h) => h.done).length;
  const totalStreak = Math.max(...habits.map((h) => h.streak));

  return (
    <div className="min-h-screen">
      <AppHeader name="Привычки" />

      <div className="px-5 space-y-4 pb-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 text-center">
            <p className="text-2xl font-bold text-navy">{doneToday}/{habits.length}</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">сегодня</p>
          </div>
          <div className="bg-orange-50/80 backdrop-blur-xl rounded-2xl border border-orange-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{totalStreak}</p>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))]">дней подряд</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4">
          <div className="flex justify-between text-xs text-[rgb(var(--text-secondary))] mb-2">
            <span>Выполнено сегодня</span>
            <span className="font-semibold text-navy">{Math.round((doneToday / habits.length) * 100)}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-pink-blue-mint rounded-full transition-all duration-500"
              style={{ width: `${(doneToday / habits.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Habits list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-navy px-1">На сегодня</h2>
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`bg-white/80 backdrop-blur-xl rounded-2xl border p-4 shadow-soft transition-all ${
                habit.done ? 'border-emerald-100 bg-emerald-50/60' : 'border-[rgba(120,160,200,0.15)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{habit.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-navy">{habit.name}</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                      <Flame className="w-2.5 h-2.5" /> {habit.streak}
                    </span>
                  </div>
                  <p className="text-xs text-[rgb(var(--text-muted))]">Цель: {habit.goal}</p>
                  {habit.done && habit.progress < 100 && (
                    <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-pink-blue-mint rounded-full"
                        style={{ width: `${habit.progress}%` }}
                      />
                    </div>
                  )}
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
          ))}
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
