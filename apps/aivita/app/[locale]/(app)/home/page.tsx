import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { HeroSection } from '@/components/cabinet/dashboard/HeroSection';
import { MetricsRow } from '@/components/cabinet/dashboard/MetricsRow';
import { ActivityChart } from '@/components/cabinet/dashboard/ActivityChart';
import { ReportCard } from '@/components/cabinet/dashboard/ReportCard';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';
import { loadHomeData } from './data';

export default async function HomePage() {
  const { user, metrics, activity, report } = await loadHomeData();

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-4 pb-32 md:px-6">
      <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(42,37,64,0.10)]">
        <TopBar avatarInitial={user.avatarInitial} />
        <HeroSection user={user} metrics={metrics} />
        <MetricsRow metrics={metrics} />

        <div className="grid gap-4 px-7 py-5 lg:grid-cols-[2fr_1fr]">
          <ActivityChart data={activity} />
          <ReportCard report={report} />
        </div>
      </div>

      <FloatingNav active="home" />
    </main>
  );
}
