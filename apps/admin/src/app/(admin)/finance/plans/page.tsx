'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type Plan = {
  id: number; name: string; slug: string; price: number;
  period: string; targetRole: string; features: string[]; isActive: boolean;
};

const PERIOD_LABELS: Record<string, string> = { monthly: 'Месяц', annual: 'Год', one_time: 'Разовый' };
const ROLE_LABELS: Record<string, string> = { patient: 'Пациент', doctor: 'Врач', clinic: 'Клиника', pharmacy: 'Аптека' };

export default function PlansPage() {
  const [editing, setEditing] = useState<{ id: number; price: string; name: string } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<{ data: Plan[] }>('/v1/admin/finance/plans'),
  });

  const update = useMutation({
    mutationFn: ({ id, price, name }: { id: number; price: number; name: string }) =>
      api.patch(`/v1/admin/finance/plans/${id}`, { price, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditing(null);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/v1/admin/finance/plans/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  });

  const roleOrder = ['patient', 'doctor', 'clinic', 'pharmacy'];
  const grouped = roleOrder.map(role => ({
    role,
    plans: (data?.data ?? []).filter(p => p.targetRole === role),
  })).filter(g => g.plans.length > 0);

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-6">
      {grouped.map(group => (
        <div key={group.role}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {ROLE_LABELS[group.role] ?? group.role}
          </h3>
          <div className="rounded-xl border divide-y bg-card">
            {group.plans.map(plan => (
              <div key={plan.id} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  {editing?.id === plan.id ? (
                    <Input
                      value={editing.name}
                      onChange={e => setEditing(ed => ed ? { ...ed, name: e.target.value } : ed)}
                      className="h-7 text-sm max-w-48"
                    />
                  ) : (
                    <p className="text-sm font-semibold">{plan.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">{plan.slug}</p>
                </div>

                <div className="text-center min-w-[120px]">
                  {editing?.id === plan.id ? (
                    <Input
                      value={editing.price}
                      onChange={e => setEditing(ed => ed ? { ...ed, price: e.target.value } : ed)}
                      className="h-7 text-sm w-28 text-center"
                    />
                  ) : (
                    <>
                      <p className="text-sm font-bold">{formatCurrency(String(plan.price))}</p>
                      <p className="text-xs text-muted-foreground">{PERIOD_LABELS[plan.period] ?? plan.period}</p>
                    </>
                  )}
                </div>

                <Badge variant={plan.isActive ? 'success' : 'secondary'} className="min-w-16 justify-center">
                  {plan.isActive ? 'Активен' : 'Откл'}
                </Badge>

                <div className="flex items-center gap-1">
                  {editing?.id === plan.id ? (
                    <>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => update.mutate({ id: plan.id, price: parseInt(editing.price), name: editing.name })}
                        disabled={update.isPending}
                      >
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setEditing({ id: plan.id, price: String(plan.price), name: plan.name })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => toggle.mutate({ id: plan.id, isActive: !plan.isActive })}
                      >
                        {plan.isActive ? 'Откл' : 'Вкл'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
