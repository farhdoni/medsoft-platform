export const dynamic = 'force-dynamic';

import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { WeatherCard } from '@/components/cabinet/dashboard/WeatherCard';
import { HeroSection } from '@/components/cabinet/dashboard/HeroSection';
import { MetricsRow } from '@/components/cabinet/dashboard/MetricsRow';
import { ActiveChatsWidget } from '@/components/cabinet/dashboard/ActiveChatsWidget';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { loadHomeData } from './data';
import { getSession } from '@/lib/auth/session';
import { HomeDashboard } from './HomeDashboard';
import { TelegramBanner } from './TelegramBanner';
import { SurveyBanner } from './SurveyBanner';
import { isSoft3dEnabled } from '@/lib/soft3d/flag';
import { loadHomeSoft3dData } from './soft3d-data';
import { HomeSoft3d } from './soft3d/HomeSoft3d';

// ─── Page ─────────────────────────────────────────────────────────────────────
//
// Gate, not content (same pattern as onboarding/page.tsx): unflagged
// accounts get exactly today's home, unchanged — loadHomeData() and every
// component below this line are untouched by Part C. Flagged accounts get
// the new Soft 3D home instead, on entirely separate data (soft3d-data.ts),
// so the unflagged path can never regress from this work.

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (session && isSoft3dEnabled(session.email)) {
    const data = await loadHomeSoft3dData();
    return <HomeSoft3d locale={locale} data={data} />;
  }

  const { user, metrics, activity, report, vitalsLatest, doctors, telegramLinked, surveyQuestion } =
    await loadHomeData();

  const vitals = vitalsLatest as Record<string, { recordedAt: string; value: Record<string, unknown> } | null>;

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={user.avatarInitial} session={session} locale={locale} role={session?.role === 'doctor' ? 'doctor' : 'patient'} />
        <WeatherCard />
        <HeroSection user={user} metrics={metrics} />
        {!telegramLinked && <TelegramBanner locale={locale} />}
        {surveyQuestion && <SurveyBanner locale={locale} initialQuestion={surveyQuestion} />}
        <MetricsRow metrics={metrics} vitalsLatest={vitals} />
        <ActiveChatsWidget locale={locale} />

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
