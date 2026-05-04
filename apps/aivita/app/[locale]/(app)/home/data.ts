import { cookies } from 'next/headers';
import type { User, DailyMetrics, ActivityPoint, Report } from '@/lib/cabinet-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.aivita.uz';

// All aivita API responses are { data: T } — unwrap automatically
async function authFetch<T>(path: string): Promise<T | null> {
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
      console.warn(`[home/data] ${path} → ${r.status}`);
      return null;
    }
    const json = await r.json() as unknown;
    if (json !== null && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
      return (json as { data: T }).data;
    }
    return json as T;
  } catch (e) {
    console.warn(`[home/data] ${path} failed:`, e);
    return null;
  }
}

// ─── API response shapes (verified against apps/api/src/routes/aivita/) ──────

interface ApiUser {
  id: string;
  email: string | null;
  name: string | null;          // field is `name` (not fullName)
  nickname: string | null;
  locale: string;
}

interface ApiHealthScore {
  totalScore: number;           // field is `totalScore` (not `score`)
  calculatedAt: string;
  cardiovascularScore?: number | null;
  digestiveScore?: number | null;
  sleepScore?: number | null;
  mentalScore?: number | null;
  musculoskeletalScore?: number | null;
}

// vitals.value is JSONB — shape depends on type:
// heart_rate / water_ml / steps → { value: number, unit: string }
// blood_pressure → { systolic: number, diastolic: number }
// sleep_hours → { hours: number, quality?: string }
interface ApiVitalNumeric { value: number; unit: string }
interface ApiVitalSleep { hours: number; quality?: string }
interface ApiVital {
  id: string;
  type: string;
  value: ApiVitalNumeric | ApiVitalSleep | Record<string, unknown>;
  recordedAt: string;
}

interface ApiHabit {
  id: string;
  name: string;
  emoji: string | null;
  goalType: string;
  isActive: boolean;
}

interface ApiHabitLog {
  habitId: string;
  date: string;
}

