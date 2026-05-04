'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { HabitWithStatus } from './data';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialHabits: HabitWithStatus[];
  today: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HabitsList({ initialHabits, today }: Props) {
  const [habits, setHabits] = useState<HabitWithStatus[]>(initialHabits);

  function toggleHabit(id: string) {
    setHabits((prev) => {
      const habit = prev.find((h) => h.id === id);
      // Only allow marking done (no delete endpoint)
      if (habit && !habit.done) {
        api.habits.log(id, { date: today, value: '1' }).catch(() => {});
      }
      return prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h));
    });
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="text-4xl">🌱</span>
        <p className="text-[14px] text-text-muted">Нет привычек — добавь первую!</p>
        <button
          className="inline-flex items-center gap-2 rounded-chip px-5 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#9c5e6c', color: '#ffffff' }}
        >
          <Plus className="w-4 h-4" />
          Добавить привычку
        </button>
      </div>
    );
  }

  return (
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
          {/* Emoji */}
          <span className="text-2xl flex-shrink-0 leading-none">{habit.emoji}</span>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-semibold leading-snug"
              style={{
                color: habit.done ? '#548068' : '#2a2540',
                textDecoration: habit.done ? 'line-through' : 'none',
                textDecorationColor: '#80b094',
              }}
            >
              {habit.name}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Цель: {habit.goal}
            </p>
          </div>

          {/* Checkbox */}
          <button
            onClick={() => toggleHabit(habit.id)}
            aria-label={habit.done ? 'Отметить невыполненной' : 'Отметить выполненной'}
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
            style={{
              background: habit.done ? '#548068' : 'transparent',
              border: `2px solid ${habit.done ? '#548068' : '#d0ccc4'}`,
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

      {/* Add habit */}
      <button
        className="w-full flex items-center justify-center gap-2 h-12 rounded-card text-[13px] font-semibold transition-opacity hover:opacity-80 mt-1"
        style={{ background: '#ffffff', color: '#9a96a8', border: '2px dashed #e8e4dc' }}
      >
        <Plus className="w-4 h-4" />
        Добавить привычку
      </button>
    </div>
  );
}
