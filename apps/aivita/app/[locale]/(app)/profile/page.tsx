import Link from 'next/link';
import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { calcAge, getInitials } from '@/lib/date-utils';
import { ProfileClient } from './ProfileClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthProfile = {
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: string | null;
  smokingStatus?: string | null;
  alcoholFrequency?: string | null;
  exerciseFrequency?: string | null;
  dietType?: string | null;
  city?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  doctorName?: string | null;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
};

type Allergy = { id: string; allergen: string; type: string; severity?: string };
type ChronicCondition = { id: string; name: string; diagnosedYear?: number | null };
type HistoryEntry = { id: string; name: string; type: string; startDate?: string | null };

// ─── Completion calc ──────────────────────────────────────────────────────────

function calcCompletion(p: HealthProfile | null, allergies: Allergy[], phone?: string): number {
  if (!p) return 0;
  const fields = [
    { filled: !!p.birthDate, w: 3 },
    { filled: !!p.gender, w: 3 },
    { filled: !!p.heightCm, w: 3 },
    { filled: !!p.weightKg, w: 3 },
    { filled: allergies.length > 0, w: 3 },
    { filled: !!p.city, w: 2 },
    { filled: !!p.bloodType, w: 2 },
    { filled: !!p.smokingStatus, w: 2 },
    { filled: !!p.alcoholFrequency, w: 2 },
    { filled: !!p.exerciseFrequency, w: 2 },
    { filled: !!p.emergencyContactName, w: 2 },
    { filled: !!p.dietType, w: 1 },
    { filled: !!p.doctorName, w: 1 },
  ];
  const total = fields.reduce((s, f) => s + f.w, 0);
  const done = fields.filter(f => f.filled).reduce((s, f) => s + f.w, 0);
  return Math.round((done / total) * 100);
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getProfileData(cookie: string) {
  const [userRes, profileRes, allergiesRes, chronicRes, historyRes] = await Promise.allSettled([
    api.users.me(cookie),
    api.healthProfile.get(cookie),
    api.healthProfile.allergies(cookie),
    api.healthProfile.chronic(cookie),
    api.healthProfile.history(cookie),
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

  return { user, profile, allergies, chronic, history };
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

  const { user, profile, allergies, chronic, history } = await getProfileData(sessionCookie);

  const name = user?.name ?? 'Пользователь';
  const email = user?.email ?? '';
  const initials = getInitials(name);
  const age = profile?.birthDate ? calcAge(profile.birthDate) : null;
  const completion = calcCompletion(profile, allergies);

  const bmi =
    profile?.heightCm && profile?.weightKg
      ? (Number(profile.weightKg) / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
      : null;

  return (
    <PageShell active="" locale={locale}>
      <div className="max-w-[720px] mx-auto pb-8">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="rounded-[20px] p-6 mb-5 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, #b89dc4, #957aaa)' }}
        >
          <div className="w-20 h-20 rounded-[20px] bg-white/20 flex-shrink-0 flex items-center justify-center text-[28px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-0.5">МОЙ ПРОФИЛЬ</p>
            <p className="text-[20px] font-extrabold text-white leading-tight truncate">{name}</p>
            {email && <p className="text-[12px] text-white/70 mt-0.5 truncate">{email}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {age && <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{age} лет</span>}
              {profile?.gender && <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{profile.gender === 'male' ? 'Муж' : 'Жен'}</span>}
              {profile?.bloodType && <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{profile.bloodType}</span>}
              {profile?.city && <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{profile.city}</span>}
            </div>
          </div>
        </section>

        {/* ── Completion bar ─────────────────────────────────────────────────── */}
        <section className="rounded-[16px] bg-white border border-[#e8e4dc] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Профиль заполнен</p>
            <p className="text-[13px] font-bold" style={{ color: '#9c5e6c' }}>{completion}%</p>
          </div>
          <div className="h-2 rounded-full bg-[#f0d4dc] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completion}%`, background: 'linear-gradient(90deg, #9c5e6c, #6e5fa0)' }}
            />
          </div>
          {completion < 100 && (
            <p className="text-[11px] mt-1.5" style={{ color: '#9a96a8' }}>Заполните профиль для лучших AI-рекомендаций</p>
          )}
        </section>

        {/* ── Anthropometrics ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Рост', value: profile?.heightCm ? `${profile.heightCm}` : null, unit: 'см', bg: '#f0d4dc', color: '#9c5e6c' },
            { label: 'Вес', value: profile?.weightKg ?? null, unit: 'кг', bg: '#e0d8f0', color: '#6e5fa0' },
            { label: 'ИМТ', value: bmi, unit: '', bg: '#d4e8d8', color: '#548068' },
            { label: 'Кровь', value: profile?.bloodType ?? null, unit: '', bg: '#d4dff0', color: '#5e75a8' },
          ].map(({ label, value, unit, bg, color }) => (
            <div key={label} className="rounded-[14px] p-3 flex flex-col gap-1" style={{ background: bg }}>
              <p className="text-[10px] font-semibold" style={{ color }}>{label}</p>
              {value ? (
                <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
                  {value}{unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: '#9a96a8' }}>{unit}</span>}
                </p>
              ) : (
                <p className="text-[12px] font-medium" style={{ color: '#cc8a96' }}>+ добавить</p>
              )}
            </div>
          ))}
        </section>

        {/* ── Client interactive sections ────────────────────────────────────── */}
        <ProfileClient
          locale={locale}
          profile={profile}
          allergies={allergies}
          chronic={chronic}
          history={history}
        />

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section
          className="rounded-[20px] p-5 mt-2"
          style={{ background: 'linear-gradient(135deg, #b89dc4, #957aaa)' }}
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
