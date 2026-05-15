'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type DashboardData = {
  revenue: { total: number; subscription: number; avgCheck: number };
  activeSubscriptions: number;
  totalPayments: number;
  dailyRevenue: { date: string; total: number }[];
  byType: { type: string; total: number; cnt: number }[];
  byProvider: { provider: string | null; total: number; cnt: number }[];
  byPlan: { planName: string | null; planSlug: string | null; cnt: number }[];
};

const TYPE_LABELS: Record<string, string> = {
  subscription: 'Подписки', consultation: 'Консультации',
  pharmacy_order: 'Аптека', booking: 'Записи',
};
const PROVIDER_LABELS: Record<string, string> = { click: 'Click', payme: 'Payme', uzum: 'Uzum' };
const PIE_COLORS = ['#9c5e6c', '#00B4E6', '#33CCCC', '#7B2D8E', '#f97316'];

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboard() {
  const [period, setPeriod] = useState('month');

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['finance-dashboard', period],
    queryFn: () => api.get(`/v1/admin/finance/dashboard?period=${period}`),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Обзор</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="week">Неделя</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="year">Год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Общая выручка"
          value={isLoading ? '...' : formatCurrency(String(data?.revenue.total ?? 0))}
          sub={`Подписки: ${formatCurrency(String(data?.revenue.subscription ?? 0))}`}
          icon={DollarSign}
          color="bg-[#9c5e6c]"
        />
        <StatCard
          title="Средний чек"
          value={isLoading ? '...' : formatCurrency(String(data?.revenue.avgCheck ?? 0))}
          icon={TrendingUp}
          color="bg-[#00B4E6]"
        />
        <StatCard
          title="Активных подписок"
          value={isLoading ? '...' : String(data?.activeSubscriptions ?? 0)}
          icon={Users}
          color="bg-[#33CCCC]"
        />
        <StatCard
          title="Платежей"
          value={isLoading ? '...' : String(data?.totalPayments ?? 0)}
          icon={CreditCard}
          color="bg-[#7B2D8E]"
        />
      </div>

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Выручка по дням (30 дней)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.dailyRevenue ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={d => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000) + 'k'} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(String(v)), 'Выручка']}
                labelFormatter={l => new Date(l).toLocaleDateString('ru-RU')}
              />
              <Line type="monotone" dataKey="total" stroke="#9c5e6c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* By type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По источникам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.byType ?? []).map((t, i) => (
                <div key={t.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm">{TYPE_LABELS[t.type] ?? t.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(String(t.total))}</p>
                    <p className="text-xs text-muted-foreground">{t.cnt} шт</p>
                  </div>
                </div>
              ))}
              {!data?.byType?.length && <p className="text-sm text-muted-foreground">Нет данных</p>}
            </div>
          </CardContent>
        </Card>

        {/* By provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По провайдерам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={(data?.byProvider ?? []).map(p => ({
                    name: PROVIDER_LABELS[p.provider ?? ''] ?? p.provider ?? 'Другие',
                    value: p.cnt,
                  }))}
                  cx="50%" cy="50%" outerRadius={65} dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {(data?.byProvider ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v + ' шт', '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Active subs by plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Подписки по планам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={(data?.byPlan ?? []).map(p => ({ name: p.planName ?? '—', cnt: p.cnt }))} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cnt" fill="#9c5e6c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
