'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Row = {
  subscription: { id: number; status: string; expiresAt: string; autoRenew: boolean; startedAt: string };
  plan: { name: string; slug: string; price: number; period: string } | null;
  userName: string | null;
  userEmail: string | null;
};

type Overview = {
  active: number;
  newThisMonth: number;
  cancelledThisMonth: number;
  conversionRate: number;
  mrr: number;
  monthlyChart: Array<{ month: string; active: number; new_subs: number; cancelled: number }>;
};

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  active: 'success', expired: 'secondary', cancelled: 'secondary', past_due: 'warning',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Активна', expired: 'Истекла', cancelled: 'Отменена', past_due: 'Просрочена',
};

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data: overview } = useQuery<Overview>({
    queryKey: ['admin-subs-overview'],
    queryFn: () => api.get('/v1/admin/finance/subscriptions/overview'),
    staleTime: 60000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subs', page, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (status) params.set('status', status);
      return api.get<{ data: Row[]; total: number; mrr: number }>(`/v1/admin/finance/subscriptions?${params}`);
    },
  });

  const columns: ColumnDef<Row>[] = [
    {
      header: 'Пользователь',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.userName ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.userEmail ?? ''}</p>
        </div>
      ),
    },
    {
      header: 'Тариф',
      cell: ({ row }) => row.original.plan ? (
        <div>
          <p className="text-sm font-medium">{row.original.plan.name}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(row.original.plan.price)}</p>
        </div>
      ) : '—',
    },
    {
      header: 'Статус',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.subscription.status] ?? 'secondary'}>
          {STATUS_LABELS[row.original.subscription.status] ?? row.original.subscription.status}
        </Badge>
      ),
    },
    {
      header: 'Начало',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.subscription.startedAt)}</span>,
    },
    {
      header: 'Истекает',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.subscription.expiresAt)}</span>,
    },
    {
      header: 'Авто',
      cell: ({ row }) => row.original.subscription.autoRenew
        ? <Badge variant="success" className="text-xs">Вкл</Badge>
        : <Badge variant="secondary" className="text-xs">Откл</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'MRR', value: formatCurrency(overview?.mrr ?? 0) },
          { label: 'Активных', value: String(overview?.active ?? '...') },
          { label: 'Новых (месяц)', value: String(overview?.newThisMonth ?? '...') },
          { label: 'Отменено (месяц)', value: String(overview?.cancelledThisMonth ?? '...') },
          { label: 'Конверсия', value: `${overview?.conversionRate ?? 0}%` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stacked area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Динамика подписок (12 мес)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={overview?.monthlyChart ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={monthLabel} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={monthLabel} />
              <Legend formatter={(name: string) => (({ active: 'Активные', new_subs: 'Новые', cancelled: 'Отменённые' } as Record<string, string>)[name] ?? name)} iconType="circle" />
              <Area type="monotone" dataKey="active" stackId="1" stroke="#00B4E6" fill="#00B4E633" strokeWidth={2} />
              <Area type="monotone" dataKey="new_subs" stackId="2" stroke="#9c5e6c" fill="#9c5e6c33" strokeWidth={2} />
              <Area type="monotone" dataKey="cancelled" stackId="3" stroke="#ef4444" fill="#ef444433" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter + table */}
      <div className="flex gap-2">
        <Select value={status || 'all'} onValueChange={v => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
