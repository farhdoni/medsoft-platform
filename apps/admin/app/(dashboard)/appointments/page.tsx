'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { apiGet, apiDelete } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: string;
  type: string;
  scheduledAt: string;
  priceUzs: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Запланирован', completed: 'Завершён', cancelled: 'Отменён',
  no_show: 'Не явился', in_progress: 'Идёт',
};

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [del, setDel] = useState<Appointment | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Appointment>>({
    queryKey: ['appointments', page, status],
    queryFn: () => apiGet('/appointments', { page, limit: 20, status: status || undefined }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/appointments/${id}`),
    onSuccess: () => { toast.success('Приём удалён'); setDel(null); qc.invalidateQueries({ queryKey: ['appointments'] }); },
    onError: () => toast.error('Ошибка'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Приёмы</h1>
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
          { key: 'scheduledAt', header: 'Дата', cell: (r) => format(new Date(r.scheduledAt), 'dd MMM yyyy HH:mm', { locale: ru }) },
          { key: 'type', header: 'Тип', cell: (r) => r.type === 'online' ? 'Онлайн' : 'Офлайн' },
          { key: 'status', header: 'Статус', cell: (r) => (
            <Badge variant="outline" className={statusColors[r.status]}>{statusLabels[r.status] ?? r.status}</Badge>
          )},
          { key: 'price', header: 'Цена', cell: (r) => `${Number(r.priceUzs || 0).toLocaleString('ru')} сум` },
        ]}
        data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={20} isLoading={isLoading} onPageChange={setPage}
        actions={(r) => (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDel(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      />
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} onConfirm={() => del && delMut.mutate(del.id)} loading={delMut.isPending} />
    </div>
  );
}
