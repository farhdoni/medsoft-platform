import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { WeatherCard } from '@/components/cabinet/dashboard/WeatherCard';
import { HeroSection } from '@/components/cabinet/dashboard/HeroSection';
import { MetricsRow } from '@/components/cabinet/dashboard/MetricsRow';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { loadHomeData } from './data';
import { getSession } from '@/lib/auth/session';
import { HomeDashboard } from './HomeDashboard';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ user, metrics, activity, report, vitalsLatest, doctors }, session] =
    await Promise.all([loadHomeData(), getSession()]);

  const vitals = vitalsLatest as Record<string, { recordedAt: string; value: Record<string, unknown> } | null>;

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={user.avatarInitial} session={session} locale={locale} role={session?.role === 'doctor' ? 'doctor' : 'patient'} />
        <WeatherCard />
        <HeroSection user={user} metrics={metrics} />
        <MetricsRow metrics={metrics} vitalsLatest={vitals} />

        {/* ── Draggable & customisable blocks ─────────────────────────────── */}
        <HomeDashboard
          locale={locale}
          user={user}
          metrics={metrics}
          activity={activity}
          report={report}
          vitals={vitals}
          doctors={doctors}
        />
      </div>

      <FloatingNav active="home" />
    </main>
  );
}
