'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Download, Filter } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type AivitaUser = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  provider: string;
  onboardingCompleted: boolean;
  emailVerified: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  healthScore: number | null;
};

type ListResponse = { data: AivitaUser[]; total: number; page: number; limit: number };

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
  const variant = score >= 75 ? 'success' : score >= 50 ? 'warning' : 'destructive';
  return <Badge variant={variant}>{score}</Badge>;
}

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function AivitaPatientsPage() {
  const router = useRouter();
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [dateRange, setDateRange]   = useState('all');
  const [scoreRange, setScoreRange] = useState('all');
  const [sort, setSort]             = useState('created_at');
  const [order, setOrder]           = useState('desc');

  const debouncedSearch = useDebounce(search, 300);

  const queryParams = new URLSearchParams({
    page: String(page), limit: '25',
    ...(debouncedSearch && { search: debouncedSearch }),
    filter, dateRange, scoreRange, sort, order,
  }).toString();

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['aivita-users', queryParams],
    queryFn: () => api.get(`/v1/aivita-admin/users?${queryParams}`),
  });

  // Reset page on filter change
  const resetPage = useCallback(() => setPage(1), []);
  useEffect(() => { resetPage(); }, [debouncedSearch, filter, dateRange, scoreRange, resetPage]);

  function exportCsv() {
    const users = data?.data ?? [];
    if (!users.length) return;
    const headers = ['ID', 'Имя', 'Никнейм', 'Email', 'Health Score', 'Регистрация', 'Последний вход'];
    const rows = users.map((u) => [
      u.id, u.name ?? '', u.nickname ?? '', u.email ?? '',
      u.healthScore ?? '',
      u.createdAt, u.lastLoginAt ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `aivita-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const columns: ColumnDef<AivitaUser>[] = [
    {
      accessorKey: 'name',
      header: 'Имя',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name ?? row.original.nickname ?? '—'}</p>
          {row.original.nickname && row.original.name && (
            <p className="text-xs text-muted-foreground">@{row.original.nickname}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.email ?? '—'}</p>
          {!row.original.emailVerified && row.original.email && (
            <Badge variant="warning" className="text-[10px] mt-0.5">не подтверждён</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'healthScore',
      header: 'Health Score',
      cell: ({ row }) => <ScoreBadge score={row.original.healthScore} />,
    },
    {
      accessorKey: 'onboardingCompleted',
      header: 'Онбординг',
      cell: ({ row }) => row.original.onboardingCompleted
        ? <Badge variant="success">✓</Badge>
        : <Badge variant="secondary">—</Badge>,
    },
    {
      accessorKey: 'provider',
      header: 'Вход через',
      cell: ({ row }) => <span className="text-xs capitalize text-muted-foreground">{row.original.provider}</span>,
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Последний вход',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastLoginAt)}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Зарегистрирован',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'status',
      header: 'Статус',
      cell: ({ row }) => row.original.deletedAt
        ? <Badge variant="destructive">Удалён</Badge>
        : <Badge variant="success">Активен</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пациенты aivita.uz</h1>
          <p className="text-muted-foreground">Пользователи приложения</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!data?.data?.length}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, никнейму..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-72"
          />
        </div>

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Активные (7д)</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
            <SelectItem value="deleted">Удалённые</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всё время</SelectItem>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="week">За неделю</SelectItem>
            <SelectItem value="month">За месяц</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scoreRange} onValueChange={setScoreRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все Score</SelectItem>
            <SelectItem value="high">Высокий (&gt;75)</SelectItem>
            <SelectItem value="mid">Средний (50-75)</SelectItem>
            <SelectItem value="low">Низкий (&lt;50)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={`${sort}:${order}`} onValueChange={(v) => { const [s, o] = v.split(':'); setSort(s); setOrder(o); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Регистрация ↓</SelectItem>
            <SelectItem value="created_at:asc">Регистрация ↑</SelectItem>
            <SelectItem value="last_login_at:desc">Последний вход ↓</SelectItem>
            <SelectItem value="name:asc">Имя А-Я</SelectItem>
            <SelectItem value="name:desc">Имя Я-А</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table — clicking row goes to patient detail */}
      <div className="[&_tr]:cursor-pointer">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/patients/${row.id}`)}
        />
      </div>
    </div>
  );
}
