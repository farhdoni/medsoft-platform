import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface ReportRecord {
  id: string;
  reportNumber: string;
  fileUrl: string;
  shareToken: string | null;
  createdAt: string;
  snapshotData?: {
    patient?: {
      healthScore?: number | null;
      heightCm?: number | null;
      weightKg?: string | null;
      gender?: string | null;
    };
    allergies?: Array<{ allergen: string }>;
    chronic?: Array<{ name: string }>;
  } | null;
}

export async function loadReportData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const [reportsRes, cardRes] = await Promise.allSettled([
    api.reports.list(sessionCookie),
    api.onboarding.medicalCard(sessionCookie),
  ]);

  const reports: ReportRecord[] =
    reportsRes.status === 'fulfilled' && 'data' in reportsRes.value
      ? (reportsRes.value.data as ReportRecord[])
      : [];

  const cardCode: string | null =
    cardRes.status === 'fulfilled' && 'data' in cardRes.value
      ? ((cardRes.value.data as { card?: { cardCode?: string } }).card?.cardCode ?? null)
      : null;

  return {
    reports,
    latest: reports[0] ?? null,
    cardCode,
  };
}
