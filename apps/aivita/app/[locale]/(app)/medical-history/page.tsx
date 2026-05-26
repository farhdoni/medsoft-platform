import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { apiRequest } from '@/lib/api-client';
import { MedicalHistoryClient } from './MedicalHistoryClient';

export type MedicalHistoryEntry = {
  id: string;
  name: string;
  type: 'illness' | 'surgery' | 'injury' | 'pregnancy' | 'other';
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
};

export default async function MedicalHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const res = await apiRequest<MedicalHistoryEntry[]>('/health-profile/medical-history', {
    sessionCookie,
  });
  const entries: MedicalHistoryEntry[] = 'data' in res ? (res.data ?? []) : [];

  return (
    <PageShell active="medical-history" locale={locale}>
      <div className="max-w-[700px] mx-auto pb-6">
        <MedicalHistoryClient initialEntries={entries} />
      </div>
    </PageShell>
  );
}
