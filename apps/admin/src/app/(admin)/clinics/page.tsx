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

type Clinic = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  city: string;
  phone: string;
  createdAt: string;
};

type ClinicForm = {
  name: string;
  address: string;
  city: string;
  phone: string;
};

const emptyForm: ClinicForm = { name: '', address: '', city: '', phone: '' };

export default function ClinicsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState<ClinicForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['clinics', page, search],
    queryFn: () => api.get<{ data: Clinic[]; total: number }>(`/v1/clinics?page=${page}&limit=20${search ? `&search=${search}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: ClinicForm) => api.post('/v1/clinics', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinics'] }); toast.success('Клиника создана'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ClinicForm> }) => api.patch(`/v1/clinics/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinics'] }); toast.success('Клиника обновлена'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при обновлении'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/clinics/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinics'] }); toast.success('Удалено'); },
    onError: () => toast.error('Ошибка'),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(clinic: Clinic) {
    setEditing(clinic);
    setForm({ name: clinic.name, address: clinic.address ?? '', city: clinic.city, phone: clinic.phone });
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

  const fields: [string, keyof ClinicForm][] = [
    ['Название', 'name'],
    ['Адрес', 'address'],
    ['Город', 'city'],
    ['Телефон', 'phone'],
  ];

  const columns: ColumnDef<Clinic>[] = [
    { accessorKey: 'name', header: 'Название' },
    { accessorKey: 'type', header: 'Тип', cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge> },
    {
      accessorKey: 'status', header: 'Статус',
      cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'warning'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'city', header: 'Город' },
    { accessorKey: 'phone', header: 'Телефон' },
    { accessorKey: 'createdAt', header: 'Создана', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm('Удалить клинику?')) deleteMutation.mutate(row.original.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Клиники</h1>
          <p className="text-muted-foreground">Управление клиниками</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Добавить</Button>
      </div>

      <Input
        placeholder="Поиск..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

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
            <DialogTitle>{editing ? 'Редактировать клинику' : 'Новая клиника'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {fields.map(([label, key]) => (
              <div key={key} className="space-y-2">
                <Label>{label} *</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required
                />
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Сохранить' : 'Создать'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
