'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Stethoscope, Building2, Calendar, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type Stats = {
  totalPatients: number;
  totalDoctors: number;
  totalClinics: number;
  totalAppointments: number;
  appointmentsThisMonth: number;
  activeSosCalls: number;
  totalRevenueUzs: number;
};

const statCards = [
  { key: 'totalPatients' as const, label: 'Пациентов', icon: Users, color: 'text-blue-500' },
  { key: 'totalDoctors' as const, label: 'Врачей', icon: Stethoscope, color: 'text-green-500' },
  { key: 'totalClinics' as const, label: 'Клиник', icon: Building2, color: 'text-purple-500' },
  { key: 'appointmentsThisMonth' as const, label: 'Приёмов (30д)', icon: Calendar, color: 'text-orange-500' },
  { key: 'activeSosCalls' as const, label: 'Активных SOS', icon: AlertTriangle, color: 'text-red-500' },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/v1/dashboard/stats'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Обзор системы MedSoft</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Активность</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Данные активности отображаются здесь
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
