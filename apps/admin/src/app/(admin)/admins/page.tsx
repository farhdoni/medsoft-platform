'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldOff } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Admin = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type AdminMe = { id: string; role: string };

export default function AdminsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', role: 'admin' });

  const { data: me, isLoading: meLoading } = useQuery<AdminMe>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/v1/admins/me'),
    retry: false,
  });

  const isSuperadmin = me?.role === 'superadmin';

  const { data, isLoading } = useQuery({
    queryKey: ['admins', page],
    queryFn: () => api.get<{ data: Admin[]; total: number }>(`/v1/admins?page=${page}&limit=20`),
    enabled: isSuperadmin, // only fetch if superadmin
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/v1/admins', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      toast.success(t.misc.adminCreated);
      setDialogOpen(false);
    },
    onError: () => toast.error(t.misc.createFailed),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admins/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins'] }); toast.success(t.misc.deactivated); },
    onError: () => toast.error(t.common.error),
  });

  const columns: ColumnDef<Admin>[] = [
    { accessorKey: 'fullName', header: t.misc.name },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role', header: t.security.role,
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'superadmin' ? 'default' : 'secondary'}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive', header: t.common.status,
      cell: ({ row }) => row.original.isActive
        ? <Badge variant="success">{t.common.active}</Badge>
        : <Badge variant="destructive">{t.misc.inactive}</Badge>,
    },
    {
      accessorKey: 'lastLoginAt', header: t.users.lastLogin,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastLoginAt)}</span>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <Button
          size="icon" variant="ghost"
          className="text-destructive"
          disabled={row.original.id === me?.id}
          onClick={() => { if (confirm(t.misc.deactivateAsk)) deleteMutation.mutate(row.original.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Still loading auth
  if (meLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // Forbidden for non-superadmin
  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">{t.misc.accessDenied}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.misc.accessDeniedHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.misc.adminsTitle}</h1>
          <p className="text-muted-foreground">{t.misc.adminsSubtitle}</p>
        </div>
        <Button onClick={() => { setForm({ email: '', fullName: '', role: 'admin' }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />{t.misc.add}
        </Button>
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
          <DialogHeader><DialogTitle>{t.misc.newAdmin}</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t.misc.fullNameReq}</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {t.common.create}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
