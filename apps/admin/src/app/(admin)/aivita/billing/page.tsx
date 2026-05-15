'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Pencil, DollarSign, Users, CreditCard } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type Plan = {
  id: number;
  name: string;
  slug: string;
  price: number;
  period: string;
  targetRole: string;
  features: string[];
  isActive: boolean;
  createdAt: string;
};

type Subscription = {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  planId: number;
  planName: string;
  planPrice: number;
  status: string;
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
};

type BillingStats = {
  totalRevenue: number;
  monthRevenue: number;
  activeSubscriptions: number;
};

type PlanForm = {
  name: string;
  slug: string;
  price: string;
  period: string;
  targetRole: string;
  features: string;
};

const emptyPlanForm: PlanForm = {
  name: '', slug: '', price: '', period: 'monthly', targetRole: 'patient', features: '',
};

const SUB_STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success', expired: 'secondary', cancelled: 'destructive', past_due: 'warning',
};

export default function BillingPage() {
  const qc = useQueryClient();
  const [subPage, setSubPage] = useState(1);
  const [subStatus, setSubStatus] = useState('');
  const [planDialog, setPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyPlanForm);

  const { data: stats } = useQuery<{ data: BillingStats }>({
    queryKey: ['billing-stats'],
    queryFn: () => api.get('/v1/aivita-admin/billing/stats'),
  });

  const { data: plans, isLoading: plansLoading } = useQuery<{ data: Plan[] }>({
    queryKey: ['billing-plans'],
    queryFn: () => api.get('/v1/aivita-admin/billing/plans'),
  });

  const { data: subs, isLoading: subsLoading } = useQuery({
    queryKey: ['billing-subscriptions', subPage, subStatus],
    queryFn: () => api.get<{ data: Subscription[]; total: number }>(
      `/v1/aivita-admin/billing/subscriptions?page=${subPage}${subStatus ? `&status=${subStatus}` : ''}`
    ),
  });

  const createPlanMutation = useMutation({
    mutationFn: (body: object) => api.post('/v1/aivita-admin/billing/plans', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-plans'] }); toast.success('Тариф создан'); setPlanDialog(false); },
    onError: () => toast.error('Ошибка'),
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/v1/aivita-admin/billing/plans/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billing-plans'] }); toast.success('Тариф обновлён'); setPlanDialog(false); },
    onError: () => toast.error('Ошибка'),
  });

  function openCreate() {
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setPlanDialog(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: String(plan.price),
      period: plan.period,
      targetRole: plan.targetRole,
      features: plan.features?.join('\n') ?? '',
    });
    setPlanDialog(true);
  }

  function handleSave() {
    const payload = {
      name: form.name,
      slug: form.slug,
      price: Number(form.price),
      period: form.period,
      targetRole: form.targetRole,
      features: form.features.split('\n').map(s => s.trim()).filter(Boolean),
    };
    if (editingPlan) updatePlanMutation.mutate({ id: editingPlan.id, body: payload });
    else createPlanMutation.mutate(payload);
  }

  const subColumns: ColumnDef<Subscription>[] = [
    {
      header: 'Пользователь',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.userName}</p>
          <p className="text-xs text-muted-foreground">{row.original.userEmail}</p>
        </div>
      ),
    },
    {
      header: 'Тариф',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.planName}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(row.original.planPrice)}/мес</p>
        </div>
      ),
    },
    {
      accessorKey: 'status', header: 'Статус',
      cell: ({ row }) => <Badge variant={SUB_STATUS_COLORS[row.original.status] ?? 'outline'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'startedAt', header: 'Начало', cell: ({ row }) => formatDate(row.original.startedAt) },
    { accessorKey: 'expiresAt', header: 'Истекает', cell: ({ row }) => formatDate(row.original.expiresAt) },
    {
      header: 'Авто-продление',
      cell: ({ row }) => (
        <Badge variant={row.original.autoRenew ? 'success' : 'secondary'}>
          {row.original.autoRenew ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Биллинг</h1>
        <p className="text-muted-foreground">Тарифы, подписки и выручка</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Выручка за месяц</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats?.data.monthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Всего выручки</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats?.data.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Активных подписок</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.data.activeSubscriptions ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Тарифные планы</h2>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Новый тариф</Button>
        </div>
        {plansLoading ? (
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(plans?.data ?? []).map(plan => (
              <Card key={plan.id} className={plan.isActive ? '' : 'opacity-50'}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.slug} · {plan.targetRole}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={plan.isActive ? 'success' : 'secondary'} className="text-xs">
                        {plan.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(plan.price)}</p>
                  <p className="text-xs text-muted-foreground">{plan.period}</p>
                  {plan.features?.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Подписки пользователей</h2>
          <Select value={subStatus || 'all'} onValueChange={v => { setSubStatus(v === 'all' ? '' : v); setSubPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Все статусы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="expired">Истекшие</SelectItem>
              <SelectItem value="cancelled">Отменённые</SelectItem>
              <SelectItem value="past_due">Просроченные</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={subColumns}
          data={subs?.data ?? []}
          total={subs?.total ?? 0}
          page={subPage}
          pageSize={25}
          onPageChange={setSubPage}
          isLoading={subsLoading}
        />
      </div>

      {/* Plan dialog */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Редактировать тариф' : 'Новый тарифный план'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { label: 'Название', key: 'name' as const, placeholder: 'Базовый / Про / Премиум' },
              { label: 'Slug', key: 'slug' as const, placeholder: 'basic / pro / premium' },
              { label: 'Цена (сум)', key: 'price' as const, placeholder: '49900', type: 'number' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Период</Label>
                <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Ежемесячно</SelectItem>
                    <SelectItem value="annual">Ежегодно</SelectItem>
                    <SelectItem value="one_time">Разово</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Для кого</Label>
                <Select value={form.targetRole} onValueChange={v => setForm(f => ({ ...f, targetRole: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Пациент</SelectItem>
                    <SelectItem value="doctor">Врач</SelectItem>
                    <SelectItem value="clinic">Клиника</SelectItem>
                    <SelectItem value="pharmacy">Аптека</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Возможности (каждая с новой строки)</Label>
              <textarea
                className="w-full h-24 text-sm border rounded-md px-3 py-2 bg-background resize-none outline-none focus:ring-2 focus:ring-ring"
                value={form.features}
                onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                placeholder={'Неограниченные консультации\nAI-ассистент\nПриоритетная поддержка'}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!form.name || !form.slug || !form.price || createPlanMutation.isPending || updatePlanMutation.isPending}
            >
              {editingPlan ? 'Сохранить изменения' : 'Создать тариф'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
