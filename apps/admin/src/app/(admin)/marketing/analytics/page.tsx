'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

type AnalyticsData = {
  funnel: Array<{ stage: string; count: number; rate: number }>;
  retention: { day1: number; day7: number; day30: number };
};

const FUNNEL_LABELS: Record<string, string> = {
  installed: 'Установили',
  registered: 'Зарегистрировались',
  health_profile: 'Заполнили профиль',
  paid: 'Оформили подписку',
};

const FUNNEL_COLORS = ['#9c5e6c', '#00B4E6', '#33CCCC', '#7B2D8E'];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing-analytics'],
    queryFn: () => api.get<AnalyticsData>('/v1/admin/marketing/analytics'),
    staleTime: 60_000,
  });

  const funnelData = (data?.funnel ?? []).map(f => ({
    ...f,
    label: FUNNEL_LABELS[f.stage] ?? f.stage,
  }));

  return (
    <div className="space-y-6">
      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Воронка конверсии</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 80, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString('ru-RU')} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={110} />
                <Tooltip
                  formatter={(v: number, _name, props) => [
                    `${v.toLocaleString('ru-RU')} (${props.payload.rate}%)`,
                    'Пользователей',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Удержание пользователей (Retention)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Day 1', value: data?.retention.day1 ?? 0, color: '#9c5e6c' },
              { label: 'Day 7', value: data?.retention.day7 ?? 0, color: '#00B4E6' },
              { label: 'Day 30', value: data?.retention.day30 ?? 0, color: '#33CCCC' },
            ].map(item => (
              <div key={item.label} className="text-center p-6 rounded-xl border">
                <div className="text-4xl font-bold" style={{ color: item.color }}>
                  {isLoading ? '...' : `${item.value}%`}
                </div>
                <div className="text-sm text-muted-foreground mt-2">{item.label} Retention</div>
                <div className="mt-3 w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${item.value}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Процент пользователей, вернувшихся через 1, 7 и 30 дней после регистрации
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
