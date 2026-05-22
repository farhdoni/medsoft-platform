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

type LogEntry = {
  id: number; level: string; module: string;
  message: string; metadata: Record<string, unknown> | null; createdAt: string;
};

const LEVEL_VARIANTS: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  info: 'success', warning: 'warning', error: 'destructive',
};
const LEVEL_LABELS: Record<string, string> = { info: 'Info', warning: 'Warning', error: 'Error' };
const MODULE_LABELS: Record<string, string> = {
  api: 'API', auth: 'Auth', payment: 'Payment', ai: 'AI', system: 'System',
};

export default function SystemLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ level: '', module: '', dateFrom: '', dateTo: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['system-logs', page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (filters.level) params.set('level', filters.level);
      if (filters.module) params.set('module', filters.module);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return api.get<{ data: LogEntry[] }>(`/v1/admin/system/logs?${params}`);
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const columns: ColumnDef<LogEntry>[] = [
    {
      header: 'Уровень',
      cell: ({ row }) => (
        <Badge variant={LEVEL_VARIANTS[row.original.level] ?? 'secondary'}>
          {LEVEL_LABELS[row.original.level] ?? row.original.level}
        </Badge>
      ),
    },
    {
      header: 'Модуль',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {MODULE_LABELS[row.original.module] ?? row.original.module}
        </Badge>
      ),
    },
    {
      header: 'Сообщение',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.message}</p>
          {row.original.metadata && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-xs">
              {JSON.stringify(row.original.metadata)}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Дата',
      cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDate(row.original.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Системные логи</h2>
          <p className="text-sm text-muted-foreground">Последние 100 записей · Обновляется каждые 30 сек</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filters.level || 'all'} onValueChange={v => setFilters(f => ({ ...f, level: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Уровень" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.module || 'all'} onValueChange={v => setFilters(f => ({ ...f, module: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Модуль" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
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
          size="sm" variant="outline" className="h-8 text-xs"
          onClick={() => { setFilters({ level: '', module: '', dateFrom: '', dateTo: '' }); setPage(1); }}
        >
          Сбросить
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.data.length ?? 0}
        page={page}
        pageSize={100}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
