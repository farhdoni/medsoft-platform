'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, downloadFile } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Row = {
  id: number; pharmacyId: number; amount: number; period: string | null;
  bankAccount: string | null; mfo: string | null; inn: string | null;
  status: string; paidAt: string | null; createdAt: string;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  completed: 'success', processing: 'warning', pending: 'secondary',
};

export default function PharmacyPayoutsPage() {
  const { t } = useI18n();
  const STATUS_LABELS: Record<string, string> = {
    completed: t.common.paid, processing: t.common.processing, pending: t.common.pending,
  };
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ pharmacyId: '', amount: '', period: '', bankAccount: '', mfo: '', inn: '' });
  const [downloading, setDownloading] = useState(false);
  const qc = useQueryClient();

  async function handleExport() {
    setDownloading(true);
    try {
      await downloadFile(
        '/v1/admin/payouts/pharmacies/export',
        `pharmacy_payouts_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch {
      toast.error(t.common.exportFailed);
    } finally {
      setDownloading(false);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pharmacy-payouts', page],
    queryFn: () => api.get<{ data: Row[] }>('/v1/admin/payouts/pharmacies'),
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => api.post(`/v1/admin/payouts/pharmacies/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pharmacy-payouts'] }),
  });

  const createPayout = useMutation({
    mutationFn: () => api.post('/v1/admin/payouts/pharmacies/generate', {
      pharmacyId: parseInt(form.pharmacyId),
      amount: parseInt(form.amount),
      period: form.period,
      bankAccount: form.bankAccount || undefined,
      mfo: form.mfo || undefined,
      inn: form.inn || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pharmacy-payouts'] });
      setForm({ pharmacyId: '', amount: '', period: '', bankAccount: '', mfo: '', inn: '' });
    },
  });

  const columns: ColumnDef<Row>[] = [
    { header: t.common.pharmacy, cell: ({ row }) => <span className="text-sm">ID {row.original.pharmacyId}</span> },
    { header: t.common.period, cell: ({ row }) => <span className="text-sm">{row.original.period ?? '—'}</span> },
    { header: t.common.amount, cell: ({ row }) => <span className="font-medium">{formatCurrency(String(row.original.amount))}</span> },
    { header: t.finance.requisites, cell: ({ row }) => (
      <div className="text-xs">
        {row.original.bankAccount && <p className="font-mono">{row.original.bankAccount}</p>}
        {row.original.mfo && <p className="text-muted-foreground">{t.finance.mfo}: {row.original.mfo}</p>}
        {row.original.inn && <p className="text-muted-foreground">{t.finance.inn}: {row.original.inn}</p>}
      </div>
    )},
    { header: t.common.status, cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'}>
        {STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    )},
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'pending' ? (
      <Button
        size="sm" variant="outline" className="text-xs h-7"
        onClick={() => markPaid.mutate(row.original.id)}
        disabled={markPaid.isPending}
      >
        {t.common.paid}
      </Button>
    ) : null },
  ];

  return (
    <div className="space-y-4">
      {/* Create payout + export */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <p className="text-sm font-semibold">{t.finance.createPayoutPharm}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Input placeholder={t.finance.pharmacyId} value={form.pharmacyId} onChange={e => setForm(f => ({ ...f, pharmacyId: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder={t.finance.amountSum} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder={t.finance.periodHintPharm} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder={t.finance.bankAccount} value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder={t.finance.mfo} value={form.mfo} onChange={e => setForm(f => ({ ...f, mfo: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder={t.finance.inn} value={form.inn} onChange={e => setForm(f => ({ ...f, inn: e.target.value }))} className="h-8 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => createPayout.mutate()}
            disabled={createPayout.isPending || !form.pharmacyId || !form.amount || !form.period}
          >
            {t.finance.createPayout}
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={handleExport} disabled={downloading}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloading ? t.common.exporting : 'CSV'}
          </Button>
        </div>
      </div>

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
