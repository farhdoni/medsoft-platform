import Link from 'next/link';
import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { HeroSection } from '@/components/cabinet/dashboard/HeroSection';
import { MetricsRow } from '@/components/cabinet/dashboard/MetricsRow';
import { ActivityChart } from '@/components/cabinet/dashboard/ActivityChart';
import { ReportCard } from '@/components/cabinet/dashboard/ReportCard';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { BiometricsSection } from '@/components/cabinet/dashboard/BiometricsSection';
import { loadHomeData } from './data';
import { getSession } from '@/lib/auth/session';

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

  const vitals = vitalsLatest as Record<string, { recordedAt: string; value: Record<string, unknown> } | null>;

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={user.avatarInitial} session={session} locale={locale} role={session?.role === 'doctor' ? 'doctor' : 'patient'} />
        <HeroSection user={user} metrics={metrics} />
        <MetricsRow metrics={metrics} />

        {/* ── Biometrics quick panel ──────────────────────────────────────── */}
        <section className="px-4 pt-4 pb-2 sm:px-7">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold" style={{ color: '#6a6580' }}>БИОМЕТРИЯ</p>
            <Link
              href={`/${locale}/vitals`}
              className="text-[12px] font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--accent-dark)' }}
            >
              Все показатели →
            </Link>
          </div>
          <BiometricsSection initialLatest={vitals} locale={locale} />
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
