'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Row = {
  subscription: { id: number; status: string; expiresAt: string; autoRenew: boolean; startedAt: string };
  plan: { name: string; slug: string; price: number; period: string } | null;
  userName: string | null;
  userEmail: string | null;
};

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  active: 'success', expired: 'secondary', cancelled: 'secondary', past_due: 'warning',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Активна', expired: 'Истекла', cancelled: 'Отменена', past_due: 'Просрочена',
};

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subs', page, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (status) params.set('status', status);
      return api.get<{ data: Row[]; total: number; mrr: number }>(`/v1/admin/finance/subscriptions?${params}`);
    },
  });

  const columns: ColumnDef<Row>[] = [
    { header: 'Пользователь', cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.userName ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{row.original.userEmail ?? ''}</p>
      </div>
    )},
    { header: 'Тариф', cell: ({ row }) => row.original.plan ? (
      <div>
        <p className="text-sm font-medium">{row.original.plan.name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(String(row.original.plan.price))}</p>
      </div>
    ) : '—' },
    { header: 'Статус', cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.subscription.status] ?? 'secondary'}>
        {STATUS_LABELS[row.original.subscription.status] ?? row.original.subscription.status}
      </Badge>
    )},
    { header: 'Начало', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.subscription.startedAt)}</span> },
    { header: 'Истекает', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.subscription.expiresAt)}</span> },
    { header: 'Авто', cell: ({ row }) => row.original.subscription.autoRenew
      ? <Badge variant="success" className="text-xs">Вкл</Badge>
      : <Badge variant="secondary" className="text-xs">Откл</Badge>
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">MRR (прогноз)</p>
            <p className="text-xl font-bold mt-1">{data ? formatCurrency(String(data.mrr)) : '...'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Всего подписок</p>
            <p className="text-xl font-bold mt-1">{data?.total ?? '...'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Select value={status || 'all'} onValueChange={v => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
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
