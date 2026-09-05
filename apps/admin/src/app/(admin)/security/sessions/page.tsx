'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type TeamSession = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  device: string;
  ip: string | null;
  createdAt: string;
};

export default function TeamSessionsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['team-sessions'],
    queryFn: () => api.get<{ data: TeamSession[] }>('/v1/admin/security/sessions'),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admin/security/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-sessions'] });
      toast.success('Сессия завершена');
    },
    onError: () => toast.error('Ошибка'),
  });

  const columns: ColumnDef<TeamSession>[] = [
    {
      header: 'Администратор',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Роль',
      cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
    },
    {
      accessorKey: 'device',
      header: 'Устройство',
      cell: ({ row }) => <span className="text-sm">{row.original.device}</span>,
    },
    {
      accessorKey: 'ip',
      header: 'IP-адрес',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.ip ?? '—'}</span>,
    },
    {
      header: 'Вход выполнен',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => terminateMutation.mutate(row.original.id)}
          disabled={terminateMutation.isPending}
        >
          <LogOut className="h-3 w-3 mr-1.5" />
          Завершить
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      total={data?.data.length ?? 0}
      page={1}
      pageSize={100}
      onPageChange={() => {}}
      isLoading={isLoading}
    />
  );
}
