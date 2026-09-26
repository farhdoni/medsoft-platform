import { cookies } from 'next/headers';

// Separate from loadHomeData() (data.ts) on purpose — that loader feeds the
// unflagged Home page, and its output must stay byte-for-byte unchanged (the
// before/after screenshot without the flag has to match pixel-for-pixel).
// This duplicates a couple of small fetches (user/timezone) rather than risk
// touching that file at all.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

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
    if (!r.ok) return null;
    const json = await r.json() as unknown;
    if (json !== null && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
      return (json as { data: T }).data;
    }
    return json as T;
  } catch {
    return null;
  }
}

// ─── API response shapes ─────────────────────────────────────────────────────

interface ApiUser {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  timezone: string | null;
}

interface ApiVitalNumeric { value: number; unit: string }
interface ApiVitalSleep { hours: number; quality?: string }
interface ApiVitalBP { systolic: number; diastolic: number }
interface ApiVital {
  id: string;
  type: string;
  value: ApiVitalNumeric | ApiVitalSleep | ApiVitalBP | Record<string, unknown>;
  recordedAt: string;
}

export interface HomeStateApi {
  progress: {
    hasCard: boolean;
    stages: { questionnaire: boolean; checkup: boolean; gadgets: boolean; documents: boolean };
    stagesDone: number;
  };
  hasChronicConditions: boolean;
  firstChronicConditionName: string | null;
  healthScore: { total: number; calculatedAt: string } | null;
  lastLabResultDate: string | null;
  doctorReply: {
    hasUnread: boolean;
    senderName?: string;
    message?: string;
    sentAt?: string;
    conversationId?: string;
  };
}

export interface HomeSoft3dData {
  displayName: string;
  /** 0–23, in the user's own local time — see home-state-logic's greetingKeyForHour. */
  localHour: number;
  homeState: HomeStateApi | null;
  weightPoints: Array<{ date: string; kg: number }>;
  latestBP: { systolic: number; diastolic: number } | null;
  latestPulseBpm: number | null;
  latestSleepHours: number | null;
}

function localHourNow(tz: string): number {
  const formatted = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date());
  const hour = parseInt(formatted, 10);
  return Number.isNaN(hour) ? new Date().getHours() : hour % 24;
}

function numericVitalValue(v: ApiVital): number | null {
  const val = v.value as ApiVitalNumeric;
  return typeof val?.value === 'number' ? val.value : null;
}

function sleepVitalValue(v: ApiVital): number | null {
  const val = v.value as ApiVitalSleep;
  return typeof val?.hours === 'number' ? val.hours : null;
}

function bpVitalValue(v: ApiVital): { systolic: number; diastolic: number } | null {
  const val = v.value as ApiVitalBP;
  return typeof val?.systolic === 'number' && typeof val?.diastolic === 'number'
    ? { systolic: val.systolic, diastolic: val.diastolic }
    : null;
}

const TREND_WINDOW_DAYS = 90;

export async function loadHomeSoft3dData(): Promise<HomeSoft3dData> {
  const fromDate = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [apiUser, homeState, weightVitals, bpVitals, pulseVitals, sleepVitals] = await Promise.all([
    authFetch<ApiUser>('/v1/aivita/users'),
    authFetch<HomeStateApi>('/v1/aivita/home-state'),
    // Decision #7: the 2 new requests to the existing vitals endpoint.
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=weight&from=${fromDate}T00:00:00.000Z`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=blood_pressure&from=${fromDate}T00:00:00.000Z`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=heart_rate&from=${fromDate}T00:00:00.000Z`),
    authFetch<ApiVital[]>(`/v1/aivita/health-score/vitals?type=sleep_hours&from=${fromDate}T00:00:00.000Z`),
  ]);

  const displayName = apiUser?.name || apiUser?.nickname || apiUser?.email?.split('@')[0] || '';
  const localHour = localHourNow(apiUser?.timezone || 'Asia/Tashkent');

  const weightPoints = (weightVitals ?? [])
    .map((v) => ({ date: v.recordedAt, kg: numericVitalValue(v) }))
    .filter((p): p is { date: string; kg: number } => p.kg !== null);

  const latestBpVital = bpVitals && bpVitals.length > 0 ? bpVitals[bpVitals.length - 1] : null;
  const latestBP = latestBpVital ? bpVitalValue(latestBpVital) : null;

  const latestPulseVital = pulseVitals && pulseVitals.length > 0 ? pulseVitals[pulseVitals.length - 1] : null;
  const latestPulseBpm = latestPulseVital ? numericVitalValue(latestPulseVital) : null;

  const latestSleepVital = sleepVitals && sleepVitals.length > 0 ? sleepVitals[sleepVitals.length - 1] : null;
  const latestSleepHours = latestSleepVital ? sleepVitalValue(latestSleepVital) : null;

  return { displayName, localHour, homeState, weightPoints, latestBP, latestPulseBpm, latestSleepHours };
}
