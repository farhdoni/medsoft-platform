'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Trash2 } from 'lucide-react';
import { apiGet, apiDelete } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface SosCall {
  id: string;
  status: string;
  locationLat: string | null;
  locationLng: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидает', assigned: 'Назначен', resolved: 'Решён', cancelled: 'Отменён',
};

export default function SosCallsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [del, setDel] = useState<SosCall | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<SosCall>>({
    queryKey: ['sos-calls', page, status],
    queryFn: () => apiGet('/sos-calls', { page, limit: 20, status: status || undefined }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/sos-calls/${id}`),
    onSuccess: () => { toast.success('Удалено'); setDel(null); qc.invalidateQueries({ queryKey: ['sos-calls'] }); },
    onError: () => toast.error('Ошибка'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SOS-вызовы</h1>
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
          { key: 'createdAt', header: 'Время', cell: (r) => format(new Date(r.createdAt), 'dd MMM yyyy HH:mm', { locale: ru }) },
          { key: 'location', header: 'Координаты', cell: (r) => r.locationLat ? `${r.locationLat}, ${r.locationLng}` : '—' },
          { key: 'status', header: 'Статус', cell: (r) => (
            <Badge variant="outline" className={statusColors[r.status]}>{statusLabels[r.status] ?? r.status}</Badge>
          )},
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
