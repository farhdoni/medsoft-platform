'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Download, Phone, Mail, Users, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type ClinicRequest = {
  id: number;
  clinicName: string;
  contactName: string;
  phone: string;
  email: string | null;
  doctorsCount: string;
  comment: string | null;
  locale: string;
  status: 'new' | 'contacted' | 'demo' | 'converted' | 'rejected';
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  contacted: 'Связались',
  demo: 'Демо',
  converted: 'Клиент',
  rejected: 'Отклонено',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default',
  contacted: 'warning',
  demo: 'secondary',
  converted: 'success',
  rejected: 'destructive',
};

const ALL_STATUSES = ['new', 'contacted', 'demo', 'converted', 'rejected'] as const;

function exportCsv(rows: ClinicRequest[]) {
  const header = 'ID,Клиника,Контакт,Телефон,Email,Врачей,Статус,Дата';
  const lines = rows.map(r =>
    [r.id, `"${r.clinicName}"`, `"${r.contactName}"`, r.phone, r.email ?? '', r.doctorsCount, r.status, r.createdAt].join(','),
  );
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clinic-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClinicRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery<{ data: ClinicRequest[] }>({
    queryKey: ['clinic-requests', statusFilter],
    queryFn: () => api.get(`/v1/admin/content/clinic-requests${statusFilter ? `?status=${statusFilter}` : ''}`),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/v1/admin/content/clinic-requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-requests'] });
      toast.success('Статус обновлён');
    },
    onError: () => toast.error('Не удалось обновить статус'),
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заявки клиник</h1>
          <p className="text-muted-foreground text-sm">Заявки на демо MedSoft с сайта aivita.uz/clinics.html</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => rows.length && exportCsv(rows)}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['clinic-requests'] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('')}
        >
          Все ({rows.length})
        </Button>
        {ALL_STATUSES.map((s) => {
          const cnt = (data?.data ?? []).filter(r => r.status === s).length;
          return (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s]} ({cnt})
            </Button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загружаем заявки...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Заявок пока нет</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиника</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Контакт</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Врачей</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">#{row.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{row.clinicName}</p>
                            {row.comment && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.comment}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.contactName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${row.phone}`} className="hover:text-foreground">{row.phone}</a>
                        </div>
                        {row.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${row.email}`} className="hover:text-foreground">{row.email}</a>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.doctorsCount}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(row.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[row.status] ?? 'secondary'}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="text-xs border rounded px-2 py-1 bg-background"
                          value={row.status}
                          onChange={(e) => updateMutation.mutate({ id: row.id, status: e.target.value })}
                          disabled={updateMutation.isPending}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
