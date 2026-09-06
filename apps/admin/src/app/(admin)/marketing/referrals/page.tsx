'use client';

import { useQuery } from '@tanstack/react-query';
import { Share2, Users, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

type ReferralData = {
  total: number;
  completed: number;
  rewarded: number;
  conversionRate: number;
  topReferrers: Array<{ userId: string; name: string | null; email: string | null; count: number }>;
  dailyChart: Array<{ day: string; count: number }>;
};

function KpiCard({ icon: Icon, title, value, color }: {
  icon: React.ElementType; title: string; value: string | number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReferralsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing-referrals'],
    queryFn: () => api.get<ReferralData>('/v1/admin/marketing/referrals'),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Share2} title="Всего рефералов" value={isLoading ? '...' : data?.total ?? 0} color="bg-[#9c5e6c]" />
        <KpiCard icon={CheckCircle} title="Завершено" value={isLoading ? '...' : data?.completed ?? 0} color="bg-[#00B4E6]" />
        <KpiCard icon={DollarSign} title="Вознаграждений" value={isLoading ? '...' : data?.rewarded ?? 0} color="bg-[#33CCCC]" />
        <KpiCard icon={TrendingUp} title="Конверсия" value={isLoading ? '...' : `${data?.conversionRate ?? 0}%`} color="bg-[#7B2D8E]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Рефералы за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.dailyChart ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickFormatter={d => {
                    const date = new Date(d);
                    return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
                  }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={d => new Date(d).toLocaleDateString('ru-RU')}
                  formatter={(v: number) => [v, 'Рефералов']}
                />
                <Line type="monotone" dataKey="count" stroke="#9c5e6c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Топ рефереров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data?.topReferrers ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              )}
              {(data?.topReferrers ?? []).map((r, i) => (
                <div key={r.userId} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{r.name ?? 'Без имени'}</p>
                      <p className="text-xs text-muted-foreground">{r.email ?? r.userId.slice(0, 8) + '...'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
