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

type Doctor = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  specialization: string;
  licenseNumber: string;
  status: string;
  ratingAvg: string | null;
  createdAt: string;
};

type DoctorForm = {
  fullName: string;
  phone: string;
  email: string;
  specialization: string;
  licenseNumber: string;
};

const emptyForm: DoctorForm = { fullName: '', phone: '', email: '', specialization: '', licenseNumber: '' };

export default function DoctorsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', page, search],
    queryFn: () => api.get<{ data: Doctor[]; total: number }>(`/v1/doctors?page=${page}&limit=20${search ? `&search=${search}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: DoctorForm) => api.post('/v1/doctors', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Врач создан'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при создании'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<DoctorForm> }) => api.patch(`/v1/doctors/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Врач обновлён'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при обновлении'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/doctors/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Удалено'); },
    onError: () => toast.error('Ошибка'),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(doctor: Doctor) {
    setEditing(doctor);
    setForm({
      fullName: doctor.fullName,
      phone: doctor.phone,
      email: doctor.email,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber,
    });
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

  const columns: ColumnDef<Doctor>[] = [
    { accessorKey: 'fullName', header: 'ФИО' },
    { accessorKey: 'specialization', header: 'Специализация' },
    { accessorKey: 'phone', header: 'Телефон' },
    { accessorKey: 'status', header: 'Статус', cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
    { accessorKey: 'ratingAvg', header: 'Рейтинг', cell: ({ row }) => row.original.ratingAvg ? `★ ${Number(row.original.ratingAvg).toFixed(1)}` : '—' },
    { accessorKey: 'createdAt', header: 'Создан', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm('Удалить врача?')) deleteMutation.mutate(row.original.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const fields: [string, keyof DoctorForm][] = [
    ['ФИО', 'fullName'],
    ['Телефон', 'phone'],
    ['Email', 'email'],
    ['Специализация', 'specialization'],
    ['Номер лицензии', 'licenseNumber'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Врачи</h1>
          <p className="text-muted-foreground">Управление врачами</p>
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
            <DialogTitle>{editing ? 'Редактировать врача' : 'Новый врач'}</DialogTitle>
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
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Сохранить' : 'Создать'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
