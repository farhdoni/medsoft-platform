'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Pharmacy = {
  id: number; name: string; legalName: string | null; inn: string | null;
  phone: string | null; email: string | null; description: string | null;
  logoUrl: string | null; commissionPercent: string | null;
  status: string | null; tier: string | null; createdAt: string;
};

type Stats = {
  pharmacy: Pharmacy;
  period: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  avgCheck: number;
  byStatus: Record<string, number>;
};

const TIER_LABELS: Record<string, string> = { starter: 'Starter', business: 'Business', network: 'Network' };
const TIER_VARIANTS: Record<string, 'secondary' | 'success' | 'default'> = {
  starter: 'secondary', business: 'success', network: 'default',
};

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function PharmacyDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = parseInt(params?.id ?? '0', 10);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ commissionPercent: '', tier: '', status: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-stats', id],
    queryFn: () => api.get<Stats>(`/v1/admin/pharmacies/${id}/stats`),
    enabled: !isNaN(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put(`/v1/admin/pharmacies/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy-stats', id] });
      qc.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      setEditOpen(false);
      toast.success(t.partners.dataUpdated);
    },
    onError: () => toast.error(t.common.error),
  });

  function openEdit() {
    if (!data?.pharmacy) return;
    setEditForm({
      commissionPercent: data.pharmacy.commissionPercent ?? '10',
      tier: data.pharmacy.tier ?? 'starter',
      status: data.pharmacy.status ?? 'active',
    });
    setEditOpen(true);
  }

  function handleToggleStatus() {
    if (!data?.pharmacy) return;
    const newStatus = data.pharmacy.status === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({ status: newStatus });
  }

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">{t.common.loading}</div>;
  if (!data) return <div className="p-8 text-destructive text-sm">{t.partners.notFound}</div>;

  const { pharmacy, ordersCount, revenue, commission, avgCheck } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{pharmacy.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={TIER_VARIANTS[pharmacy.tier ?? 'starter'] ?? 'secondary'}>
                {TIER_LABELS[pharmacy.tier ?? 'starter']}
              </Badge>
              <Badge variant={pharmacy.status === 'active' ? 'success' : 'secondary'}>
                {pharmacy.status === 'active' ? t.partners.active : t.partners.inactive}
              </Badge>
              {pharmacy.inn && (
                <span className="text-xs text-muted-foreground font-mono">{t.partners.inn}: {pharmacy.inn}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            {t.partners.edit}
          </Button>
          <Button
            variant={pharmacy.status === 'active' ? 'destructive' : 'default'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={updateMutation.isPending}
          >
            <PowerOff className="h-3.5 w-3.5 mr-2" />
            {pharmacy.status === 'active' ? t.partners.deactivate : t.partners.activate}
          </Button>
        </div>
      </div>

      {/* KPI cards (30d) */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">{t.partners.stats30}</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard title={t.partners.orders} value={ordersCount.toLocaleString('ru-RU')} />
          <KpiCard title={t.partners.revenue} value={formatCurrency(revenue)} />
          <KpiCard title={t.partners.commissionAivita} value={formatCurrency(commission)} />
          <KpiCard title={t.partners.avgCheck} value={formatCurrency(avgCheck)} />
        </div>
      </div>

      {/* Profile info */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.partners.profile}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { k: 'legalName', label: t.partners.legalName, value: pharmacy.legalName },
              { k: 'inn', label: t.partners.inn, value: pharmacy.inn },
              { k: 'email', label: 'Email', value: pharmacy.email },
              { k: 'phone', label: t.partners.phone, value: pharmacy.phone },
              { k: 'commission', label: t.partners.commission, value: pharmacy.commissionPercent ? `${pharmacy.commissionPercent}%` : null },
              { k: 'createdAt', label: t.partners.connectedAt, value: pharmacy.createdAt ? formatDate(pharmacy.createdAt) : null },
            ].map(({ k, label, value }) => (
              <div key={k} className="flex justify-between items-center py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.partners.ordersByStatus}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {Object.keys(data.byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.partners.noOrders}</p>
            ) : (
              Object.entries(data.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center py-1">
                  <Badge variant="secondary">{status}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))
            )}
            {pharmacy.description && (
              <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">{pharmacy.description}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.partners.editPharmacy}</DialogTitle>
            <DialogDescription>{pharmacy.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t.partners.commissionPct}</Label>
              <Input
                type="number" min={0} max={50} step={0.5}
                value={editForm.commissionPercent}
                onChange={e => setEditForm(f => ({ ...f, commissionPercent: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.partners.tier}</Label>
              <Select value={editForm.tier} onValueChange={v => setEditForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t.common.cancel}</Button>
            <Button
              onClick={() => updateMutation.mutate({
                commissionPercent: parseFloat(editForm.commissionPercent) || 10,
                tier: editForm.tier,
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t.settings.savingShort : t.settings.saveShort}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
