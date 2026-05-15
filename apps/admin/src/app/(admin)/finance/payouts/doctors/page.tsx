'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Row = {
  payout: {
    id: number; amount: number; period: string | null;
    cardNumber: string | null; bankName: string | null;
    status: string; paidAt: string | null; createdAt: string;
  };
  doctorName: string | null;
  doctorEmail: string | null;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  completed: 'success', processing: 'warning', pending: 'secondary',
};
const STATUS_LABELS: Record<string, string> = {
  completed: 'Выплачено', processing: 'В обработке', pending: 'Ожидает',
};

export default function DoctorPayoutsPage() {
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genPeriod, setGenPeriod] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-doctor-payouts', page],
    queryFn: () => api.get<{ data: Row[] }>('/v1/admin/payouts/doctors'),
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => api.post(`/v1/admin/payouts/doctors/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-doctor-payouts'] }),
  });

  async function handleGenerate() {
    if (!genPeriod) return;
    setGenerating(true);
    await api.post('/v1/admin/payouts/doctors/generate', { period: genPeriod });
    setGenerating(false);
    qc.invalidateQueries({ queryKey: ['admin-doctor-payouts'] });
  }

  const columns: ColumnDef<Row>[] = [
    { header: 'Врач', cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.doctorName ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{row.original.doctorEmail ?? ''}</p>
      </div>
    )},
    { header: 'Период', cell: ({ row }) => <span className="text-sm">{row.original.payout.period ?? '—'}</span> },
    { header: 'Сумма', cell: ({ row }) => <span className="font-medium">{formatCurrency(String(row.original.payout.amount))}</span> },
    { header: 'Карта', cell: ({ row }) => (
      <div>
        <p className="text-xs font-mono">{row.original.payout.cardNumber ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{row.original.payout.bankName ?? ''}</p>
      </div>
    )},
    { header: 'Статус', cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.payout.status] ?? 'secondary'}>
        {STATUS_LABELS[row.original.payout.status] ?? row.original.payout.status}
      </Badge>
    )},
    { header: 'Дата', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.payout.createdAt)}</span> },
    { header: '', cell: ({ row }) => row.original.payout.status === 'pending' ? (
      <Button
        size="sm" variant="outline" className="text-xs h-7"
        onClick={() => markPaid.mutate(row.original.payout.id)}
        disabled={markPaid.isPending}
      >
        Отметить выплаченным
      </Button>
    ) : row.original.payout.paidAt ? (
      <span className="text-xs text-muted-foreground">{formatDate(row.original.payout.paidAt)}</span>
    ) : null },
  ];

  return (
    <div className="space-y-4">
      {/* Generate payouts */}
      <div className="flex items-center gap-2 p-4 rounded-xl border bg-card">
        <Input
          value={genPeriod}
          onChange={e => setGenPeriod(e.target.value)}
          placeholder="Период (напр. 2025-05)"
          className="max-w-48 h-8 text-sm"
        />
        <Button
          size="sm" onClick={handleGenerate}
          disabled={generating || !genPeriod}
        >
          {generating ? 'Генерация...' : 'Сформировать ведомость'}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.data?.length ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
