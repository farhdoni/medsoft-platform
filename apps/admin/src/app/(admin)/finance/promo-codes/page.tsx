'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type PromoCode = {
  id: number; code: string; discountType: string; discountValue: number;
  maxUses: number | null; usedCount: number; validUntil: string | null;
  planSlugs: string[] | null; isActive: boolean; createdAt: string;
};

export default function PromoCodesPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    code: '', discountType: 'percent', discountValue: '', maxUses: '', validUntil: '', planSlugs: '',
  });
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promos'],
    queryFn: () => api.get<{ data: PromoCode[] }>('/v1/admin/finance/promo-codes'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/v1/admin/finance/promo-codes', {
      code: form.code.toUpperCase(),
      discountType: form.discountType,
      discountValue: parseInt(form.discountValue),
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      validUntil: form.validUntil || undefined,
      planSlugs: form.planSlugs ? form.planSlugs.split(',').map(s => s.trim()) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promos'] });
      setForm({ code: '', discountType: 'percent', discountValue: '', maxUses: '', validUntil: '', planSlugs: '' });
      setShowForm(false);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/v1/admin/finance/promo-codes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });

  const columns: ColumnDef<PromoCode>[] = [
    { accessorKey: 'code', header: t.finance.code, cell: ({ row }) => <code className="text-sm font-bold">{row.original.code}</code> },
    { header: t.finance.discount, cell: ({ row }) => (
      <span className="font-medium">
        {row.original.discountValue}{row.original.discountType === 'percent' ? '%' : t.finance.sumSuffix}
      </span>
    )},
    { header: t.finance.uses, cell: ({ row }) => (
      <span className="text-sm">
        {row.original.usedCount}{row.original.maxUses ? ` / ${row.original.maxUses}` : ''}
      </span>
    )},
    { header: t.finance.validUntil, cell: ({ row }) => row.original.validUntil ? <span className="text-xs">{formatDate(row.original.validUntil)}</span> : <span className="text-xs text-muted-foreground">{t.finance.unlimited}</span> },
    { header: t.finance.tabPlans, cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.original.planSlugs?.join(', ') || t.common.all}</span>
    )},
    { header: t.common.status, cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
        {row.original.isActive ? t.common.active : t.finance.disabled}
      </Badge>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button
        size="sm" variant="outline" className="text-xs h-7"
        onClick={() => toggle.mutate({ id: row.original.id, isActive: !row.original.isActive })}
      >
        {row.original.isActive ? t.common.disable : t.common.enable}
      </Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? t.common.cancel : t.finance.createPromo}
        </Button>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <p className="text-sm font-semibold">{t.finance.newPromo}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Input placeholder={t.finance.codeHint} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="h-8 text-sm" />
            <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{t.finance.percent}</SelectItem>
                <SelectItem value="fixed">{t.finance.fixedSum}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t.finance.discountValue} value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder={t.finance.maxUses} value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className="h-8 text-sm" />
            <Input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder={t.finance.plansSlugHint} value={form.planSlugs} onChange={e => setForm(f => ({ ...f, planSlugs: e.target.value }))} className="h-8 text-sm" />
          </div>
          <Button
            size="sm" onClick={() => create.mutate()}
            disabled={create.isPending || !form.code || !form.discountValue}
          >
            {t.common.create}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.data?.length ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
