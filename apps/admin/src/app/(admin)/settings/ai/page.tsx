'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type AiSettings = {
  ai_provider: string;
  ai_model: string;
  ai_system_prompt_chat: string;
  ai_system_prompt_checkup: string;
  ai_system_prompt_scribe: string;
  ai_max_tokens: string;
  ai_temperature: string;
  ai_daily_limit_per_user: string;
  ai_monthly_limit_per_user: string;
};

type UsageSummary = {
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    avgResponseMs: number;
  };
  byModule: Array<{ module: string; requests: number; inputTokens: number; outputTokens: number }>;
  byModel: Array<{ model: string; requests: number; inputTokens: number; outputTokens: number }>;
};

type LogRow = {
  id: number;
  userId: number | null;
  module: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: string | null;
  responseTimeMs: number | null;
  createdAt: string;
};

const MODULE_LABELS: Record<string, string> = {
  chat: 'Чат', checkup: 'Чекап', scribe: 'Скрайб',
  symptom: 'Симптомы', report: 'Отчёт',
};

const DEFAULT_SETTINGS: AiSettings = {
  ai_provider: 'anthropic',
  ai_model: 'claude-haiku-4-5-20251001',
  ai_system_prompt_chat: '',
  ai_system_prompt_checkup: '',
  ai_system_prompt_scribe: '',
  ai_max_tokens: '2048',
  ai_temperature: '0.7',
  ai_daily_limit_per_user: '50',
  ai_monthly_limit_per_user: '500',
};

export default function AiSettingsPage() {
  const [logsPage, setLogsPage] = useState(1);
  const [activePrompt, setActivePrompt] = useState<'chat' | 'checkup' | 'scribe'>('chat');
  const [form, setForm] = useState<AiSettings>(DEFAULT_SETTINGS);
  const qc = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: () => api.get<{ settings: Partial<AiSettings> }>('/v1/admin/settings/ai'),
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setForm(prev => ({ ...prev, ...settingsData.settings }));
    }
  }, [settingsData]);

  const { data: summary } = useQuery<UsageSummary>({
    queryKey: ['admin-ai-summary'],
    queryFn: () => api.get<UsageSummary>('/v1/admin/ai/usage-summary'),
    staleTime: 60000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-ai-logs', logsPage],
    queryFn: () => api.get<{ data: LogRow[]; total: number }>(`/v1/admin/ai/logs?page=${logsPage}&limit=50`),
  });

  const saveMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => api.put('/v1/admin/settings/ai', settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      toast.success('Настройки сохранены');
    },
    onError: () => toast.error('Ошибка при сохранении'),
  });

  function handleSave() {
    saveMutation.mutate(form as unknown as Record<string, string>);
  }

  const logColumns: ColumnDef<LogRow>[] = [
    {
      header: 'Модуль',
      cell: ({ row }) => <Badge variant="secondary">{MODULE_LABELS[row.original.module] ?? row.original.module}</Badge>,
    },
    {
      header: 'Модель',
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.model}</span>,
    },
    {
      header: 'Токены (вх/вых)',
      cell: ({ row }) => (
        <span className="text-xs font-mono">
          {row.original.inputTokens} / {row.original.outputTokens}
        </span>
      ),
    },
    {
      header: 'Стоимость',
      cell: ({ row }) => (
        <span className="text-xs font-mono">${Number(row.original.costUsd ?? 0).toFixed(6)}</span>
      ),
    },
    {
      header: 'Время (ms)',
      cell: ({ row }) => <span className="text-xs">{row.original.responseTimeMs ?? '—'}</span>,
    },
    {
      header: 'Дата',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">AI Настройки</h1>
        <p className="text-muted-foreground text-sm">Управление AI провайдером, промптами и лимитами</p>
      </div>

      {/* Usage summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Запросов (месяц)', value: String(summary.totals.requests) },
            { label: 'Вх. токены', value: String(summary.totals.inputTokens.toLocaleString()) },
            { label: 'Вых. токены', value: String(summary.totals.outputTokens.toLocaleString()) },
            { label: 'Стоимость (USD)', value: `$${summary.totals.costUsd.toFixed(4)}` },
            { label: 'Среднее время', value: `${summary.totals.avgResponseMs} ms` },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-base font-bold mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Provider config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Провайдер</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Провайдер AI</Label>
              <Select value={form.ai_provider} onValueChange={v => setForm(f => ({ ...f, ai_provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="ollama">Ollama (локальный)</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Модель</Label>
              <Select value={form.ai_model} onValueChange={v => setForm(f => ({ ...f, ai_model: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5</SelectItem>
                  <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectItem>
                  <SelectItem value="claude-opus-4-7">Claude Opus 4.7</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Max tokens</Label>
              <Input
                type="number"
                value={form.ai_max_tokens}
                onChange={e => setForm(f => ({ ...f, ai_max_tokens: e.target.value }))}
                min={256} max={8192}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Temperature (0–1)</Label>
              <Input
                type="number"
                value={form.ai_temperature}
                onChange={e => setForm(f => ({ ...f, ai_temperature: e.target.value }))}
                min={0} max={1} step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Лимиты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Запросов / день (пользователь)</Label>
              <Input
                type="number"
                value={form.ai_daily_limit_per_user}
                onChange={e => setForm(f => ({ ...f, ai_daily_limit_per_user: e.target.value }))}
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Запросов / месяц (пользователь)</Label>
              <Input
                type="number"
                value={form.ai_monthly_limit_per_user}
                onChange={e => setForm(f => ({ ...f, ai_monthly_limit_per_user: e.target.value }))}
                min={1}
              />
            </div>

            {/* Usage by module */}
            {summary?.byModule && summary.byModule.length > 0 && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">По модулям (месяц)</p>
                {summary.byModule.map(m => (
                  <div key={m.module} className="flex justify-between text-xs">
                    <span>{MODULE_LABELS[m.module] ?? m.module}</span>
                    <span className="font-medium">{m.requests} запр.</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System prompts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Системные промпты</CardTitle>
              <div className="flex gap-1">
                {(['chat', 'checkup', 'scribe'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActivePrompt(t)}
                    className={`text-xs px-2 py-1 rounded ${activePrompt === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              className="text-xs font-mono resize-none"
              rows={12}
              placeholder={`Системный промпт для ${activePrompt}...`}
              value={form[`ai_system_prompt_${activePrompt}` as keyof AiSettings]}
              onChange={e => setForm(f => ({ ...f, [`ai_system_prompt_${activePrompt}`]: e.target.value }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>

      {/* AI usage logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Логи AI запросов</CardTitle>
            <Button
              size="sm" variant="ghost"
              onClick={() => qc.invalidateQueries({ queryKey: ['admin-ai-logs'] })}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={logColumns}
            data={logsData?.data ?? []}
            total={logsData?.total ?? 0}
            page={logsPage}
            pageSize={50}
            onPageChange={setLogsPage}
            isLoading={logsLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
