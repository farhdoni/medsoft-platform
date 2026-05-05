import Link from 'next/link';
import { cookies } from 'next/headers';
import { AlertTriangle, Pill, Clock, FileText } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import { api } from '@/lib/api-client';
import { calcAge, getInitials } from '@/lib/date-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const initials = getInitials(name);
  const age = profile?.birthDate ? calcAge(profile.birthDate) : null;

  const metaParts: string[] = [];
  if (age) metaParts.push(`${age} лет`);
  if (profile?.gender) metaParts.push(profile.gender === 'male' ? 'Мужской' : 'Женский');
  if (profile?.bloodType) metaParts.push(`Гр. ${profile.bloodType}`);
  if (profile?.heightCm) metaParts.push(`${profile.heightCm} см`);
  if (profile?.weightKg) metaParts.push(`${profile.weightKg} кг`);
  const metaLine = metaParts.join(' · ') || 'Заполни профиль';

  return (
    <PageShell active="home" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="rounded-hero bg-hero-gradient p-6 mb-5 flex items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-[20px] bg-white/20 flex-shrink-0 flex items-center justify-center text-[28px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
              МОЙ ПРОФИЛЬ
            </p>
            <p className="text-[20px] font-extrabold text-white leading-tight">{name}</p>
            <p className="text-[12px] text-white/70 mt-1">{metaLine}</p>
          </div>
          <div className="flex-shrink-0">
            <Icon name="doctor" size={48} />
          </div>
        </section>

        {/* ── Medical sections ──────────────────────────────────────────────── */}
        {[
          {
            title: 'Аллергии',
            Icon: AlertTriangle,
            count: allergies.length,
            tileBg: 'bg-bg-soft-pink',
            tileColor: 'text-accent-rose',
            countBg: 'bg-bg-soft-pink',
            content:
              allergies.length === 0 ? (
                <p className="text-[12px] text-text-muted">Не указано</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <span key={a.id} className="rounded-chip bg-bg-soft-pink px-3 py-1.5 text-[12px] font-semibold text-accent-rose">
                      {a.allergen}
                    </span>
                  ))}
                </div>
              ),
          },
          {
            title: 'Хронические',
            Icon: Pill,
            count: chronic.length,
            tileBg: 'bg-bg-soft-blue',
            tileColor: 'text-accent-blue-deep',
            countBg: 'bg-bg-soft-blue',
            content:
              chronic.length === 0 ? (
                <p className="text-[12px] text-text-muted">Не указано</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {chronic.map((c) => (
                    <span key={c.id} className="rounded-chip bg-bg-soft-blue px-3 py-1.5 text-[12px] font-semibold text-accent-blue-deep">
                      {c.name}{c.diagnosedYear ? ` (${c.diagnosedYear})` : ''}
                    </span>
                  ))}
                </div>
              ),
          },
          {
            title: 'История болезней',
            Icon: Clock,
            count: history.length,
            tileBg: 'bg-bg-soft-mint',
            tileColor: 'text-accent-mint-deep',
            countBg: 'bg-bg-soft-mint',
            content:
              history.length === 0 ? (
                <p className="text-[12px] text-text-muted">Не указано</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h, idx) => (
                    <div
                      key={h.id}
                      className={`flex items-center justify-between py-2 ${idx < history.length - 1 ? 'border-b border-border-soft' : ''}`}
                    >
                      <p className="text-[13px] text-text-primary">{h.name}</p>
                      {h.startDate && (
                        <p className="text-[11px] text-text-muted">
                          {new Date(h.startDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ),
          },
        ].map(({ title, Icon: Ico, count, tileBg, tileColor, countBg, content }) => (
          <div key={title} className="rounded-card bg-white border border-border-soft p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-[10px] flex-shrink-0 flex items-center justify-center ${tileBg}`}>
                <Ico className={`w-4 h-4 ${tileColor}`} />
              </div>
              <p className="text-[14px] font-semibold text-text-primary flex-1">{title}</p>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-chip ${countBg} ${tileColor}`}>
                {count}
              </span>
            </div>
            {content}
          </div>
        ))}

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <Link
          href="#"
          className="flex items-center justify-center gap-2 h-14 rounded-hero text-[14px] font-bold text-white transition-opacity hover:opacity-80 mt-1"
          style={{ background: '#9c5e6c' }}
        >
          <FileText className="w-4 h-4" />
          Создать отчёт для врача
        </Link>
      </div>
    </PageShell>
  );
}
