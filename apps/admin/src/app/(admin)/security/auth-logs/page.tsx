'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type AuthLog = {
  id: number; userId: string | null; email: string | null;
  ip: string | null; userAgent: string | null;
  status: 'success' | 'failed'; createdAt: string;
};

export default function AuthLogsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', email: '', ip: '', dateFrom: '', dateTo: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['auth-logs', page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filters.status) params.set('status', filters.status);
      if (filters.email) params.set('email', filters.email);
      if (filters.ip) params.set('ip', filters.ip);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return api.get<{ data: AuthLog[]; total: number }>(`/v1/admin/security/auth-logs?${params}`);
    },
  });

  const columns: ColumnDef<AuthLog>[] = [
    {
      header: t.common.status,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'success' ? 'success' : 'destructive'}>
          {row.original.status === 'success' ? t.security.success : t.common.error}
        </Badge>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-sm">{row.original.email ?? '—'}</span>,
    },
    {
      accessorKey: 'ip',
      header: 'IP',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip ?? '—'}</span>,
    },
    {
      header: 'User Agent',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {row.original.userAgent ?? '—'}
        </span>
      ),
    },
    {
      header: t.common.date,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={filters.status || 'all'}
          onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={t.common.status} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="success">{t.security.filterSuccess}</SelectItem>
            <SelectItem value="failed">{t.security.filterFailed}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-8 text-xs w-48"
          value={filters.email}
          onChange={e => { setFilters(f => ({ ...f, email: e.target.value })); setPage(1); }}
          placeholder="Email..."
        />
        <Input
          className="h-8 text-xs w-36 font-mono"
          value={filters.ip}
          onChange={e => { setFilters(f => ({ ...f, ip: e.target.value })); setPage(1); }}
          placeholder={t.security.ipPlaceholder}
        />
        <Input
          type="date"
          className="h-8 text-xs w-36"
          value={filters.dateFrom}
          onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
        />
        <Input
          type="date"
          className="h-8 text-xs w-36"
          value={filters.dateTo}
          onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => { setFilters({ status: '', email: '', ip: '', dateFrom: '', dateTo: '' }); setPage(1); }}
        >
          {t.security.reset}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
