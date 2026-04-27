'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  status: string;
  scheduledAt: string;
  priceUzs: string;
  isPaid: boolean;
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  confirmed: 'default',
  scheduled: 'secondary',
  in_progress: 'warning',
  cancelled_by_patient: 'destructive',
  cancelled_by_doctor: 'destructive',
  no_show: 'destructive',
};

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page],
    queryFn: () => api.get<{ data: Appointment[]; total: number }>(`/v1/appointments?page=${page}&limit=20`),
  });

  const columns: ColumnDef<Appointment>[] = [
    { accessorKey: 'type', header: 'Тип', cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge> },
    {
      accessorKey: 'status', header: 'Статус',
      cell: ({ row }) => <Badge variant={statusColors[row.original.status] ?? 'outline'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'scheduledAt', header: 'Дата', cell: ({ row }) => formatDate(row.original.scheduledAt) },
    { accessorKey: 'priceUzs', header: 'Цена', cell: ({ row }) => formatCurrency(row.original.priceUzs) },
    { accessorKey: 'isPaid', header: 'Оплачено', cell: ({ row }) => row.original.isPaid ? '✓' : '✗' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Приёмы</h1>
        <p className="text-muted-foreground">Список записей к врачам</p>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
