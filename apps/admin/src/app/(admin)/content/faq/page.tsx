'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

type FaqItem = {
  id: number; question: string; answer: string;
  category: string; sortOrder: number; isActive: boolean; createdAt: string;
};

export default function FaqPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'general', sortOrder: 0, isActive: true });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: () => api.get<{ data: FaqItem[] }>('/v1/admin/content/faq'),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/v1/admin/content/faq/${editing.id}`, form)
      : api.post('/v1/admin/content/faq', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faq'] });
      setDialogOpen(false);
      toast.success(editing ? 'FAQ обновлён' : 'FAQ добавлен');
    },
    onError: () => toast.error('Ошибка'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/admin/content/faq/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faq'] });
      toast.success('FAQ удалён');
    },
    onError: () => toast.error('Ошибка'),
  });

  function openCreate() {
    setEditing(null);
    setForm({ question: '', answer: '', category: 'general', sortOrder: 0, isActive: true });
    setDialogOpen(true);
  }

  function openEdit(item: FaqItem) {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, category: item.category, sortOrder: item.sortOrder, isActive: item.isActive });
    setDialogOpen(true);
  }

  const columns: ColumnDef<FaqItem>[] = [
    {
      accessorKey: 'sortOrder',
      header: '#',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.sortOrder}</span>,
    },
    {
      accessorKey: 'question',
      header: 'Вопрос',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.question}</span>,
    },
    {
      accessorKey: 'answer',
      header: 'Ответ',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">{row.original.answer}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Категория',
      cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>,
    },
    {
      header: 'Активен',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-destructive"
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить FAQ
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.data.length ?? 0}
        page={1}
        pageSize={100}
        onPageChange={() => {}}
        isLoading={isLoading}
      />

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать FAQ' : 'Добавить FAQ'}</DialogTitle>
            <DialogDescription>Вопрос и ответ, который увидят пользователи</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Вопрос</Label>
              <Input
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="Как работает..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ответ</Label>
              <Textarea
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                className="min-h-[100px]"
                placeholder="Подробный ответ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Категория</Label>
                <Input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="general"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Порядок сортировки</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label>Активен (отображается на сайте)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.question.trim() || !form.answer.trim()}
            >
              {saveMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
