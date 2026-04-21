'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SearchInput } from '@/components/shared/search-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface Clinic { id: string; name: string; type: string; status: string; city: string | null; phone: string | null; }

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(['clinic', 'hospital', 'diagnostic_center', 'pharmacy', 'laboratory']),
  status: z.enum(['active', 'inactive', 'suspended']),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
});
type F = z.infer<typeof schema>;

const typeLabels: Record<string, string> = { clinic: 'Клиника', hospital: 'Больница', diagnostic_center: 'Диагностика', pharmacy: 'Аптека', laboratory: 'Лаборатория' };
const statusLabels: Record<string, string> = { active: 'Активна', inactive: 'Неактивна', suspended: 'Приостановлена' };

export default function ClinicsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Clinic | null>(null);
  const [del, setDel] = useState<Clinic | null>(null);
  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: { type: 'clinic', status: 'active' } });

  const { data, isLoading } = useQuery<PaginatedResponse<Clinic>>({
    queryKey: ['clinics', page, q],
    queryFn: () => apiGet('/clinics', { page, limit: 20, q: q || undefined }),
  });

  function openCreate() { setEdit(null); form.reset({ type: 'clinic', status: 'active' }); setOpen(true); }
  function openEdit(c: Clinic) { setEdit(c); form.reset({ name: c.name, type: c.type as F['type'], status: c.status as F['status'], phone: c.phone ?? '', city: c.city ?? '' }); setOpen(true); }

  const saveMut = useMutation({
    mutationFn: (v: F) => edit ? apiPatch(`/clinics/${edit.id}`, v) : apiPost('/clinics', v),
    onSuccess: () => { toast.success(edit ? 'Клиника обновлена' : 'Клиника создана'); setOpen(false); qc.invalidateQueries({ queryKey: ['clinics'] }); },
    onError: () => toast.error('Ошибка'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/clinics/${id}`),
    onSuccess: () => { toast.success('Клиника удалена'); setDel(null); qc.invalidateQueries({ queryKey: ['clinics'] }); },
    onError: () => toast.error('Ошибка'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Клиники</h1>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" />Добавить</Button>
      </div>
      <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Поиск по названию..." />
      <DataTable
        columns={[
          { key: 'name', header: 'Название', cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'type', header: 'Тип', cell: (r) => typeLabels[r.type] ?? r.type },
          { key: 'city', header: 'Город', cell: (r) => r.city ?? '—' },
          { key: 'phone', header: 'Телефон', cell: (r) => r.phone ?? '—' },
          { key: 'status', header: 'Статус', cell: (r) => <Badge variant="outline">{statusLabels[r.status] ?? r.status}</Badge> },
        ]}
        data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={20} isLoading={isLoading} onPageChange={setPage}
        actions={(r) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDel(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit ? 'Редактировать клинику' : 'Новая клиника'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Название *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Тип</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(typeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Город</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Телефон</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Адрес</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                <Button type="submit" disabled={saveMut.isPending}>Сохранить</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} onConfirm={() => del && delMut.mutate(del.id)} loading={delMut.isPending} description={`Клиника "${del?.name}" будет удалена.`} />
    </div>
  );
}
