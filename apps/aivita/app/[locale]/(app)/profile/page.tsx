import Link from 'next/link';
import { cookies } from 'next/headers';
import { AlertTriangle, Pill, Clock, FileText } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { api } from '@/lib/api-client';
import { calcAge, getInitials } from '@/lib/date-utils';

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

  const { user, profile, allergies, chronic, history } = await getProfileData(sessionCookie);

  const name = user?.name ?? 'Пользователь';
  const initials = getInitials(name);
  const age = profile?.birthDate ? calcAge(profile.birthDate) : null;

  const metaParts: string[] = [];
  if (age) metaParts.push(`${age} лет`);
  if (profile?.bloodType) metaParts.push(`Гр. ${profile.bloodType}`);
  if (profile?.heightCm) metaParts.push(`${profile.heightCm} см`);
  if (profile?.weightKg) metaParts.push(`${profile.weightKg} кг`);
  const metaLine = metaParts.join(' · ') || 'Заполни профиль';

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6">
      <PageHeader
        title="Мед. профиль"
        subtitle="Личные и медицинские данные"
        accentColor="#cc8a96"
      />

      <div className="space-y-4 pb-8">

        {/* Avatar card */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #f0d4dc 0%, #e0d8f0 100%)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-[22px] font-bold"
            style={{ background: 'rgba(255,255,255,0.6)', color: '#9c5e6c' }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-[18px] font-bold" style={{ color: '#2a2540' }}>{name}</p>
            <p className="text-[13px] mt-0.5" style={{ color: '#6a6580' }}>{metaLine}</p>
          </div>
          <div className="flex-shrink-0">
            <Icon3D name="shield" size={44} />
          </div>
        </div>

        {/* Health data sections */}
        {[
          {
            title: 'Аллергии',
            icon: AlertTriangle,
            count: allergies.length,
            bg: '#f0d4dc',
            color: '#9c5e6c',
            content:
              allergies.length === 0 ? (
                <p className="text-[12px]" style={{ color: '#9a96a8' }}>Не указано</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <span
                      key={a.id}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: '#f0d4dc', color: '#9c5e6c' }}
                    >
                      {a.allergen}
                    </span>
                  ))}
                </div>
              ),
          },
          {
            title: 'Хронические',
            icon: Pill,
            count: chronic.length,
            bg: '#d4dff0',
            color: '#5e75a8',
            content:
              chronic.length === 0 ? (
                <p className="text-[12px]" style={{ color: '#9a96a8' }}>Не указано</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {chronic.map((c) => (
                    <span
                      key={c.id}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: '#d4dff0', color: '#5e75a8' }}
                    >
                      {c.name}
                      {c.diagnosedYear ? ` (${c.diagnosedYear})` : ''}
                    </span>
                  ))}
                </div>
              ),
          },
          {
            title: 'История болезней',
            icon: Clock,
            count: history.length,
            bg: '#d4e8d8',
            color: '#548068',
            content:
              history.length === 0 ? (
                <p className="text-[12px]" style={{ color: '#9a96a8' }}>Не указано</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid #f4f3ef' }}
                    >
                      <p className="text-[13px]" style={{ color: '#2a2540' }}>{h.name}</p>
                      {h.startDate && (
                        <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                          {new Date(h.startDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ),
          },
        ].map(({ title, icon: Ico, count, bg, color, content }) => (
          <div
            key={title}
            className="rounded-2xl p-4"
            style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: bg }}
              >
                <Ico className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-[14px] font-semibold flex-1" style={{ color: '#2a2540' }}>
                {title}
              </p>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: bg, color }}
              >
                {count}
              </span>
            </div>
            {content}
          </div>
        ))}

        {/* CTA */}
        <Link
          href="/report"
          className="flex items-center justify-center gap-2 h-14 rounded-2xl text-[14px] font-bold transition-opacity hover:opacity-80"
          style={{ background: '#9c5e6c', color: '#ffffff' }}
        >
          <FileText className="w-4 h-4" />
          Создать отчёт для врача
        </Link>
      </div>
    </div>
  );
}
