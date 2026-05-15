'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Row = {
  payment: {
    id: number; type: string; status: string; provider: string | null;
    amount: number; currency: string; createdAt: string; completedAt: string | null;
    providerTransactionId: string | null;
  };
  userName: string | null;
  userEmail: string | null;
};

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  completed: 'success', failed: 'destructive', pending: 'warning', refunded: 'secondary', processing: 'warning',
};
const STATUS_LABELS: Record<string, string> = {
  completed: 'Оплачено', failed: 'Ошибка', pending: 'Ожидает',
  refunded: 'Возврат', processing: 'Обработка',
};
const PROVIDER_LABELS: Record<string, string> = { click: 'Click', payme: 'Payme', uzum: 'Uzum' };
const TYPE_LABELS: Record<string, string> = {
  subscription: 'Подписка', consultation: 'Консультация',
  pharmacy_order: 'Аптека', booking: 'Запись',
};

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', provider: '', type: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filters.status) params.set('status', filters.status);
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.type) params.set('type', filters.type);
      return api.get<{ data: Row[]; total: number }>(`/v1/admin/finance/payments?${params}`);
    },
  });

  const refund = useMutation({
    mutationFn: (id: number) => api.post(`/v1/admin/finance/payments/${id}/refund`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  });

  const columns: ColumnDef<Row>[] = [
    { accessorKey: 'payment.id', header: 'ID', cell: ({ row }) => <span className="text-xs text-muted-foreground">#{row.original.payment.id}</span> },
    { header: 'Пользователь', cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.userName ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{row.original.userEmail ?? ''}</p>
      </div>
    )},
    { header: 'Тип', cell: ({ row }) => <Badge variant="secondary">{TYPE_LABELS[row.original.payment.type] ?? row.original.payment.type}</Badge> },
    { header: 'Статус', cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.payment.status] ?? 'secondary'}>
        {STATUS_LABELS[row.original.payment.status] ?? row.original.payment.status}
      </Badge>
    )},
    { header: 'Провайдер', cell: ({ row }) => row.original.payment.provider ? PROVIDER_LABELS[row.original.payment.provider] ?? row.original.payment.provider : '—' },
    { header: 'Сумма', cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(String(row.original.payment.amount))}</span>
    )},
    { header: 'Дата', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.payment.createdAt)}</span> },
    { header: 'Действия', cell: ({ row }) => row.original.payment.status === 'completed' ? (
      <Button
        size="sm" variant="outline" className="text-xs h-7"
        onClick={() => refund.mutate(row.original.payment.id)}
        disabled={refund.isPending}
      >
        Возврат
      </Button>
    ) : null },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.provider || 'all'} onValueChange={v => setFilters(f => ({ ...f, provider: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Провайдер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="click">Click</SelectItem>
            <SelectItem value="payme">Payme</SelectItem>
            <SelectItem value="uzum">Uzum</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.type || 'all'} onValueChange={v => setFilters(f => ({ ...f, type: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
