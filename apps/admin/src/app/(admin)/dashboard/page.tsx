'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Stethoscope, Building2, Calendar, AlertTriangle, DollarSign,
  TrendingUp, TrendingDown, Bot, UserCheck, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// ─── MedSoft types ────────────────────────────────────────────────────────────

type Stats = {
  totalPatients: number; totalDoctors: number; totalClinics: number;
  totalAppointments: number; appointmentsThisMonth: number;
  activeSosCalls: number; totalRevenueUzs: number;
};

type ActivityAppointment = { id: string; type: string; status: string; scheduledAt: string; priceUzs: string };
type ActivitySos = { id: string; status: string; createdAt: string; addressResolved: string | null };
type Activity = { recentAppointments: ActivityAppointment[]; recentSos: ActivitySos[] };

// ─── Aivita types ─────────────────────────────────────────────────────────────

type AivitaDashboard = {
  metrics: {
    totalUsers: number; newUsers: number; dau: number; aiRequests: number;
    trends: { newUsers: number; aiRequests: number };
  };
  funnel: {
    registered: number; onboarded: number; onboardRate: number;
    activeWeek: number; retentionRate: number;
  };
  registrationsChart: { date: string; count: number }[];
  healthDistribution: { range: string; count: number }[];
  topAiQuestions: { question: string; count: number }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_COLORS: Record<string, string> = {
  '<30': '#ef4444', '30-50': '#f97316', '50-70': '#eab308', '70-90': '#22c55e', '>90': '#10b981',
};

const appointmentStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success', confirmed: 'default', scheduled: 'secondary',
  in_progress: 'warning', cancelled_by_patient: 'destructive',
  cancelled_by_doctor: 'destructive', no_show: 'destructive',
};

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/v1/dashboard/stats'),
  });

  const { data: activity, isLoading: activityLoading } = useQuery<Activity>({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/v1/dashboard/activity'),
    refetchInterval: 30_000,
  });

  const { data: aivita, isLoading: aivitaLoading } = useQuery<AivitaDashboard>({
    queryKey: ['aivita-dashboard', period],
    queryFn: () => api.get(`/v1/aivita-admin/dashboard?period=${period}`),
  });

  return (
    <div className="space-y-8">
      {/* ── MedSoft Section ── */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
          <p className="text-muted-foreground">Обзор системы MedSoft</p>
        </div>

        {/* MedSoft KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { key: 'totalPatients' as const, label: 'Пациентов', icon: Users, color: 'text-blue-500' },
            { key: 'totalDoctors' as const, label: 'Врачей', icon: Stethoscope, color: 'text-green-500' },
            { key: 'totalClinics' as const, label: 'Клиник', icon: Building2, color: 'text-purple-500' },
            { key: 'appointmentsThisMonth' as const, label: 'Приёмов (30д)', icon: Calendar, color: 'text-orange-500' },
            { key: 'activeSosCalls' as const, label: 'Активных SOS', icon: AlertTriangle, color: 'text-red-500' },
          ].map(({ key, label, icon: Icon, color }) => (
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Выручка</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {isLoading ? '...' : formatCurrency(stats?.totalRevenueUzs)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MedSoft Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Последние приёмы (7 дней)</CardTitle></CardHeader>
            <CardContent>
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : !activity?.recentAppointments?.length ? (
                <p className="text-sm text-muted-foreground">Нет приёмов за 7 дней</p>
              ) : (
                <ul className="space-y-3">
                  {activity.recentAppointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-muted-foreground text-xs">{formatDate(a.scheduledAt)}</p>
                        <p className="font-medium">{formatCurrency(a.priceUzs)}</p>
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

          <Card>
            <CardHeader><CardTitle className="text-base">SOS-вызовы (7 дней)</CardTitle></CardHeader>
            <CardContent>
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : !activity?.recentSos?.length ? (
                <p className="text-sm text-muted-foreground text-green-600">✓ Нет SOS-вызовов за 7 дней</p>
              ) : (
                <ul className="space-y-3">
                  {activity.recentSos.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-muted-foreground text-xs">{formatDate(s.createdAt)}</p>
                        <p className="text-xs truncate max-w-[180px]">{s.addressResolved ?? 'Адрес не определён'}</p>
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

      {/* ── Aivita Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-violet-500 flex items-center justify-center text-white text-xs font-bold">A</span>
              aivita.uz
            </h2>
            <p className="text-muted-foreground text-sm">Метрики приложения</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Aivita KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Пользователей</CardTitle>
              <Users className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aivitaLoading ? '...' : (aivita?.metrics.totalUsers ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">всего</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Новых за период</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aivitaLoading ? '...' : (aivita?.metrics.newUsers ?? 0).toLocaleString()}</div>
              {!aivitaLoading && aivita && <TrendBadge value={aivita.metrics.trends.newUsers} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">DAU (24ч)</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aivitaLoading ? '...' : (aivita?.metrics.dau ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">активных сегодня</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI-запросов</CardTitle>
              <Bot className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aivitaLoading ? '...' : (aivita?.metrics.aiRequests ?? 0).toLocaleString()}</div>
              {!aivitaLoading && aivita && <TrendBadge value={aivita.metrics.trends.aiRequests} />}
            </CardContent>
          </Card>
        </div>

        {/* Funnel + Chart */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Registrations Line Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Регистрации (30д)</CardTitle>
            </CardHeader>
            <CardContent>
              {aivitaLoading ? (
                <div className="h-40 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={aivita?.registrationsChart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)} // MM-DD
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      labelFormatter={(v) => `Дата: ${v}`}
                      formatter={(v) => [v, 'Регистраций']}
                    />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Воронка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aivitaLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
              ) : aivita ? (
                <>
                  {[
                    { label: 'Зарегистрировано', value: aivita.funnel.registered, pct: 100, color: 'bg-violet-500' },
                    { label: 'Прошли онбординг', value: aivita.funnel.onboarded, pct: aivita.funnel.onboardRate, color: 'bg-blue-500' },
                    { label: 'Активны (7д)', value: aivita.funnel.activeWeek, pct: aivita.funnel.retentionRate, color: 'bg-emerald-500' },
                  ].map(({ label, value, pct, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value.toLocaleString()} <span className="text-muted-foreground">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Health Distribution + Top AI Questions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Health Distribution Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Распределение Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              {aivitaLoading ? (
                <div className="h-40 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={aivita?.healthDistribution ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [v, 'Пользователей']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(aivita?.healthDistribution ?? []).map((entry) => (
                        <Cell key={entry.range} fill={SCORE_COLORS[entry.range] ?? '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top AI Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Топ AI-вопросов</CardTitle>
            </CardHeader>
            <CardContent>
              {aivitaLoading ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}</div>
              ) : !aivita?.topAiQuestions?.length ? (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              ) : (
                <ol className="space-y-2">
                  {aivita.topAiQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0 w-5 text-right">{i + 1}.</span>
                      <span className="flex-1 truncate" title={q.question}>{q.question}</span>
                      <Badge variant="secondary" className="shrink-0">{q.count}</Badge>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
