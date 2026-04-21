'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/data-table';
import { apiGet } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  paymentProvider: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидание', completed: 'Выполнена', failed: 'Ошибка', refunded: 'Возврат',
};

const typeLabels: Record<string, string> = {
  payment: 'Оплата', refund: 'Возврат', deposit: 'Депозит', withdrawal: 'Вывод',
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ['transactions', page, status],
    queryFn: () => apiGet('/transactions', { page, limit: 20, status: status || undefined }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Транзакции</h1>
        <Select value={status} onValueChange={(v) => { setStatus(v === '_all' ? '' : (v ?? '')); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Все статусы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Все статусы</SelectItem>
            {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: 'createdAt', header: 'Дата', cell: (r) => format(new Date(r.createdAt), 'dd MMM yyyy HH:mm', { locale: ru }) },
          { key: 'type', header: 'Тип', cell: (r) => typeLabels[r.type] ?? r.type },
          { key: 'amount', header: 'Сумма', cell: (r) => `${Number(r.amount).toLocaleString('ru')} ${r.currency}` },
          { key: 'provider', header: 'Провайдер', cell: (r) => r.paymentProvider ?? '—' },
          { key: 'status', header: 'Статус', cell: (r) => (
            <Badge variant="outline" className={statusColors[r.status]}>{statusLabels[r.status] ?? r.status}</Badge>
          )},
        ]}
        data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={20} isLoading={isLoading} onPageChange={setPage}
      />
    </div>
  );
}