interface ApiReport {
  id: string;
  reportNumber: string;
  fileUrl: string;              // field is `fileUrl` (not `pdfUrl`)
  shareToken: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numericVitalValue(v: ApiVital): number {
  const val = v.value as ApiVitalNumeric;
  return typeof val?.value === 'number' ? val.value : 0;
}

function sleepVitalValue(v: ApiVital): number {
  const val = v.value as ApiVitalSleep;
  return typeof val?.hours === 'number' ? val.hours : 0;
}

const RU_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
type RuDay = typeof RU_DAYS[number];

// ─── Main loader ──────────────────────────────────────────────────────────────

export async function loadHomeData(): Promise<{
  user: User;
  metrics: DailyMetrics;
  activity: ActivityPoint[];
  report: Report | null;
}> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const [
    apiUser,
    apiHealthScore,
    vitalsHR,
    vitalsWater,
    vitalsSteps,
    vitalsSleep,
    apiHabits,
    apiHabitLogs,
    apiReports,
  ] = await Promise.all([
    authFetch<ApiUser>('/v1/aivita/auth/me'),
    authFetch<ApiHealthScore>('/v1/aivita/health-score'),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=heart_rate&from=${today}`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=water_ml&from=${today}`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=steps&from=${sevenDaysAgo}`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=sleep_hours&from=${sevenDaysAgo}`),
    authFetch<ApiHabit[]>('/v1/aivita/habits'),
    authFetch<ApiHabitLog[]>(`/v1/aivita/habits/logs/range?from=${today}&to=${today}`),
    authFetch<ApiReport[]>('/v1/aivita/reports'),
  ]);

  // ─── User ──────────────────────────────────────────────────────────────────
  const displayName =
    apiUser?.name ||
    apiUser?.nickname ||
    apiUser?.email?.split('@')[0] ||
    'Пользователь';

  const user: User = {
    id: apiUser?.id ?? 'unknown',
    name: displayName,
    email: apiUser?.email ?? 'user@aivita.uz',
    avatarInitial: displayName.charAt(0).toUpperCase(),
    locale: (apiUser?.locale as User['locale']) ?? 'ru',
  };

  // ─── Health score ──────────────────────────────────────────────────────────
  const score = apiHealthScore?.totalScore ?? 0;

  // ─── Vitals — heart rate (latest today) ───────────────────────────────────
  const hrBpm = vitalsHR && vitalsHR.length > 0
    ? numericVitalValue(vitalsHR[0])
    : 0;

  // ─── Vitals — water (sum today, ml → liters) ──────────────────────────────
  const waterMlTotal = vitalsWater
    ? vitalsWater.reduce((sum, v) => sum + numericVitalValue(v), 0)
    : 0;
  const waterLiters = Math.round((waterMlTotal / 1000) * 10) / 10;

  // ─── Vitals — steps (latest for today = last item for today) ──────────────
  const todayStepsVitals = vitalsSteps?.filter(v =>
    v.recordedAt.startsWith(today)
  ) ?? [];
  const stepsToday = todayStepsVitals.length > 0
    ? numericVitalValue(todayStepsVitals[0])
    : 0;

  // ─── Habits — count done today ─────────────────────────────────────────────
  const allHabits = apiHabits ?? [];
  const doneHabitIds = new Set((apiHabitLogs ?? []).map(l => l.habitId));
  const completedHabits = allHabits.filter(h => doneHabitIds.has(h.id)).length;
  const totalHabits = allHabits.length;

  // ─── Metrics ───────────────────────────────────────────────────────────────
  const metrics: DailyMetrics = {
    heartRate: { bpm: hrBpm, deltaWeek: 0 },
    water: { liters: waterLiters, goalLiters: 2.0 },
    steps: { count: stepsToday, deltaPctWeek: 0 },
    habits: { completed: completedHabits, total: totalHabits || 1 },
    healthIndex: {
      score,
      label: score === 0 ? 'нет данных'
           : score >= 80 ? 'отлично'
           : score >= 60 ? 'хорошо'
           : 'требует внимания',
    },
  };

  // ─── Activity 7 days (from steps + sleep vitals) ──────────────────────────
  // Build a map: date → { steps, sleepHours }
  const dayMap = new Map<string, { steps: number; sleepHours: number }>();

  // Fill 7 days with zeros first
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { steps: 0, sleepHours: 0 });
  }

  // Fill steps — take max per day if multiple entries
  for (const v of vitalsSteps ?? []) {
    const key = v.recordedAt.split('T')[0];
    if (dayMap.has(key)) {
      const cur = dayMap.get(key)!;
      const val = numericVitalValue(v);
      dayMap.set(key, { ...cur, steps: Math.max(cur.steps, val) });
    }
  }

  // Fill sleep — take first (most recent) per day
  const seenSleepDays = new Set<string>();
  for (const v of vitalsSleep ?? []) {
    const key = v.recordedAt.split('T')[0];
    if (dayMap.has(key) && !seenSleepDays.has(key)) {
      seenSleepDays.add(key);
      const cur = dayMap.get(key)!;
      dayMap.set(key, { ...cur, sleepHours: sleepVitalValue(v) });
    }
  }

  const activity: ActivityPoint[] = Array.from(dayMap.entries()).map(([dateStr, vals]) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay(); // noon to avoid TZ edge cases
    const day = RU_DAYS[dow] as RuDay;
    const km = Math.round((vals.steps / 1300) * 10) / 10; // ~1300 steps/km average
    return { day, steps: vals.steps, km, sleepHours: vals.sleepHours };
  });

  // ─── Latest report ─────────────────────────────────────────────────────────
  const latestReport = apiReports && apiReports.length > 0 ? apiReports[0] : null;
  const report: Report | null = latestReport ? {
    id: latestReport.id,
    title: `Отчёт врачу № ${latestReport.reportNumber}`,
    body: 'Медицинская сводка — биомаркеры, привычки, здоровье. Готово к отправке.',
    pdfUrl: latestReport.fileUrl,
    generatedAt: latestReport.createdAt,
  } : null;

  return { user, metrics, activity, report };
}
