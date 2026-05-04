import { cookies } from 'next/headers';
import type { User, DailyMetrics, ActivityPoint, Report } from '@/lib/cabinet-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.aivita.uz';

async function authFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aivita_session');

    const r = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...(sessionCookie ? { Cookie: `aivita_session=${sessionCookie.value}` } : {}),
      },
    });

    if (!r.ok) {
      console.warn(`[home/data] ${path} → ${r.status}, using fallback`);
      return fallback;
    }
    return r.json() as Promise<T>;
  } catch (e) {
    console.warn(`[home/data] ${path} failed:`, e);
    return fallback;
  }
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

const FALLBACK_USER: User = {
  id: 'unknown',
  name: 'Пользователь',
  email: 'user@aivita.uz',
  avatarInitial: 'U',
  locale: 'ru',
};

const FALLBACK_METRICS: DailyMetrics = {
  heartRate: { bpm: 72, deltaWeek: 3 },
  water: { liters: 1.4, goalLiters: 2.0 },
  steps: { count: 8200, deltaPctWeek: 12 },
  habits: { completed: 2, total: 3 },
  healthIndex: { score: 76, label: 'хорошо' },
};

const FALLBACK_ACTIVITY: ActivityPoint[] = [
  { day: 'Пн', steps: 5400, km: 3.6, sleepHours: 7.2 },
  { day: 'Вт', steps: 7100, km: 4.7, sleepHours: 6.8 },
  { day: 'Ср', steps: 6200, km: 4.2, sleepHours: 7.5 },
  { day: 'Чт', steps: 8800, km: 5.9, sleepHours: 7.0 },
  { day: 'Пт', steps: 7600, km: 5.1, sleepHours: 6.5 },
  { day: 'Сб', steps: 9200, km: 6.2, sleepHours: 8.1 },
  { day: 'Вс', steps: 8200, km: 5.5, sleepHours: 7.8 },
];

// ─── API response shapes ──────────────────────────────────────────────────────

interface ApiMe { name?: string; email?: string; id?: string; locale?: string }
interface ApiHealthScore { score?: number }
interface ApiMetrics { heart_rate?: number; water_ml?: number; steps?: number }
interface ApiHabits { items?: { completed: boolean }[] }

// ─── Main loader ──────────────────────────────────────────────────────────────

export async function loadHomeData(): Promise<{
  user: User;
  metrics: DailyMetrics;
  activity: ActivityPoint[];
  report: Report | null;
}> {
  const [me, healthScore, metricsRaw, habitsRaw] = await Promise.all([
    authFetch<ApiMe>('/v1/aivita/me', {}),
    authFetch<ApiHealthScore>('/v1/aivita/health-score', {}),
    authFetch<ApiMetrics>('/v1/aivita/metrics/today', {}),
    authFetch<ApiHabits>('/v1/aivita/habits', {}),
  ]);

  const name = me.name ?? FALLBACK_USER.name;
  const user: User = {
    id: me.id ?? FALLBACK_USER.id,
    name,
    email: me.email ?? FALLBACK_USER.email,
    avatarInitial: name.charAt(0).toUpperCase(),
    locale: (me.locale as User['locale']) ?? 'ru',
  };

  const score = healthScore.score ?? FALLBACK_METRICS.healthIndex.score;
  const completedHabits = habitsRaw.items?.filter(h => h.completed).length ?? FALLBACK_METRICS.habits.completed;
  const totalHabits = habitsRaw.items?.length ?? FALLBACK_METRICS.habits.total;

  const metrics: DailyMetrics = {
    heartRate: {
      bpm: metricsRaw.heart_rate ?? FALLBACK_METRICS.heartRate.bpm,
      deltaWeek: FALLBACK_METRICS.heartRate.deltaWeek,
    },
    water: {
      liters: metricsRaw.water_ml != null ? metricsRaw.water_ml / 1000 : FALLBACK_METRICS.water.liters,
      goalLiters: FALLBACK_METRICS.water.goalLiters,
    },
    steps: {
      count: metricsRaw.steps ?? FALLBACK_METRICS.steps.count,
      deltaPctWeek: FALLBACK_METRICS.steps.deltaPctWeek,
    },
    habits: { completed: completedHabits, total: totalHabits || 1 },
    healthIndex: {
      score,
      label: score >= 80 ? 'отлично' : score >= 60 ? 'хорошо' : 'требует внимания',
    },
  };

  // Last day synced with real step count
  const activity = FALLBACK_ACTIVITY.map((pt, i) =>
    i === FALLBACK_ACTIVITY.length - 1
      ? { ...pt, steps: metrics.steps.count }
      : pt
  );

  return { user, metrics, activity, report: null };
}
