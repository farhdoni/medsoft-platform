'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';

const REPORT_TYPES = [
  { value: 'finance', label: 'Финансовый отчёт' },
  { value: 'users', label: 'Отчёт по пользователям' },
  { value: 'doctors', label: 'Отчёт по врачам' },
  { value: 'full', label: 'Полный отчёт' },
];

export default function ReportsPage() {
  const [type, setType] = useState<'finance' | 'users' | 'doctors' | 'full'>('finance');
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);

  // Auto-report settings
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoEmail, setAutoEmail] = useState('');

  const { data: autoData } = useQuery({
    queryKey: ['auto-report-settings'],
    queryFn: () => api.get<{ settings: Record<string, string> }>('/v1/admin/reports/auto-report'),
  });

  useEffect(() => {
    if (autoData?.settings) {
      setAutoEnabled(autoData.settings.auto_report_enabled === 'true');
      setAutoEmail(autoData.settings.auto_report_email ?? '');
    }
  }, [autoData]);

  const saveAutoMutation = useMutation({
    mutationFn: () => api.put('/v1/admin/reports/auto-report', {
      auto_report_enabled: String(autoEnabled),
      auto_report_email: autoEmail,
    }),
    onSuccess: () => toast.success('Настройки авто-отчёта сохранены'),
    onError: () => toast.error('Ошибка при сохранении'),
  });

  async function handleGenerate() {
    setGenerating(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/v1\/?$/, '');
      const res = await fetch(`${API_BASE}/v1/admin/reports/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, dateFrom, dateTo, format }),
      });

      if (!res.ok) {
        toast.error('Ошибка при генерации отчёта');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (format === 'xlsx') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${dateFrom}_${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Отчёт скачан');
      } else {
        // PDF/HTML — open in new tab to trigger print dialog
        window.open(url, '_blank');
        toast.success('Отчёт открыт для печати');
      }
    } catch {
      toast.error('Ошибка при генерации отчёта');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Отчёты</h1>
        <p className="text-sm text-muted-foreground mt-1">Генерация аналитических отчётов по платформе</p>
      </div>

      {/* Generate form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Сгенерировать отчёт
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Тип отчёта</Label>
              <Select value={type} onValueChange={v => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Формат</Label>
              <Select value={format} onValueChange={v => setFormat(v as typeof format)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel/CSV</SelectItem>
                  <SelectItem value="pdf">PDF (HTML для печати)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>С даты</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>По дату</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
            <p><strong>Excel/CSV:</strong> скачивается файл, совместимый с Microsoft Excel</p>
            <p><strong>PDF:</strong> открывается в новой вкладке, нажмите Ctrl+P для печати/сохранения</p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            {generating ? 'Генерирую...' : 'Скачать отчёт'}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-report settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Автоматические отчёты</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveAutoMutation.mutate()}
            disabled={saveAutoMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveAutoMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            <div>
              <Label>Автоматически отправлять отчёты</Label>
              <p className="text-xs text-muted-foreground">Ежемесячный полный отчёт на указанный email</p>
            </div>
          </div>
          {autoEnabled && (
            <div className="space-y-1.5">
              <Label>Email получателя</Label>
              <Input
                type="email"
                value={autoEmail}
                onChange={e => setAutoEmail(e.target.value)}
                placeholder="reports@example.com"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
