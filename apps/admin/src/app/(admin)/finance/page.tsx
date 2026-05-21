'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Users, Percent } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type OverviewData = {
  kpis: {
    revenueMonth: number;
    revenueGrowthPercent: number;
    mrr: number;
    avgCheck: number;
    churnRate: number;
  };
  monthlyChart: Array<{
    month: string;
    subscription: number;
    consultation: number;
    pharmacy_order: number;
    booking: number;
    total: number;
  }>;
  byProvider: Array<{ provider: string; total: number; cnt: number }>;
};

const PIE_COLORS = ['#9c5e6c', '#00B4E6', '#33CCCC', '#7B2D8E'];
const PROVIDER_LABELS: Record<string, string> = { click: 'Click', payme: 'Payme', uzum: 'Uzum', other: 'Другие' };

const TYPE_COLORS: Record<string, string> = {
  subscription: '#9c5e6c',
  consultation: '#00B4E6',
  pharmacy_order: '#33CCCC',
  booking: '#7B2D8E',
};
const TYPE_LABELS: Record<string, string> = {
  subscription: 'Подписки',
  consultation: 'Консультации',
  pharmacy_order: 'Аптека',
  booking: 'Записи',
};

function KpiCard({ title, value, sub, trend, icon: Icon, color }: {
  title: string; value: string; sub?: string;
  trend?: number; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend !== undefined && (
              <Badge
                variant={trend >= 0 ? 'success' : 'destructive'}
                className="mt-1 text-[10px]"
              >
                {trend >= 0 ? '+' : ''}{trend}%
              </Badge>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

export default function FinanceDashboard() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['finance-overview'],
    queryFn: () => api.get('/v1/admin/finance/overview'),
    refetchInterval: 60000,
  });

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* KPI cards 4-column */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Выручка (месяц)"
          value={isLoading ? '...' : formatCurrency(kpis?.revenueMonth ?? 0)}
          trend={kpis?.revenueGrowthPercent}
          icon={DollarSign}
          color="bg-[#9c5e6c]"
        />
        <KpiCard
          title="MRR"
          value={isLoading ? '...' : formatCurrency(kpis?.mrr ?? 0)}
          sub="Активные подписки"
          icon={TrendingUp}
          color="bg-[#00B4E6]"
        />
        <KpiCard
          title="Средний чек"
          value={isLoading ? '...' : formatCurrency(kpis?.avgCheck ?? 0)}
          sub="За текущий месяц"
          icon={Users}
          color="bg-[#33CCCC]"
        />
        <KpiCard
          title="Churn rate"
          value={isLoading ? '...' : `${kpis?.churnRate ?? 0}%`}
          sub="Отток подписчиков"
          icon={Percent}
          color="bg-[#7B2D8E]"
        />
      </div>

      {/* 12-month line chart by source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Выручка по источникам (12 мес)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.monthlyChart ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                tickFormatter={monthLabel}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000) + 'k' : String(v)} />
              <Tooltip
                labelFormatter={monthLabel}
                formatter={(v: number, name: string) => [formatCurrency(v), TYPE_LABELS[name] ?? name]}
              />
              <Legend formatter={(name) => TYPE_LABELS[name] ?? name} iconType="circle" />
              {(['subscription', 'consultation', 'pharmacy_order', 'booking'] as const).map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={TYPE_COLORS[key]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Provider pie */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По провайдерам (месяц)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={(data?.byProvider ?? []).map(p => ({
                    name: PROVIDER_LABELS[p.provider] ?? p.provider,
                    value: p.total,
                  }))}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {(data?.byProvider ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Источники выручки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {(['subscription', 'consultation', 'pharmacy_order', 'booking'] as const).map(key => {
                const last = data?.monthlyChart?.[data.monthlyChart.length - 1];
                const val = last?.[key] ?? 0;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[key] }} />
                      <span className="text-sm">{TYPE_LABELS[key]}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(val)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
