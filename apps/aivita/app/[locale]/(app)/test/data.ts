import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface HealthScoreRecord {
  id: string;
  totalScore: number;
  cardiovascularScore: number | null;
  digestiveScore: number | null;
  sleepScore: number | null;
  mentalScore: number | null;
  musculoskeletalScore: number | null;
  calculatedAt: string;
}

export async function loadTestData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const [latestRes, historyRes] = await Promise.all([
    api.healthScore.latest(sessionCookie),
    api.healthScore.history(sessionCookie),
  ]);

  const latest =
    'data' in latestRes ? (latestRes.data as HealthScoreRecord | null) : null;
  const history =
    'data' in historyRes ? (historyRes.data as HealthScoreRecord[]) : [];

  return {
    hasScore: !!latest,
    score: latest,
    // history[0] is the latest — show the rest as previous
    history: history.slice(1, 5),
  };
}
