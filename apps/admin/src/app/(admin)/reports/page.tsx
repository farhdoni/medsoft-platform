'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, Download, Save, BarChart3, Search, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

type MetrikaSummary =
  | { configured: false }
  | { configured: true; visits: number; users: number; pageviews: number; periodDays: number };

type HealthSearchSummary = {
  uniqueQueries: number;
  totalSearches: number;
  top: Array<{ query: string; count: number; lastSearchedAt: string }>;
};

const REPORT_TYPES = [
  { value: 'finance', labelKey: 'reportFinance' },
  { value: 'users', labelKey: 'reportUsers' },
  { value: 'doctors', labelKey: 'reportDoctors' },
  { value: 'full', labelKey: 'reportFull' },
];

export default function ReportsPage() {
  const { t } = useI18n();
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

  const { data: metrikaData, isLoading: metrikaLoading } = useQuery({
    queryKey: ['metrika-summary'],
    queryFn: () => api.get<{ data: MetrikaSummary }>('/v1/aivita-admin/analytics/metrika-summary'),
  });

  const { data: healthSearchData, isLoading: healthSearchLoading } = useQuery({
    queryKey: ['health-search-summary'],
    queryFn: () => api.get<{ data: HealthSearchSummary }>('/v1/aivita-admin/analytics/health-search-summary'),
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
    onSuccess: () => toast.success(t.misc.autoSaved),
    onError: () => toast.error(t.settings.saveFailed),
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
        toast.error(t.misc.reportFailed);
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
        toast.success(t.misc.reportDownloaded);
      } else {
        // PDF/HTML — open in new tab to trigger print dialog
        window.open(url, '_blank');
        toast.success(t.misc.reportPrint);
      }
    } catch {
      toast.error(t.misc.reportFailed);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t.misc.reportsTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.misc.reportsSubtitle}</p>
      </div>

      {/* Analytics */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {t.misc.analyticsTitle}
        </h2>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t.misc.metrikaCard}</CardTitle>
            {!metrikaLoading && (
              metrikaData?.data.configured ? (
                <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />{t.misc.metrikaConnected}</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />{t.misc.metrikaNotConnected}</Badge>
              )
            )}
          </CardHeader>
          <CardContent>
            {metrikaLoading ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : metrikaData?.data.configured ? (
              <div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.misc.metrikaVisits}</p>
                    <p className="text-xl font-bold mt-1">{metrikaData.data.visits.toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.misc.metrikaUsers}</p>
                    <p className="text-xl font-bold mt-1">{metrikaData.data.users.toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.misc.metrikaPageviews}</p>
                    <p className="text-xl font-bold mt-1">{metrikaData.data.pageviews.toLocaleString('ru-RU')}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{t.misc.metrikaPeriod}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.misc.metrikaNotConnectedHint}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t.misc.healthSearchCard}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthSearchLoading ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.misc.healthSearchUnique}</p>
                    <p className="text-xl font-bold mt-1">{(healthSearchData?.data.uniqueQueries ?? 0).toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.misc.healthSearchTotal}</p>
                    <p className="text-xl font-bold mt-1">{(healthSearchData?.data.totalSearches ?? 0).toLocaleString('ru-RU')}</p>
                  </div>
                </div>

                {!healthSearchData?.data.top.length ? (
                  <p className="text-sm text-muted-foreground">{t.misc.healthSearchEmpty}</p>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t.misc.healthSearchTable}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t.misc.colQuery}</th>
                            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">{t.misc.colCount}</th>
                            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">{t.misc.colLastSearched}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {healthSearchData.data.top.map((row) => (
                            <tr key={row.query} className="border-b last:border-0">
                              <td className="px-2 py-1.5">{row.query}</td>
                              <td className="px-2 py-1.5 text-right font-medium">{row.count}</td>
                              <td className="px-2 py-1.5 text-right text-muted-foreground">{formatDate(row.lastSearchedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.misc.generateReport}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t.misc.reportType}</Label>
              <Select value={type} onValueChange={v => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{t.misc[r.labelKey]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.misc.format}</Label>
              <Select value={format} onValueChange={v => setFormat(v as typeof format)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel/CSV</SelectItem>
                  <SelectItem value="pdf">{t.misc.pdfLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t.finance.dateFrom}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.finance.dateTo}</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
            <p><strong>Excel/CSV:</strong> {t.misc.excelHint}</p>
            <p><strong>PDF:</strong> {t.misc.pdfHint}</p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            {generating ? t.misc.generating : t.misc.downloadReport}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-report settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t.misc.autoReports}</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveAutoMutation.mutate()}
            disabled={saveAutoMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveAutoMutation.isPending ? t.settings.savingShort : t.settings.saveShort}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            <div>
              <Label>{t.misc.autoSend}</Label>
              <p className="text-xs text-muted-foreground">{t.misc.autoSendHint}</p>
            </div>
          </div>
          {autoEnabled && (
            <div className="space-y-1.5">
              <Label>{t.misc.recipientEmail}</Label>
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
