import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiHabit {
  id: string;
  name: string;
  emoji: string | null;
  goalType: string;
  goalValue: string | null;
  goalUnit: string | null;
  isActive: boolean;
}

interface ApiLog {
  habitId: string;
  date: string;
  value: string | null;
}

export interface HabitWithStatus {
  id: string;
  name: string;
  emoji: string;
  goal: string;
  done: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toGoalLabel(h: ApiHabit): string {
  if (h.goalValue && h.goalUnit) return `${h.goalValue} ${h.goalUnit}`;
  if (h.goalType === 'binary') return '1 раз';
  if (h.goalValue) return String(h.goalValue);
  return '—';
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loadHabitsData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';
  const today = new Date().toISOString().split('T')[0];

  const [habitsRes, logsRes] = await Promise.all([
    api.habits.list(sessionCookie),
    api.habits.todayLogs(today, sessionCookie),
  ]);

  const rawHabits: ApiHabit[] =
    'data' in habitsRes ? (habitsRes.data as ApiHabit[]) : [];
  const rawLogs: ApiLog[] =
    'data' in logsRes ? (logsRes.data as ApiLog[]) : [];

  const doneIds = new Set(rawLogs.map((l) => l.habitId));

  const habits: HabitWithStatus[] = rawHabits
    .filter((h) => h.isActive)
    .map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji ?? '✅',
      goal: toGoalLabel(h),
      done: doneIds.has(h.id),
    }));

  const doneToday = habits.filter((h) => h.done).length;

  return { habits, doneToday, today };
}
