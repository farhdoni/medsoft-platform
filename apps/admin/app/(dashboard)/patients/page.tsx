'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SearchInput } from '@/components/shared/search-input';
import { PatientDialog } from '@/components/patients/patient-dialog';
import { apiGet, apiDelete } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface Patient {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  depositBalance: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'text-muted-foreground',
  blocked: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  active: 'Активен', inactive: 'Неактивен', blocked: 'Заблокирован',
};

export default function PatientsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Patient>>({
    queryKey: ['patients', page, q],
    queryFn: () => apiGet('/patients', { page, limit: 20, q: q || undefined }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/patients/${id}`),
    onSuccess: () => {
      toast.success('Пациент удалён');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => toast.error('Ошибка при удалении'),
  });

  function openCreate() { setEditTarget(null); setDialogOpen(true); }
  function openEdit(p: Patient) { setEditTarget(p); setDialogOpen(true); }

  const columns = [
    { key: 'fullName', header: 'ФИО', cell: (r: Patient) => <span className="font-medium">{r.fullName}</span> },
    { key: 'phone', header: 'Телефон', cell: (r: Patient) => r.phone },
    { key: 'status', header: 'Статус', cell: (r: Patient) => (
      <Badge variant="outline" className={statusColors[r.status]}>
        {statusLabels[r.status] ?? r.status}
      </Badge>
    )},
    { key: 'bloodGroup', header: 'Группа крови', cell: (r: Patient) => r.bloodGroup ?? '—' },
    { key: 'depositBalance', header: 'Депозит', cell: (r: Patient) => `${Number(r.depositBalance).toLocaleString('ru')} сум` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Пациенты</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />Добавить
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Поиск по ФИО..." />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={20}
        isLoading={isLoading}
        onPageChange={setPage}
        actions={(r) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      />

      <PatientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editTarget}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['patients'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        description={`Пациент "${deleteTarget?.fullName}" будет удалён.`}
      />
    </div>
  );
}
