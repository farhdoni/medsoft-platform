'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Stethoscope, Building2, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/api';

interface DashboardStats {
  patients: number;
  doctors: number;
  clinics: number;
  appointments: number;
  transactions: number;
  sos_calls: number;
}

const statCards = [
  { key: 'patients' as const, label: 'Пациенты', icon: Users, color: 'text-blue-600' },
  { key: 'doctors' as const, label: 'Врачи', icon: Stethoscope, color: 'text-green-600' },
  { key: 'clinics' as const, label: 'Клиники', icon: Building2, color: 'text-purple-600' },
  { key: 'appointments' as const, label: 'Приёмы', icon: Calendar, color: 'text-orange-600' },
  { key: 'transactions' as const, label: 'Транзакции', icon: CreditCard, color: 'text-emerald-600' },
  { key: 'sos_calls' as const, label: 'SOS-вызовы', icon: AlertTriangle, color: 'text-red-600' },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => apiGet('/dashboard'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '—' : (stats?.[key] ?? 0).toLocaleString('ru')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
