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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api, downloadFile } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Row = {
  payment: {
    id: number; type: string; status: string; provider: string | null;
    amount: number; currency: string; createdAt: string; completedAt: string | null;
    providerTransactionId: string | null; metadata: Record<string, unknown> | null;
  };
  userName: string | null;
  userEmail: string | null;
};

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  completed: 'success', failed: 'destructive', pending: 'warning', refunded: 'secondary', processing: 'warning',
};
const PROVIDER_LABELS: Record<string, string> = { click: 'Click', payme: 'Payme', uzum: 'Uzum' };

export default function PaymentsPage() {
  const { t } = useI18n();
  const STATUS_LABELS: Record<string, string> = {
    completed: t.finance.statusCompleted, failed: t.common.error, pending: t.common.pending,
    refunded: t.finance.refund, processing: t.finance.statusProcessing,
  };
  const TYPE_LABELS: Record<string, string> = {
    subscription: t.finance.payTypeSub, consultation: t.finance.payTypeConsult,
    pharmacy_order: t.common.pharmacy, booking: t.finance.payTypeBooking,
  };
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', provider: '', type: '', dateFrom: '', dateTo: '' });
  const [selectedPayment, setSelectedPayment] = useState<Row | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [downloading, setDownloading] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filters.status) params.set('status', filters.status);
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.type) params.set('type', filters.type);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return api.get<{ data: Row[]; total: number }>(`/v1/admin/finance/payments?${params}`);
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/v1/admin/finance/payments/${id}/refund`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      setRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundReason('');
      toast.success(t.finance.refundDone);
    },
    onError: () => toast.error(t.finance.refundFailed),
  });

  async function handleExport() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.status) params.set('status', filters.status);
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.type) params.set('type', filters.type);
      await downloadFile(
        `/v1/admin/finance/payments/export?${params}`,
        `payments_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch {
      toast.error(t.common.exportFailed);
    } finally {
      setDownloading(false);
    }
  }

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: 'payment.id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">#{row.original.payment.id}</span>
      ),
    },
    {
      header: t.common.user,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.userName ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.userEmail ?? ''}</p>
        </div>
      ),
    },
    {
      header: t.common.type,
      cell: ({ row }) => (
        <Badge variant="secondary">{TYPE_LABELS[row.original.payment.type] ?? row.original.payment.type}</Badge>
      ),
    },
    {
      header: t.common.status,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.payment.status] ?? 'secondary'}>
          {STATUS_LABELS[row.original.payment.status] ?? row.original.payment.status}
        </Badge>
      ),
    },
    {
      header: t.common.provider,
      cell: ({ row }) => row.original.payment.provider
        ? PROVIDER_LABELS[row.original.payment.provider] ?? row.original.payment.provider
        : '—',
    },
    {
      header: t.common.amount,
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.payment.amount)}</span>
      ),
    },
    {
      header: t.common.date,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.payment.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.payment.status === 'completed' ? (
        <Button
          size="sm" variant="outline" className="text-xs h-7"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPayment(row.original);
            setRefundReason('');
            setRefundDialogOpen(true);
          }}
        >
          {t.finance.refund}
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters + export */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder={t.common.status} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.finance.allStatuses}</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.provider || 'all'} onValueChange={v => setFilters(f => ({ ...f, provider: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={t.common.provider} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="click">Click</SelectItem>
            <SelectItem value="payme">Payme</SelectItem>
            <SelectItem value="uzum">Uzum</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.type || 'all'} onValueChange={v => setFilters(f => ({ ...f, type: v === 'all' ? '' : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder={t.common.type} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.finance.allTypes}</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="h-8 text-xs w-36"
          value={filters.dateFrom}
          onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
          placeholder={t.finance.dateFrom}
        />
        <Input
          type="date"
          className="h-8 text-xs w-36"
          value={filters.dateTo}
          onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
          placeholder={t.finance.dateTo}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={downloading}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {downloading ? t.common.exporting : 'CSV'}
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

      {/* Refund dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.finance.refundIssue}</DialogTitle>
            <DialogDescription>
              Платёж #{selectedPayment?.payment.id} на сумму{' '}
              <strong>{formatCurrency(selectedPayment?.payment.amount ?? 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">{t.finance.refundReason}</label>
            <Input
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder={t.finance.refundReasonHint}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>{t.common.cancel}</Button>
            <Button
              variant="destructive"
              disabled={refundMutation.isPending}
              onClick={() => selectedPayment && refundMutation.mutate({
                id: selectedPayment.payment.id,
                reason: refundReason,
              })}
            >
              {refundMutation.isPending ? t.finance.refunding : t.finance.refundConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
