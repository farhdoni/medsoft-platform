'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Eye, ToggleLeft, ToggleRight, Search,
} from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

type AivitaDoctor = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  city: string | null;
  verificationStatus: string;
  diplomaVerified: string;
  licenseVerified: string;
  showInCatalog: boolean;
  isActive: boolean;
  rating: number;
  totalConsultations: number;
  consultationPrice: number;
  createdAt: string;
  rejectionReason: string | null;
};

const VERIFY_STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  verified:     'success',
  pending:      'warning',
  not_verified: 'secondary',
  rejected:     'destructive',
};

export default function AivitaDoctorsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['aivita-doctors', page, search, statusFilter],
    queryFn: () => api.get<{ data: AivitaDoctor[]; total: number }>(
      `/v1/aivita-admin/aivita-doctors?page=${page}&limit=25${search ? `&search=${encodeURIComponent(search)}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`
    ),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ userId, action, reason }: { userId: string; action: 'approve' | 'reject'; reason?: string }) =>
      api.patch(`/v1/aivita-admin/aivita-doctors/${userId}/verify`, { action, reason }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['aivita-doctors'] });
      toast.success(action === 'approve' ? '✅ Врач верифицирован' : '❌ Врач отклонён');
      setRejectDialog(null);
      setRejectReason('');
    },
    onError: () => toast.error('Ошибка верификации'),
  });

  const catalogMutation = useMutation({
    mutationFn: ({ userId, ...body }: { userId: string; showInCatalog?: boolean; isActive?: boolean }) =>
      api.patch(`/v1/aivita-admin/aivita-doctors/${userId}/catalog`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aivita-doctors'] });
      toast.success('Обновлено');
    },
    onError: () => toast.error('Ошибка'),
  });

  const columns: ColumnDef<AivitaDoctor>[] = [
    {
      accessorKey: 'name',
      header: 'Врач',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'specialization',
      header: 'Специализация',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.specialization ?? '—'}</p>
          {row.original.city && <p className="text-xs text-muted-foreground">📍 {row.original.city}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'verificationStatus',
      header: 'Верификация',
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={VERIFY_STATUS_COLORS[row.original.verificationStatus] ?? 'outline'}>
            {row.original.verificationStatus}
          </Badge>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px]">
              Диплом: {row.original.diplomaVerified}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      header: 'Каталог',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => catalogMutation.mutate({ userId: row.original.userId, showInCatalog: !row.original.showInCatalog })}
            className="flex items-center gap-1 text-xs"
          >
            {row.original.showInCatalog
              ? <ToggleRight className="h-4 w-4 text-green-500" />
              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            {row.original.showInCatalog ? 'Виден' : 'Скрыт'}
          </button>
          <button
            onClick={() => catalogMutation.mutate({ userId: row.original.userId, isActive: !row.original.isActive })}
            className="flex items-center gap-1 text-xs"
          >
            {row.original.isActive
              ? <ToggleRight className="h-4 w-4 text-blue-500" />
              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            {row.original.isActive ? 'Активен' : 'Деактивирован'}
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'rating',
      header: 'Рейтинг',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.rating > 0 ? `★ ${row.original.rating.toFixed(1)}` : '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.totalConsultations} конс.</p>
        </div>
      ),
    },
    { accessorKey: 'createdAt', header: 'Регистрация', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link href={`/aivita/doctors/${row.original.userId}`}>
            <Button size="icon" variant="ghost" title="Просмотреть профиль">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {row.original.verificationStatus !== 'verified' && (
            <Button size="icon" variant="ghost" title="Верифицировать"
              className="text-green-600 hover:text-green-700"
              onClick={() => verifyMutation.mutate({ userId: row.original.userId, action: 'approve' })}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {row.original.verificationStatus !== 'rejected' && (
            <Button size="icon" variant="ghost" title="Отклонить"
              className="text-destructive hover:text-destructive"
              onClick={() => { setRejectDialog({ userId: row.original.userId, name: row.original.name }); setRejectReason(''); }}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Врачи AIVITA</h1>
        <p className="text-muted-foreground">Верификация документов и управление каталогом</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder="Поиск по имени..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Статус верификации" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="not_verified">Не верифицирован</SelectItem>
            <SelectItem value="pending">На рассмотрении</SelectItem>
            <SelectItem value="verified">Верифицирован</SelectItem>
            <SelectItem value="rejected">Отклонён</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={open => { if (!open) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить верификацию — {rejectDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Причина отклонения *</Label>
              <Input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Укажите причину..."
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={!rejectReason.trim() || verifyMutation.isPending}
              onClick={() => {
                if (rejectDialog)
                  verifyMutation.mutate({ userId: rejectDialog.userId, action: 'reject', reason: rejectReason });
              }}
            >
              Отклонить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
