'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Stethoscope, Building2, Calendar, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

type Stats = {
  totalPatients: number;
  totalDoctors: number;
  totalClinics: number;
  totalAppointments: number;
  appointmentsThisMonth: number;
  activeSosCalls: number;
  totalRevenueUzs: number;
};

type ActivityAppointment = {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  priceUzs: string;
};

type ActivitySos = {
  id: string;
  status: string;
  createdAt: string;
  addressResolved: string | null;
};

type Activity = {
  recentAppointments: ActivityAppointment[];
  recentSos: ActivitySos[];
};

const statCards = [
  { key: 'totalPatients' as const, label: 'Пациентов', icon: Users, color: 'text-blue-500' },
  { key: 'totalDoctors' as const, label: 'Врачей', icon: Stethoscope, color: 'text-green-500' },
  { key: 'totalClinics' as const, label: 'Клиник', icon: Building2, color: 'text-purple-500' },
  { key: 'appointmentsThisMonth' as const, label: 'Приёмов (30д)', icon: Calendar, color: 'text-orange-500' },
  { key: 'activeSosCalls' as const, label: 'Активных SOS', icon: AlertTriangle, color: 'text-red-500' },
];

const appointmentStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  confirmed: 'default',
  scheduled: 'secondary',
  in_progress: 'warning',
  cancelled_by_patient: 'destructive',
  cancelled_by_doctor: 'destructive',
  no_show: 'destructive',
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/v1/dashboard/stats'),
  });

  const { data: activity, isLoading: activityLoading } = useQuery<Activity>({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/v1/dashboard/activity'),
    refetchInterval: 30_000, // refresh every 30s
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Обзор системы MedSoft</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : (stats?.[key] ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Выручка (всего)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {isLoading ? '...' : formatCurrency(stats?.totalRevenueUzs)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity — last 7 days */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Последние приёмы (7 дней)</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : !activity?.recentAppointments?.length ? (
              <p className="text-sm text-muted-foreground">Нет приёмов за последние 7 дней</p>
            ) : (
              <ul className="space-y-3">
                {activity.recentAppointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">{formatDate(a.scheduledAt)}</span>
                      <span className="font-medium">{formatCurrency(a.priceUzs)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs">{a.type}</Badge>
                      <Badge variant={appointmentStatusColors[a.status] ?? 'outline'} className="text-xs">{a.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent SOS Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SOS-вызовы (7 дней)</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : !activity?.recentSos?.length ? (
              <p className="text-sm text-muted-foreground text-green-600">✓ Нет SOS-вызовов за 7 дней</p>
            ) : (
              <ul className="space-y-3">
                {activity.recentSos.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">{formatDate(s.createdAt)}</span>
                      <span className="text-xs truncate max-w-[180px]">{s.addressResolved ?? 'Адрес не определён'}</span>
                    </div>
                    <Badge variant={s.status === 'resolved' ? 'success' : s.status === 'triggered' ? 'destructive' : 'warning'} className="text-xs">
                      {s.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
