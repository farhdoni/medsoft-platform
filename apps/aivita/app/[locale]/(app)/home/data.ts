import { cookies } from 'next/headers';
import type { User, DailyMetrics, ActivityPoint, Report } from '@/lib/cabinet-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// ─── Doctor preview (fetched server-side, passed as props to HomeDashboard) ──

export interface DoctorPreview {
  userId: string;
  name: string;
  specialization?: string;
  rating?: number;
  photoUrl?: string;
  avatarUrl?: string;
  verificationStatus?: string;
  experienceStartDate?: string;
}

async function getFeaturedDoctors(): Promise<DoctorPreview[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/catalog?sort=rating&limit=3`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as DoctorPreview[]) ?? [];
  } catch {
    return [];
  }
}

// All aivita API responses are { data: T } — unwrap automatically
async function authFetch<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aivita_api');

    const r = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...(sessionCookie ? { Cookie: `aivita_api=${sessionCookie.value}` } : {}),
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
  timezone: string | null;      // IANA id, e.g. "Asia/Tashkent"
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

// `YYYY-MM-DD` for `date` as seen in `tz`. en-CA renders ISO-style dashes.
// Used to bound non-aggregate vitals (heart_rate) by the user's local calendar
// day rather than the server's UTC day (UTC+5 → early-morning readings lost).
function localDateString(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// ─── Main loader ──────────────────────────────────────────────────────────────

export async function loadHomeData(): Promise<{
  user: User;
  metrics: DailyMetrics;
  activity: ActivityPoint[];
  report: Report | null;
  vitalsLatest: Record<string, ApiVital | null>;
  doctors: DoctorPreview[];
}> {
  // Fetch the user first: vitals queries need the user's timezone to bound
  // "today" by their local day (heart_rate is stored at its real timestamp, so a
  // UTC day boundary drops UTC+5 readings recorded 00:00–05:00 local).
  const apiUser = await authFetch<ApiUser>('/v1/aivita/users');
  const tz = apiUser?.timezone || 'Asia/Tashkent';

  // Non-aggregate vitals (heart_rate) → user's LOCAL calendar day.
  const todayLocal = localDateString(new Date(), tz);
  // Daily-aggregate vitals (steps, water_ml, sleep_hours) are persisted on the
  // UTC-midnight grid (see DAILY_AGGREGATE_TYPES in apps/api). Keep querying them
  // on that grid via explicit UTC instants so their boundary is unchanged.
  const todayUtc = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
  const sevenDaysAgoUtc = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const [
    apiHealthScore,
    vitalsHR,
    vitalsWater,
    vitalsSteps,
    vitalsSleep,
    apiHabits,
    apiHabitLogs,
    apiReports,
    apiVitalsLatest,
    doctors,
  ] = await Promise.all([
    authFetch<ApiHealthScore>('/v1/aivita/health-score'),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=heart_rate&from=${todayLocal}`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=water_ml&from=${todayUtc}T00:00:00.000Z`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=steps&from=${sevenDaysAgoUtc}T00:00:00.000Z`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=sleep_hours&from=${sevenDaysAgoUtc}T00:00:00.000Z`),
    authFetch<ApiHabit[]>('/v1/aivita/habits'),
    authFetch<ApiHabitLog[]>(`/v1/aivita/habits/logs/range?from=${todayUtc}&to=${todayUtc}`),
    authFetch<ApiReport[]>('/v1/aivita/reports'),
    authFetch<Record<string, ApiVital | null>>('/v1/aivita/vitals/latest'),
    getFeaturedDoctors(),
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
  // Use null when no real data exists so MetricsRow shows "—" instead of "0"
  const hrRaw = vitalsHR && vitalsHR.length > 0 ? numericVitalValue(vitalsHR[0]) : null;
  const hrBpm = hrRaw ?? 0;

  // ─── Vitals — water (sum today, ml → liters) ──────────────────────────────
  const waterMlTotal = vitalsWater && vitalsWater.length > 0
    ? vitalsWater.reduce((sum, v) => sum + numericVitalValue(v), 0)
    : null;
  const waterLiters = waterMlTotal != null
    ? Math.round((waterMlTotal / 1000) * 10) / 10
    : 0;

  // ─── Vitals — steps (latest for today = last item for today) ──────────────
  const todayStepsVitals = vitalsSteps?.filter(v =>
    v.recordedAt.startsWith(todayUtc)
  ) ?? [];
  const stepsTodayRaw = todayStepsVitals.length > 0
    ? numericVitalValue(todayStepsVitals[0])
    : null;
  const stepsToday = stepsTodayRaw ?? 0;

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

  const vitalsLatest: Record<string, ApiVital | null> = apiVitalsLatest ?? {};

  return { user, metrics, activity, report, vitalsLatest, doctors: doctors ?? [] };
}
