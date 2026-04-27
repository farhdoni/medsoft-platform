'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Patient = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  bloodGroup: string | null;
  isMinor: boolean;
  createdAt: string;
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  premium: 'default',
  pending_verification: 'warning',
  suspended: 'destructive',
};

export default function PatientsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => api.get<{ data: Patient[]; total: number }>(`/v1/patients?page=${page}&limit=20${search ? `&search=${search}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/v1/patients', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); toast.success('Пациент создан'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при создании'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof form> }) => api.patch(`/v1/patients/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); toast.success('Обновлено'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при обновлении'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/patients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); toast.success('Удалено'); },
    onError: () => toast.error('Ошибка при удалении'),
  });

  const columns: ColumnDef<Patient>[] = [
    { accessorKey: 'fullName', header: 'ФИО' },
    { accessorKey: 'phone', header: 'Телефон' },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => <Badge variant={statusColors[row.original.status] ?? 'outline'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'bloodGroup', header: 'Группа крови', cell: ({ row }) => row.original.bloodGroup ?? '—' },
    { accessorKey: 'createdAt', header: 'Создан', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => {
            setEditing(row.original);
            setForm({ fullName: row.original.fullName, phone: row.original.phone, email: row.original.email ?? '' });
            setDialogOpen(true);
          }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm('Удалить пациента?')) deleteMutation.mutate(row.original.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  function openCreate() {
    setEditing(null);
    setForm({ fullName: '', phone: '', email: '' });
    setDialogOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пациенты</h1>
          <p className="text-muted-foreground">Управление пациентами</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Добавить</Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Поиск по имени, телефону..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
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
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать пациента' : 'Новый пациент'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО *</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Телефон *</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Сохранить' : 'Создать'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
