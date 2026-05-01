import Link from 'next/link';
import { cookies } from 'next/headers';
import { AlertTriangle, Pill, Clock, FileText } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { getSession } from '@/lib/auth/session';
import { api } from '@/lib/api-client';

type HealthProfile = {
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: string | null;
};

type Allergy = { id: string; allergen: string; type: string };
type ChronicCondition = { id: string; name: string; diagnosedYear?: number | null };
type HistoryEntry = { id: string; name: string; type: string; startDate?: string | null };

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';
  const session = await getSession();

  const { user, profile, allergies, chronic, history } = await getProfileData(sessionCookie);

  const name = user?.name ?? session?.name ?? 'Пользователь';
  const firstName = name.split(' ')[0];
  const initials = getInitials(name);

  const age = profile?.birthDate ? calcAge(profile.birthDate) : null;
  const metaParts: string[] = [];
  if (age) metaParts.push(`${age} лет`);
  if (profile?.bloodType) metaParts.push(`Группа ${profile.bloodType}`);
  if (profile?.heightCm) metaParts.push(`${profile.heightCm} см`);
  if (profile?.weightKg) metaParts.push(`${profile.weightKg} кг`);
  const metaLine = metaParts.join(' · ') || 'Заполни профиль';

  return (
    <div className="min-h-screen">
      <AppHeader name={firstName} />

      <div className="px-5 space-y-4 pb-6">
        {/* Profile card */}
        <div className="bg-gradient-to-br from-blue-50 to-pink-50 rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-pink-blue-mint flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-navy text-lg">{name}</p>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{metaLine}</p>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-pink-600" />
            </div>
            <h3 className="font-semibold text-navy flex-1">Аллергии</h3>
            <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
              {allergies.length}
            </span>
          </div>
          {allergies.length === 0 ? (
            <p className="text-xs text-[rgb(var(--text-muted))]">Не указано</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allergies.map((a) => (
                <span
                  key={a.id}
                  className="px-3 py-1.5 bg-pink-50 text-pink-700 text-sm rounded-xl border border-pink-100 font-medium"
                >
                  {a.allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chronic */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-navy flex-1">Хронические</h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {chronic.length}
            </span>
          </div>
          {chronic.length === 0 ? (
            <p className="text-xs text-[rgb(var(--text-muted))]">Не указано</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {chronic.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100 font-medium"
                >
                  {c.name}
                  {c.diagnosedYear ? ` (${c.diagnosedYear})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Medical history */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-navy flex-1">История</h3>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-[rgb(var(--text-muted))]">Не указано</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-navy">{h.name}</span>
                  {h.startDate && (
                    <span className="text-xs text-[rgb(var(--text-muted))]">
                      {new Date(h.startDate).getFullYear()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/report"
          className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
        >
          <FileText className="w-4 h-4" />
          Создать отчёт для врача
        </Link>
      </div>
    </div>
  );
}
