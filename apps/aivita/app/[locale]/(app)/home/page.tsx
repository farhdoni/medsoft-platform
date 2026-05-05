import Link from 'next/link';
import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { HeroSection } from '@/components/cabinet/dashboard/HeroSection';
import { MetricsRow } from '@/components/cabinet/dashboard/MetricsRow';
import { ActivityChart } from '@/components/cabinet/dashboard/ActivityChart';
import { ReportCard } from '@/components/cabinet/dashboard/ReportCard';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { loadHomeData } from './data';
import { getSession } from '@/lib/auth/session';

// ─── Mini vital tile ──────────────────────────────────────────────────────────

function VitalMiniTile({
  icon,
  label,
  value,
  unit,
  bg,
  color,
}: {
  icon: string;
  label: string;
  value: string | null;
  unit: string;
  bg: string;
  color: string;
}) {
  return (
    <div className="rounded-[14px] p-3 flex flex-col gap-1" style={{ background: bg }}>
      <span className="text-[18px]">{icon}</span>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
      {value ? (
        <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
          {value} <span className="text-[10px] font-normal" style={{ color: '#9a96a8' }}>{unit}</span>
        </p>
      ) : (
        <p className="text-[11px]" style={{ color: '#9a96a8' }}>Нет данных</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ user, metrics, activity, report, vitalsLatest }, session] = await Promise.all([
    loadHomeData(),
    getSession(),
  ]);

  // Extract latest vitals values (24h freshness check)
  const DAY_MS = 24 * 60 * 60 * 1000;
  function isFresh(row: { recordedAt: string } | null | undefined) {
    if (!row) return false;
    return Date.now() - new Date(row.recordedAt).getTime() < DAY_MS;
  }

  function getNumericVal(row: { value: Record<string, unknown> } | null | undefined): string | null {
    if (!row || !isFresh(row as never)) return null;
    const v = row.value;
    if (typeof v.value === 'number') return v.value % 1 === 0 ? `${v.value}` : v.value.toFixed(1);
    if (typeof v.systolic === 'number' && typeof v.diastolic === 'number') return `${v.systolic}/${v.diastolic}`;
    if (typeof v.hours === 'number') return `${v.hours}`;
    return null;
  }

  const vitals = vitalsLatest as Record<string, { recordedAt: string; value: Record<string, unknown> } | null>;

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={user.avatarInitial} session={session} locale={locale} />
        <HeroSection user={user} metrics={metrics} />
        <MetricsRow metrics={metrics} />

        {/* ── Biometrics quick panel ──────────────────────────────────────── */}
        <section className="px-7 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold" style={{ color: '#6a6580' }}>БИОМЕТРИЯ</p>
            <Link
              href={`/${locale}/vitals`}
              className="text-[12px] font-semibold transition-colors hover:opacity-80"
              style={{ color: '#9c5e6c' }}
            >
              Все показатели →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <VitalMiniTile
              icon="❤️" label="Пульс"
              value={getNumericVal(vitals.heart_rate)} unit="bpm"
              bg="#f0d4dc" color="#9c5e6c"
            />
            <VitalMiniTile
              icon="🩺" label="Давление"
              value={getNumericVal(vitals.blood_pressure)} unit="mmHg"
              bg="#d4dff0" color="#5e75a8"
            />
            <VitalMiniTile
              icon="⚖️" label="Вес"
              value={getNumericVal(vitals.weight)} unit="кг"
              bg="#e0d8f0" color="#6e5fa0"
            />
            <VitalMiniTile
              icon="😴" label="Сон"
              value={getNumericVal(vitals.sleep_hours)} unit="ч"
              bg="#d4dff0" color="#5e75a8"
            />
          </div>
          {Object.values(vitals).every((v) => !isFresh(v)) && (
            <Link
              href={`/${locale}/vitals`}
              className="mt-3 flex items-center justify-center gap-2 rounded-[12px] py-2.5 text-[13px] font-semibold transition-colors hover:opacity-80"
              style={{ background: '#f4f3ef', color: '#9c5e6c' }}
            >
              + Добавить первый показатель
            </Link>
          )}
        </section>

        <div className="grid gap-4 px-7 py-5 lg:grid-cols-[2fr_1fr]">
          <ActivityChart data={activity} />
          <ReportCard report={report} />
        </div>
      </div>

      <FloatingNav active="home" />
    </main>
  );
}
