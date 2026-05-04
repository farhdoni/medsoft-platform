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
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const res = await api.reports.list(sessionCookie);
  const reports: ReportRecord[] =
    'data' in res ? (res.data as ReportRecord[]) : [];

  return {
    reports,
    latest: reports[0] ?? null,
  };
}
