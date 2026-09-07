'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
};

type ListResponse = { data: User[]; total: number; page: number; limit: number };

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function isBlocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'plus') return <Badge variant="default">plus</Badge>;
  if (plan === 'pro') return <Badge variant="warning">pro</Badge>;
  return <Badge variant="secondary">free</Badge>;
}

function StatusBadge({ lockedUntil, blockedText, activeText }: { lockedUntil: string | null; blockedText: string; activeText: string }) {
  if (isBlocked(lockedUntil)) {
    return <Badge variant="destructive">{blockedText}</Badge>;
  }
  return <Badge variant="success">{activeText}</Badge>;
}

export default function DoctorsListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('all');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');

  const debouncedSearch = useDebounce(search, 300);

  const resetPage = useCallback(() => setPage(1), []);
  useEffect(() => { resetPage(); }, [debouncedSearch, verificationStatus, tier, status, resetPage]);

  const queryParams = new URLSearchParams({
    role: 'doctor',
    page: String(page),
    limit: '20',
    ...(debouncedSearch && { q: debouncedSearch }),
    ...(tier !== 'all' && { tier }),
    ...(status !== 'all' && { status }),
    ...(verificationStatus !== 'all' && { verificationStatus }),
  }).toString();

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['admin-users-doctors', queryParams],
    queryFn: () => api.get(`/v1/admin/users?${queryParams}`),
  });

  const columns: ColumnDef<User>[] = [
    {
      id: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'nameEmail',
      header: t.users.nameEmail,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.email ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'plan',
      header: t.users.plan,
      cell: ({ row }) => <PlanBadge plan={row.original.plan} />,
    },
    {
      accessorKey: 'createdAt',
      header: t.users.registeredAt,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
    },
    {
      accessorKey: 'lastLoginAt',
      header: t.users.lastLogin,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastLoginAt)}</span>,
    },
    {
      id: 'status',
      header: t.common.status,
      cell: ({ row }) => <StatusBadge lockedUntil={row.original.lockedUntil} blockedText={t.users.blocked} activeText={t.common.active} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t.nav.doctors}</h1>
        <p className="text-muted-foreground">{t.users.doctorsSubtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.users.searchDoctors}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>

        <Select value={verificationStatus} onValueChange={setVerificationStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="verified">{t.users.filterVerified}</SelectItem>
            <SelectItem value="pending">{t.users.filterPending}</SelectItem>
            <SelectItem value="not_verified">{t.users.filterUnverified}</SelectItem>
            <SelectItem value="rejected">{t.users.filterRejected}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.users.allPlans}</SelectItem>
            <SelectItem value="free">free</SelectItem>
            <SelectItem value="plus">plus</SelectItem>
            <SelectItem value="pro">pro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="active">{t.users.filterActive}</SelectItem>
            <SelectItem value="blocked">{t.users.filterBlocked}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/users/doctors/${row.id}`)}
      />
    </div>
  );
}
