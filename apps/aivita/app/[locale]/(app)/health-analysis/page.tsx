import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { HealthAnalysisClient } from './HealthAnalysisClient';

export default async function HealthAnalysisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const res = await api.healthAnalysis.latest(sessionCookie);
  const analysis = 'data' in res ? res.data : null;

  return (
    <PageShell active="health-analysis" locale={locale}>
      <div className="max-w-[700px] mx-auto pb-6">
        <HealthAnalysisClient initialAnalysis={analysis as HealthAnalysisData | null} />
      </div>
    </PageShell>
  );
}

export type HealthAnalysisData = {
  id: string;
  healthScore: number | null;
  biologicalAge: number | null;
  overallAssessment: string | null;
  currentProblems: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    recommendation: string;
    suggestedDoctor?: string;
  }>;
  futureRisks: Array<{
    title: string;
    probability: 'low' | 'medium' | 'high';
    timeframe: string;
    preventionPlan: string;
  }>;
  healthPlan: {
    duration: string;
    goals: Array<{ title: string; description: string; metric: string; target: string }>;
    dailyActions: string[];
    weeklyActions: string[];
    monthlyActions: string[];
  } | null;
  planProgress: Record<string, boolean>;
  createdAt: string;
};
