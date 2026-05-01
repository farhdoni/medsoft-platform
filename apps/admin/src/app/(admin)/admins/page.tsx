'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldOff } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Admin = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type AdminMe = { id: string; role: string };

export default function AdminsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', role: 'admin' });

  const { data: me, isLoading: meLoading } = useQuery<AdminMe>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/v1/admins/me'),
    retry: false,
  });

  const isSuperadmin = me?.role === 'superadmin';

  const { data, isLoading } = useQuery({
    queryKey: ['admins', page],
    queryFn: () => api.get<{ data: Admin[]; total: number }>(`/v1/admins?page=${page}&limit=20`),
    enabled: isSuperadmin, // only fetch if superadmin
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/v1/admins', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Администратор создан.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Ошибка при создании'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admins/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins'] }); toast.success('Деактивирован'); },
    onError: () => toast.error('Ошибка'),
  });

  const columns: ColumnDef<Admin>[] = [
    { accessorKey: 'fullName', header: 'Имя' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role', header: 'Роль',
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'superadmin' ? 'default' : 'secondary'}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive', header: 'Статус',
      cell: ({ row }) => row.original.isActive
        ? <Badge variant="success">Активен</Badge>
        : <Badge variant="destructive">Неактивен</Badge>,
    },
    {
      accessorKey: 'lastLoginAt', header: 'Последний вход',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastLoginAt)}</span>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <Button
          size="icon" variant="ghost"
          className="text-destructive"
          disabled={row.original.id === me?.id}
          onClick={() => { if (confirm('Деактивировать?')) deleteMutation.mutate(row.original.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Still loading auth
  if (meLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // Forbidden for non-superadmin
  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Доступ запрещён</h2>
          <p className="text-sm text-muted-foreground mt-1">Управление администраторами доступно только суперадминистраторам.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Администраторы</h1>
          <p className="text-muted-foreground">Управление доступом</p>
        </div>
        <Button onClick={() => { setForm({ email: '', fullName: '', role: 'admin' }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Добавить
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый администратор</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>ФИО *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              Создать
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
