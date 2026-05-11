import Link from 'next/link';
import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { getInitials } from '@/lib/date-utils';
import { ProfileClient } from './ProfileClient';
import QrCardSection from '@/components/medical-card/QrCardSection';

// ─── Types (exported so ProfileClient can import) ─────────────────────────────

export type HealthProfile = {
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: string | null;
  smokingStatus?: string | null;
  alcoholFrequency?: string | null;
  exerciseFrequency?: string | null;
  dietType?: string | null;
  sleepSchedule?: string | null;
  stressLevel?: string | null;
  city?: string | null;
  phone?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  pinfl?: string | null;
  passportIssuedBy?: string | null;
  passportIssuedDate?: string | null;
  passportExpires?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  doctorName?: string | null;
  doctorPhone?: string | null;
  clinic?: string | null;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
  insuranceExpires?: string | null;
  insuranceHotline?: string | null;
};

export type Allergy = { id: string; allergen: string; type: string; severity?: string };
export type ChronicCondition = { id: string; name: string; diagnosedYear?: number | null };
export type HistoryEntry = { id: string; name: string; type: string; startDate?: string | null };
export type Medication = { id: string; name: string; dosage?: string | null; frequency?: string | null };

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getProfileData(cookie: string) {
  const [userRes, profileRes, allergiesRes, chronicRes, historyRes, medsRes] =
    await Promise.allSettled([
      api.users.me(cookie),
      api.healthProfile.get(cookie),
      api.healthProfile.allergies(cookie),
      api.healthProfile.chronic(cookie),
      api.healthProfile.history(cookie),
      api.healthProfile.medications(cookie),
    ]);

  const user =
    userRes.status === 'fulfilled' && 'data' in userRes.value
      ? (userRes.value.data as { name: string; email: string } | null)
      : null;

  const profile =
    profileRes.status === 'fulfilled' && 'data' in profileRes.value
      ? (profileRes.value.data as HealthProfile | null)
      : null;

  const allergies: Allergy[] =
    allergiesRes.status === 'fulfilled' && 'data' in allergiesRes.value
      ? (allergiesRes.value.data as Allergy[])
      : [];

  const chronic: ChronicCondition[] =
    chronicRes.status === 'fulfilled' && 'data' in chronicRes.value
      ? (chronicRes.value.data as ChronicCondition[])
      : [];

  const history: HistoryEntry[] =
    historyRes.status === 'fulfilled' && 'data' in historyRes.value
      ? (historyRes.value.data as HistoryEntry[])
      : [];

  const medications: Medication[] =
    medsRes.status === 'fulfilled' && 'data' in medsRes.value
      ? (medsRes.value.data as Medication[])
      : [];

  return { user, profile, allergies, chronic, history, medications };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const { user, profile, allergies, chronic, history, medications } =
    await getProfileData(sessionCookie);

  const name = user?.name ?? 'Пользователь';
  const email = user?.email ?? '';
  const initials = getInitials(name);

  return (
    <PageShell active="" locale={locale}>
      <div className="max-w-[720px] mx-auto pb-8">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="rounded-[20px] p-6 mb-5 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-mid))' }}
        >
          <div className="w-20 h-20 rounded-[20px] bg-white/20 flex-shrink-0 flex items-center justify-center text-[28px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-0.5">МОЙ ПРОФИЛЬ</p>
            <p className="text-[20px] font-extrabold text-white leading-tight truncate">{name}</p>
            {email && <p className="text-[12px] text-white/70 mt-0.5 truncate">{email}</p>}
          </div>
        </section>

        {/* ── All interactive sections (metric cards + editing + lists) ──────── */}
        <ProfileClient
          locale={locale}
          profile={profile}
          allergies={allergies}
          chronic={chronic}
          history={history}
          medications={medications}
        />

        {/* ── QR Medical Card ─────────────────────────────────────────────── */}
        <div className="mt-2 mb-2">
          <QrCardSection />
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section
          className="rounded-[20px] p-5 mt-2"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-mid))' }}
        >
          <p className="text-white font-bold text-[15px] mb-3 text-center">Показать анкету врачу</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/${locale}/report`}
              className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold py-2.5 rounded-[12px] transition"
            >
              📄 Создать PDF
            </Link>
            <button className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold py-2.5 rounded-[12px] transition">
              📤 Отправить врачу
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold py-2.5 rounded-[12px] transition">
              🖨️ Печать
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold py-2.5 rounded-[12px] transition">
              🔗 Поделиться
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
