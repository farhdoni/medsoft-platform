'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Clinic = { id: string; name: string; type: string; status: string; city: string; phone: string; createdAt: string };

export default function ClinicsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['clinics', page, search],
    queryFn: () => api.get<{ data: Clinic[]; total: number }>(`/v1/clinics?page=${page}&limit=20${search ? `&search=${search}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/v1/clinics', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinics'] }); toast.success('Клиника создана'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/clinics/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinics'] }); toast.success('Удалено'); },
    onError: () => toast.error('Ошибка'),
  });

  const columns: ColumnDef<Clinic>[] = [
    { accessorKey: 'name', header: 'Название' },
    { accessorKey: 'type', header: 'Тип', cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge> },
    { accessorKey: 'status', header: 'Статус', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'warning'}>{row.original.status}</Badge> },
    { accessorKey: 'city', header: 'Город' },
    { accessorKey: 'phone', header: 'Телефон' },
    { accessorKey: 'createdAt', header: 'Создана', cell: ({ row }) => formatDate(row.original.createdAt) },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Удалить?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4" /></Button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Клиники</h1><p className="text-muted-foreground">Управление клиниками</p></div>
        <Button onClick={() => { setForm({ name: '', address: '', city: '', phone: '' }); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Добавить</Button>
      </div>
      <Input placeholder="Поиск..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />
      <DataTable columns={columns} data={data?.data ?? []} total={data?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая клиника</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            {[['Название', 'name'], ['Адрес', 'address'], ['Город', 'city'], ['Телефон', 'phone']].map(([label, key]) => (
              <div key={key} className="space-y-2">
                <Label>{label} *</Label>
                <Input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} required />
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>Создать</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
