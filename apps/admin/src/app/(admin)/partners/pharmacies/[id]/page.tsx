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
      toast.success('Данные обновлены');
    },
    onError: () => toast.error('Ошибка'),
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

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Загрузка...</div>;
  if (!data) return <div className="p-8 text-destructive text-sm">Аптека не найдена</div>;

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
                {pharmacy.status === 'active' ? 'Активна' : 'Неактивна'}
              </Badge>
              {pharmacy.inn && (
                <span className="text-xs text-muted-foreground font-mono">ИНН: {pharmacy.inn}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Редактировать
          </Button>
          <Button
            variant={pharmacy.status === 'active' ? 'destructive' : 'default'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={updateMutation.isPending}
          >
            <PowerOff className="h-3.5 w-3.5 mr-2" />
            {pharmacy.status === 'active' ? 'Деактивировать' : 'Активировать'}
          </Button>
        </div>
      </div>

      {/* KPI cards (30d) */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">Статистика за последние 30 дней</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard title="Заказов" value={ordersCount.toLocaleString('ru-RU')} />
          <KpiCard title="Выручка" value={formatCurrency(revenue)} />
          <KpiCard title="Комиссия AIVITA" value={formatCurrency(commission)} />
          <KpiCard title="Средний чек" value={formatCurrency(avgCheck)} />
        </div>
      </div>

      {/* Profile info */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Профиль</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Юридическое лицо', value: pharmacy.legalName },
              { label: 'ИНН', value: pharmacy.inn },
              { label: 'Email', value: pharmacy.email },
              { label: 'Телефон', value: pharmacy.phone },
              { label: 'Комиссия', value: pharmacy.commissionPercent ? `${pharmacy.commissionPercent}%` : null },
              { label: 'Дата подключения', value: pharmacy.createdAt ? formatDate(pharmacy.createdAt) : null },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Заказы по статусам (30 дней)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {Object.keys(data.byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет заказов за период</p>
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
            <DialogTitle>Редактировать аптеку</DialogTitle>
            <DialogDescription>{pharmacy.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Комиссия %</Label>
              <Input
                type="number" min={0} max={50} step={0.5}
                value={editForm.commissionPercent}
                onChange={e => setEditForm(f => ({ ...f, commissionPercent: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Тариф</Label>
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button
              onClick={() => updateMutation.mutate({
                commissionPercent: parseFloat(editForm.commissionPercent) || 10,
                tier: editForm.tier,
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
