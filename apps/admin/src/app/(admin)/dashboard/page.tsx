'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, CheckCircle2, CreditCard, DollarSign, Server,
  Stethoscope, TrendingDown, TrendingUp, Users, XCircle, Smartphone,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = {
  usersTotal: number;
  usersActiveToday: number;
  usersGrowthPercent: number;
  doctorsTotal: number;
  doctorsPending: number;
  subscriptionsActive: number;
  mrr: number;
  revenueMonth: number;
  registrationsChart: Array<{ date: string; patients: number; doctors: number }>;
  revenueChart: Array<{ date: string; amount: number }>;
  recentRegistrations: Array<{ id: string; name: string | null; email: string | null; role: string; plan: string; createdAt: string }>;
  pendingDoctors: Array<{ id: string; userId: string; name: string | null; specialization: string | null; createdAt: string }>;
  recentPayments: Array<{ id: number; userId: string; userName: string | null; amount: number; type: string; provider: string | null; status: string; createdAt: string }>;
};

type DownloadStats = {
  patientTotal: number;
  doctorTotal: number;
  patientToday: number;
  doctorToday: number;
};

type HealthData = {
  checks: Array<{ name: string; healthy: boolean; latencyMs: number }>;
  allHealthy: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const up = value > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{value}%
    </span>
  );
}

function planBadgeVariant(plan: string): 'secondary' | 'default' | 'warning' {
  if (plan === 'pro') return 'warning';
  if (plan === 'plus') return 'default';
  return 'secondary';
}

function paymentStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'completed') return 'success';
  if (status === 'pending' || status === 'processing') return 'warning';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

function formatXDate(date: string) {
  return date.slice(5); // "2024-01-15" → "01-15"
}

function formatRevY(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/v1/admin/dashboard'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: dlStats } = useQuery<DownloadStats>({
    queryKey: ['admin-download-stats'],
    queryFn: () => api.get('/v1/admin/stats/downloads'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ['admin-health'],
    queryFn: () => api.get('/v1/admin/monitoring/health'),
    refetchInterval: 60_000,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      api.put(`/v1/admin/users/doctors/${id}/verify`, { action, reason }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success(vars.action === 'approve' ? 'Врач одобрен ✓' : 'Врач отклонён');
    },
    onError: () => toast.error('Не удалось выполнить действие'),
  });

  function handleApprove(doctorId: string) {
    verifyMutation.mutate({ id: doctorId, action: 'approve' });
  }

  function handleReject(doctorId: string) {
    const reason = window.prompt('Причина отклонения:');
    if (reason === null) return;
    verifyMutation.mutate({ id: doctorId, action: 'reject', reason: reason || undefined });
  }

  // System health derived state
  const healthPassed = healthData?.checks.filter((c) => c.healthy).length ?? 0;
  const healthTotal = healthData?.checks.length ?? 0;
  const systemOk = healthLoading ? null : (healthData?.allHealthy ?? false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Обзор платформы aivita.uz</p>
      </div>

      {/* ── KPI Cards 3×2 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* 1. Всего пользователей */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '...' : (data?.usersTotal ?? 0).toLocaleString()}
            </div>
            {isLoading ? <Skeleton className="h-4 w-16 mt-1" /> : <TrendBadge value={data?.usersGrowthPercent ?? 0} />}
          </CardContent>
        </Card>

        {/* 2. Активные сегодня */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активные сегодня</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '...' : (data?.usersActiveToday ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">уникальных за 24ч</p>
          </CardContent>
        </Card>

        {/* 3. Врачи */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Врачи</CardTitle>
            <Stethoscope className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '...' : (data?.doctorsTotal ?? 0).toLocaleString()}
            </div>
            {!isLoading && (
              (data?.doctorsPending ?? 0) > 0
                ? <Badge variant="warning" className="mt-1 text-xs">{data!.doctorsPending} на модерации</Badge>
                : <p className="text-xs text-muted-foreground mt-1">Все верифицированы ✓</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Подписки */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Подписки</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '...' : (data?.subscriptionsActive ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MRR: {isLoading ? '...' : formatCurrency(data?.mrr ?? 0)}
            </p>
          </CardContent>
        </Card>

        {/* 5. Выручка за месяц */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Выручка за месяц</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {isLoading ? '...' : formatCurrency(data?.revenueMonth ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">текущий месяц</p>
          </CardContent>
        </Card>

        {/* 5b. APK Пациент */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">📱 APK Пациент</CardTitle>
            <Smartphone className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dlStats?.patientTotal?.toLocaleString() ?? '...'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{dlStats?.patientToday ?? 0} сегодня
            </p>
          </CardContent>
        </Card>

        {/* 5c. APK Врач */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">📱 APK Врач</CardTitle>
            <Smartphone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dlStats?.doctorTotal?.toLocaleString() ?? '...'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{dlStats?.doctorToday ?? 0} сегодня
            </p>
          </CardContent>
        </Card>

        {/* 6. Состояние системы */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Состояние системы</CardTitle>
            <Server className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {systemOk === null ? (
                <span className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
              ) : systemOk ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {systemOk === null ? 'Проверка...' : systemOk ? 'Работает нормально' : 'Есть проблемы'}
              </span>
            </div>
            {!healthLoading && (
              <p className="text-xs text-muted-foreground mt-1">{healthPassed}/{healthTotal} сервисов</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Registrations chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Регистрации за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.registrationsChart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatXDate} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(v) => `Дата: ${v}`}
                    formatter={(v, name) => [v, name === 'patients' ? 'Пациенты' : 'Врачи']}
                  />
                  <Legend formatter={(v) => v === 'patients' ? 'Пациенты' : 'Врачи'} />
                  <Line type="monotone" dataKey="patients" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="doctors" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Выручка за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.revenueChart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatXDate} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatRevY} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(v) => `Дата: ${v}`}
                    formatter={(v) => [formatCurrency(v as number), 'Выручка']}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom 3 blocks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Последние регистрации</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !data?.recentRegistrations?.length ? (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <ul className="space-y-3">
                {data.recentRegistrations.map((u) => (
                  <li key={u.id} className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {(u.name ?? u.email ?? '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name ?? u.email ?? 'Аноним'}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <Badge variant={planBadgeVariant(u.plan)} className="text-[10px]">{u.plan}</Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDate(u.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending doctors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">На модерации</CardTitle>
            {(data?.doctorsPending ?? 0) > 0 && (
              <Badge variant="warning">{data!.doctorsPending}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !data?.pendingDoctors?.length ? (
              <p className="text-sm text-green-600">Нет врачей на модерации ✓</p>
            ) : (
              <ul className="space-y-3">
                {data.pendingDoctors.map((d) => (
                  <li key={d.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-sm">{d.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {d.specialization ?? 'Специализация не указана'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleApprove(d.id)}
                        disabled={verifyMutation.isPending}
                      >
                        Одобрить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleReject(d.id)}
                        disabled={verifyMutation.isPending}
                      >
                        Отклонить
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Последние платежи</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !data?.recentPayments?.length ? (
              <p className="text-sm text-muted-foreground">Нет платежей</p>
            ) : (
              <ul className="space-y-3">
                {data.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.userName ?? p.userId.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{p.type} · {p.provider ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className="font-medium text-xs">{formatCurrency(p.amount)}</span>
                      <Badge variant={paymentStatusVariant(p.status)} className="text-[10px]">{p.status}</Badge>
                    </div>
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
