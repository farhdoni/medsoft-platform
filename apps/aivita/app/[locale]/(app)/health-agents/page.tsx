import { cookies } from 'next/headers';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { api } from '@/lib/api-client';
import { HealthAgentsClient } from './HealthAgentsClient';

export default async function HealthAgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const [alertsRes, settingsRes] = await Promise.allSettled([
    api.agents.alerts(sessionCookie),
    api.agents.settings(sessionCookie),
  ]);

  const alerts: AgentAlert[] =
    alertsRes.status === 'fulfilled' && 'data' in alertsRes.value
      ? (alertsRes.value.data as AgentAlert[])
      : [];

  const settings: AgentSettings =
    settingsRes.status === 'fulfilled' && 'data' in settingsRes.value
      ? (settingsRes.value.data as AgentSettings)
      : {
          vitalsMonitorEnabled: true,
          documentParserEnabled: true,
          medicationTrackerEnabled: true,
          weeklyCheckupEnabled: true,
          alertThresholds: {},
        };

  return (
    <PageShell active="health-agents" locale={locale}>
      <div className="max-w-[700px] mx-auto pb-6">
        <HealthAgentsClient initialAlerts={alerts} initialSettings={settings} />
      </div>
    </PageShell>
  );
}

export type AgentAlert = {
  id: string;
  agentType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  recommendation: string | null;
  relatedData: Record<string, unknown> | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
};

export type AgentSettings = {
  vitalsMonitorEnabled: boolean;
  documentParserEnabled: boolean;
  medicationTrackerEnabled: boolean;
  weeklyCheckupEnabled: boolean;
  alertThresholds: {
    pulse_high?: number;
    pulse_low?: number;
    systolic_high?: number;
    systolic_low?: number;
    diastolic_high?: number;
    diastolic_low?: number;
    spo2_low?: number;
    sugar_high?: number;
    sugar_low?: number;
    temp_high?: number;
    temp_low?: number;
  };
};
