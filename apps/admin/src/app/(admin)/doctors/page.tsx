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
import { useI18n } from '@/lib/i18n';

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
  const { t } = useI18n();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success(t.misc.doctorCreated); setDialogOpen(false); },
    onError: () => toast.error(t.misc.createFailed),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<DoctorForm> }) => api.patch(`/v1/doctors/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success(t.misc.doctorUpdated); setDialogOpen(false); },
    onError: () => toast.error(t.misc.updateFailed),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/doctors/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success(t.misc.deleted); },
    onError: () => toast.error(t.common.error),
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
    { accessorKey: 'fullName', header: t.misc.fio },
    { accessorKey: 'specialization', header: t.aivita.specialization },
    { accessorKey: 'phone', header: t.users.phone },
    { accessorKey: 'status', header: t.common.status, cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
    { accessorKey: 'ratingAvg', header: t.aivita.rating, cell: ({ row }) => row.original.ratingAvg ? `★ ${Number(row.original.ratingAvg).toFixed(1)}` : '—' },
    { accessorKey: 'createdAt', header: t.misc.createdM, cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm(t.misc.deleteDoctorAsk)) deleteMutation.mutate(row.original.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const fields: [string, keyof DoctorForm][] = [
    [t.misc.fio, 'fullName'],
    [t.users.phone, 'phone'],
    ['Email', 'email'],
    [t.aivita.specialization, 'specialization'],
    [t.misc.licenseNumber, 'licenseNumber'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.nav.doctors}</h1>
          <p className="text-muted-foreground">{t.misc.doctorsSubtitle}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t.misc.add}</Button>
      </div>

      <Input
        placeholder={t.misc.searchHint}
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
            <DialogTitle>{editing ? t.misc.editDoctor : t.misc.newDoctor}</DialogTitle>
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
              {editing ? t.settings.saveShort : t.common.create}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
