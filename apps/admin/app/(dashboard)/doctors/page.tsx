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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
  phone: string;
  status: string;
  consultationPriceUzs: string;
  ratingAvg: string;
}

const schema = z.object({
  fullName: z.string().min(2),
  specialty: z.string().min(2),
  phone: z.string().min(9),
  status: z.enum(['active', 'inactive', 'on_leave', 'suspended']),
  consultationPriceUzs: z.string().optional(),
});
type F = z.infer<typeof schema>;

export default function DoctorsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Doctor | null>(null);
  const [del, setDel] = useState<Doctor | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Doctor>>({
    queryKey: ['doctors', page, q],
    queryFn: () => apiGet('/doctors', { page, limit: 20, q: q || undefined }),
  });

  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: { status: 'active' } });

  function openCreate() { setEdit(null); form.reset({ status: 'active' }); setOpen(true); }
  function openEdit(d: Doctor) { setEdit(d); form.reset({ fullName: d.fullName, specialty: d.specialty, phone: d.phone, status: d.status as F['status'], consultationPriceUzs: d.consultationPriceUzs }); setOpen(true); }

  const saveMut = useMutation({
    mutationFn: (v: F) => edit ? apiPatch(`/doctors/${edit.id}`, v) : apiPost('/doctors', v),
    onSuccess: () => { toast.success(edit ? 'Врач обновлён' : 'Врач создан'); setOpen(false); qc.invalidateQueries({ queryKey: ['doctors'] }); },
    onError: () => toast.error('Ошибка'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/doctors/${id}`),
    onSuccess: () => { toast.success('Врач удалён'); setDel(null); qc.invalidateQueries({ queryKey: ['doctors'] }); },
    onError: () => toast.error('Ошибка'),
  });

  const statusLabels: Record<string, string> = { active: 'Активен', inactive: 'Неактивен', on_leave: 'В отпуске', suspended: 'Отстранён' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Врачи</h1>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" />Добавить</Button>
      </div>
      <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Поиск по ФИО..." />
      <DataTable
        columns={[
          { key: 'fullName', header: 'ФИО', cell: (r) => <span className="font-medium">{r.fullName}</span> },
          { key: 'specialty', header: 'Специальность', cell: (r) => r.specialty },
          { key: 'phone', header: 'Телефон', cell: (r) => r.phone },
          { key: 'status', header: 'Статус', cell: (r) => <Badge variant="outline">{statusLabels[r.status] ?? r.status}</Badge> },
          { key: 'price', header: 'Цена', cell: (r) => `${Number(r.consultationPriceUzs || 0).toLocaleString('ru')} сум` },
          { key: 'rating', header: 'Рейтинг', cell: (r) => r.ratingAvg ?? '—' },
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
          <DialogHeader><DialogTitle>{edit ? 'Редактировать врача' : 'Новый врач'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-3">
              {(['fullName', 'specialty', 'phone', 'consultationPriceUzs'] as const).map((name) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{{ fullName: 'ФИО', specialty: 'Специальность', phone: 'Телефон', consultationPriceUzs: 'Цена (сум)' }[name]}</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Статус</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                <Button type="submit" disabled={saveMut.isPending}>Сохранить</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} onConfirm={() => del && delMut.mutate(del.id)} loading={delMut.isPending} description={`Врач "${del?.fullName}" будет удалён.`} />
    </div>
  );
}
