'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Transaction = {
  id: string;
  type: string;
  status: string;
  provider: string;
  amountUzs: string;
  direction: string;
  createdAt: string;
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => api.get<{ data: Transaction[]; total: number }>(`/v1/transactions?page=${page}&limit=20`),
  });

  const columns: ColumnDef<Transaction>[] = [
    { accessorKey: 'type', header: 'Тип', cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge> },
    { accessorKey: 'status', header: 'Статус', cell: ({ row }) => <Badge variant={row.original.status === 'completed' ? 'success' : row.original.status === 'failed' ? 'destructive' : 'warning'}>{row.original.status}</Badge> },
    { accessorKey: 'provider', header: 'Провайдер' },
    { accessorKey: 'amountUzs', header: 'Сумма', cell: ({ row }) => <span className={row.original.direction === 'debit' ? 'text-red-500' : 'text-green-500'}>{row.original.direction === 'debit' ? '-' : '+'}{formatCurrency(row.original.amountUzs)}</span> },
    { accessorKey: 'createdAt', header: 'Дата', cell: ({ row }) => formatDate(row.original.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Транзакции</h1>
        <p className="text-muted-foreground">История финансовых операций</p>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
