import Link from 'next/link';
import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { HeroSection } from '@/components/cabinet/dashboard/HeroSection';
import { MetricsRow } from '@/components/cabinet/dashboard/MetricsRow';
import { ActivityChart } from '@/components/cabinet/dashboard/ActivityChart';
import { ReportCard } from '@/components/cabinet/dashboard/ReportCard';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { AiMonitor } from '@/components/cabinet/dashboard/AiMonitor';
import { DoctorsHomeBlock } from '@/components/doctors/DoctorsHomeBlock';
import { loadHomeData } from './data';
import { getSession } from '@/lib/auth/session';
import { ReferralBanner } from './ReferralBanner';

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
        <MetricsRow metrics={metrics} vitalsLatest={vitals} />

        {/* ── AI Monitor ──────────────────────────────────────────────────── */}
        <section className="px-4 pt-4 pb-0 sm:px-7">
          <AiMonitor latest={vitals} compact locale={locale} />
        </section>

        <div className="grid gap-4 px-7 py-5 lg:grid-cols-[2fr_1fr]">
          <ActivityChart data={activity} />
          <ReportCard report={report} />
        </div>

        {/* ── Врачи AIVITA ────────────────────────────────────────────────── */}
        <section className="px-4 pb-4 sm:px-7">
          <DoctorsHomeBlock locale={locale} />
        </section>

        {/* ── Referral Banner ─────────────────────────────────────────────── */}
        <ReferralBanner locale={locale} />

        {/* ── Quick access cards — new features ───────────────────────────── */}
        <section className="px-4 pb-3 sm:px-7">
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/${locale}/symptom-checker`}
              className="rounded-2xl p-4 block transition hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #f0d4dc 0%, #f8e8ec 100%)', border: '1px solid rgba(156,94,108,0.2)' }}>
              <div className="text-3xl mb-2">🩺</div>
              <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>Проверить симптомы</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>AI-диагностика</p>
            </Link>
            <Link href={`/${locale}/mental-health`}
              className="rounded-2xl p-4 block transition hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #ede8f8 100%)', border: '1px solid rgba(139,106,174,0.2)' }}>
              <div className="text-3xl mb-2">🧘</div>
              <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>Ментальное здоровье</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>Настроение · Медитации</p>
            </Link>
          </div>
        </section>

        {/* ── AI Checkup CTA ──────────────────────────────────────────────── */}
        <section className="px-4 pb-6 sm:px-7">
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #d4dff0 100%)', border: '1px solid rgba(120,140,200,0.2)' }}
          >
            <div className="text-4xl mb-2">🧬</div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: '#2a2540' }}>
              Пройдите AI-чекап здоровья
            </h3>
            <p className="text-[12px] mb-3" style={{ color: '#6a6580' }}>
              Быстрая оценка всех ваших показателей за 3 минуты
            </p>
            <Link
              href={`/${locale}/ai-checkup`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)' }}
            >
              🧬 Начать чекап →
            </Link>
          </div>
        </section>
      </div>

      <FloatingNav active="home" />
    </main>
  );
}
