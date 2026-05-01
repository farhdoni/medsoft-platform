'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Cpu, MemoryStick, HardDrive, RefreshCw, Circle,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, Server,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemData = {
  cpu: { usagePercent: number };
  memory: { totalMb: number; usedMb: number; availableMb: number; usagePercent: number };
  disk: { totalGb: number; usedGb: number; availableGb: number; usagePercent: number };
  timestamp: string;
};

type Container = {
  id: string; name: string; image: string; status: string;
  state: string; createdAt: string; ports: string;
  cpuPercent: number; memPercent: number;
};

type HealthCheck = { name: string; healthy: boolean; statusCode?: number; latencyMs: number; error?: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctColor(pct: number) {
  if (pct >= 80) return 'text-red-500';
  if (pct >= 50) return 'text-yellow-500';
  return 'text-green-600';
}

function pctBg(pct: number) {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function StatCard({ label, icon: Icon, pct, detail }: {
  label: string; icon: React.ElementType; pct: number; detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-3xl font-bold ${pctColor(pct)}`}>{pct}%</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${pctBg(pct)} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ALLOWED_CONTAINERS = ['aivita', 'admin', 'api', 'postgres', 'redis', 'nginx', 'caddy'];

export default function MonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedContainer, setExpandedContainer] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState(ALLOWED_CONTAINERS[0]);
  const [logLines, setLogLines] = useState('100');
  const [logSearch, setLogSearch] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [fetchLogs, setFetchLogs] = useState(false);

  const refetchInterval = autoRefresh ? 10_000 : false;

  const { data: system, dataUpdatedAt } = useQuery<SystemData>({
    queryKey: ['monitoring-system'],
    queryFn: () => api.get('/v1/admin/monitoring/system'),
    refetchInterval,
  });

  const { data: containersData } = useQuery<{ containers: Container[] }>({
    queryKey: ['monitoring-containers'],
    queryFn: () => api.get('/v1/admin/monitoring/containers'),
    refetchInterval,
  });

  const { data: healthData } = useQuery<{ checks: HealthCheck[]; allHealthy: boolean }>({
    queryKey: ['monitoring-health'],
    queryFn: () => api.get('/v1/admin/monitoring/health'),
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const { data: logsData, isFetching: logsFetching, refetch: refetchLogs } = useQuery<{ logs: string; error?: string }>({
    queryKey: ['monitoring-logs', selectedContainer, logLines],
    queryFn: () => api.get(`/v1/admin/monitoring/logs/${selectedContainer}?lines=${logLines}`),
    enabled: fetchLogs,
    staleTime: 0,
  });

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsData?.logs) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsData?.logs]);

  const filteredLogs = useCallback(() => {
    if (!logsData?.logs) return [];
    const lines = logsData.logs.split('\n');
    if (!logSearch) return lines;
    return lines.filter((l) => l.toLowerCase().includes(logSearch.toLowerCase()));
  }, [logsData?.logs, logSearch]);

  function logLineClass(line: string) {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('err ') || lower.includes('fatal') || lower.includes('panic')) {
      return 'text-red-400';
    }
    if (lower.includes('warn') || lower.includes('warning')) return 'text-yellow-400';
    if (lower.includes('info')) return 'text-green-400';
    return 'text-muted-foreground';
  }

  const updatedStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('ru-RU')
    : '—';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" /> Мониторинг сервера
          </h1>
          <p className="text-sm text-muted-foreground">Обновлено: {updatedStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline" size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className={autoRefresh ? 'text-green-600 border-green-200' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {autoRefresh ? 'Auto-refresh вкл' : 'Auto-refresh выкл'}
          </Button>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="CPU"
          icon={Cpu}
          pct={system?.cpu.usagePercent ?? 0}
          detail={`${system?.cpu.usagePercent ?? 0}% использования`}
        />
        <StatCard
          label="RAM"
          icon={MemoryStick}
          pct={system?.memory.usagePercent ?? 0}
          detail={system
            ? `${system.memory.usedMb.toLocaleString()} / ${system.memory.totalMb.toLocaleString()} MB`
            : '—'}
        />
        <StatCard
          label="Диск"
          icon={HardDrive}
          pct={system?.disk.usagePercent ?? 0}
          detail={system
            ? `${system.disk.usedGb} / ${system.disk.totalGb} GB`
            : '—'}
        />
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {healthData?.allHealthy
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : <XCircle className="h-4 w-4 text-red-500" />}
            Доступность сервисов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(healthData?.checks ?? []).map((ch) => (
              <div key={ch.name} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm">
                <div className="flex items-center gap-2">
                  {ch.healthy
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  <span className="font-medium">{ch.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {ch.statusCode ? `${ch.statusCode} · ` : ''}{ch.latencyMs}мс
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Containers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Контейнеры Docker</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {['Имя', 'Статус', 'CPU%', 'RAM%', 'Образ'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(containersData?.containers ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">
                    Docker не доступен или нет запущенных контейнеров
                  </td></tr>
                ) : (containersData?.containers ?? []).map((ct) => (
                  <>
                    <tr
                      key={ct.id}
                      className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedContainer(expandedContainer === ct.id ? null : ct.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {expandedContainer === ct.id
                            ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="font-medium font-mono text-xs">{ct.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ct.state === 'running' ? 'success' : 'destructive'} className="text-[10px]">
                          <Circle className="h-2 w-2 mr-1 fill-current" />
                          {ct.state}
                        </Badge>
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-mono ${pctColor(ct.cpuPercent)}`}>
                        {ct.cpuPercent.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-mono ${pctColor(ct.memPercent)}`}>
                        {ct.memPercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono truncate max-w-[200px]">{ct.image}</td>
                    </tr>
                    {expandedContainer === ct.id && (
                      <tr className="bg-muted/20 border-t">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                            <span className="text-muted-foreground">ID</span>
                            <span className="font-mono">{ct.id.slice(0, 12)}</span>
                            <span className="text-muted-foreground">Статус</span>
                            <span>{ct.status}</span>
                            <span className="text-muted-foreground">Создан</span>
                            <span>{ct.createdAt}</span>
                            {ct.ports && <><span className="text-muted-foreground">Порты</span><span className="font-mono">{ct.ports}</span></>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Logs Viewer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm font-medium text-muted-foreground">Логи контейнеров</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALLOWED_CONTAINERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={logLines} onValueChange={setLogLines}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['50', '100', '500', '1000'].map((n) => (
                    <SelectItem key={n} value={n}>{n} строк</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline"
                onClick={() => { setFetchLogs(true); refetchLogs(); }}
                disabled={logsFetching}
              >
                {logsFetching ? 'Загрузка...' : 'Загрузить'}
              </Button>
            </div>
          </div>
          {fetchLogs && logsData?.logs && (
            <div className="mt-2">
              <Input
                placeholder="🔍 Фильтр строк..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-zinc-950 rounded-b-lg max-h-[500px] overflow-y-auto font-mono text-xs p-4">
            {!fetchLogs ? (
              <p className="text-zinc-500">Нажми «Загрузить» для просмотра логов</p>
            ) : logsFetching ? (
              <p className="text-zinc-500 animate-pulse">Загрузка логов...</p>
            ) : logsData?.error ? (
              <p className="text-red-400">{logsData.error}</p>
            ) : filteredLogs().length === 0 ? (
              <p className="text-zinc-500">Нет строк{logSearch ? ` по запросу «${logSearch}»` : ''}</p>
            ) : (
              filteredLogs().map((line, i) => (
                <div key={i} className={logLineClass(line)}>{line || ' '}</div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
