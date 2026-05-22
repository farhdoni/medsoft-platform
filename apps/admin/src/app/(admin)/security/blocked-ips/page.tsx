'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type BlockedIp = {
  id: number; ip: string; reason: string | null;
  blockedAt: string; expiresAt: string | null;
};

export default function BlockedIpsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ip: '', reason: '', expiresAt: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: () => api.get<{ data: BlockedIp[] }>('/v1/admin/security/blocked-ips'),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post('/v1/admin/security/blocked-ips', {
      ip: form.ip,
      reason: form.reason || undefined,
      expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      setDialogOpen(false);
      setForm({ ip: '', reason: '', expiresAt: '' });
      toast.success('IP заблокирован');
    },
    onError: () => toast.error('Ошибка'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/admin/security/blocked-ips/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('Блокировка снята');
    },
    onError: () => toast.error('Ошибка'),
  });

  const columns: ColumnDef<BlockedIp>[] = [
    {
      accessorKey: 'ip',
      header: 'IP-адрес',
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.ip}</span>,
    },
    {
      accessorKey: 'reason',
      header: 'Причина',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.reason ?? '—'}</span>
      ),
    },
    {
      header: 'Срок',
      cell: ({ row }) => row.original.expiresAt ? (
        <Badge variant="warning">до {formatDate(row.original.expiresAt)}</Badge>
      ) : (
        <Badge variant="destructive">Постоянно</Badge>
      ),
    },
    {
      header: 'Дата блокировки',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.blockedAt)}</span>,
    },
    {
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => deleteMutation.mutate(row.original.id)}
          disabled={deleteMutation.isPending}
        >
          <ShieldOff className="h-3 w-3 mr-1.5" />
          Разблокировать
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Заблокировать IP
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать IP</DialogTitle>
            <DialogDescription>
              IP-адрес будет заблокирован и не сможет авторизоваться в системе
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>IP-адрес *</Label>
              <Input
                className="font-mono"
                value={form.ip}
                onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Причина</Label>
              <Input
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Подозрительная активность..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Истекает (оставьте пустым для постоянной блокировки)</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !form.ip.trim()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {addMutation.isPending ? 'Блокирую...' : 'Заблокировать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
