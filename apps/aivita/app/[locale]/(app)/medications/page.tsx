import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { MedicationsClient } from './MedicationsClient';

export interface ScheduleItem {
  scheduleId: string;
  title: string;
  dosage: string | null;
  instructions: string | null;
  foodInstruction: string | null;
  sideEffects: string[];
  contraindications: string[];
  remainingPills: number | null;
  time: string;
  period: 'morning' | 'afternoon' | 'evening';
  status: string;
  takenAt: string | null;
  createdBy: string;
  doctorId: string | null;
  logId: string | null;
}

export interface MedStats {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
  percent: number;
  days: number;
  currentStreak: number;
  longestStreak: number;
  streakBadges: Array<{ id: string; name: string; icon: string; earnedAt: string }>;
}

export interface MedicationRow {
  id: string;
  title: string;
  dosage: string | null;
  frequency: string;
  times: string[];
  instructions: string | null;
  sideEffects: string[];
  contraindications: string[];
  foodInstruction: string | null;
  remainingPills: number | null;
  persistentReminder: boolean;
  source: string;
  startDate: string;
  endDate: string | null;
  durationDays: number | null;
  isActive: boolean;
  createdBy: string;
  doctorId: string | null;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

export default async function MedicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const [todayRes, statsRes, listRes] = await Promise.allSettled([
    api.medications.today(sessionCookie),
    api.medications.stats(sessionCookie, 'week'),
    api.medications.list(sessionCookie),
  ]);

  const schedule: ScheduleItem[] =
    todayRes.status === 'fulfilled' && 'data' in todayRes.value
      ? (todayRes.value.data as ScheduleItem[])
      : [];

  const stats: MedStats | null =
    statsRes.status === 'fulfilled' && 'data' in statsRes.value
      ? (statsRes.value.data as MedStats)
      : null;

  const medications: MedicationRow[] =
    listRes.status === 'fulfilled' && 'data' in listRes.value
      ? (listRes.value.data as MedicationRow[])
      : [];

  return (
    <PageShell active="medications" locale={locale}>
      <div className="max-w-[480px] mx-auto pb-24">
        <MedicationsClient
          initialSchedule={schedule}
          initialStats={stats}
          initialMedications={medications}
          locale={locale}
        />
      </div>
    </PageShell>
  );
}
