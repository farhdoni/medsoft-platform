'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Send, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Campaign = {
  id: number; subject: string; audience: string;
  recipientCount: number; openCount: number;
  status: string; sentAt: string | null; createdAt: string;
};
type Template = { id: number; name: string; subject: string; body: string; createdAt: string };

const STATUS_KEYS: Record<string, string> = {
  draft: 'stDraft', sent: 'stSent', scheduled: 'stScheduled',
};
const STATUS_VARIANTS: Record<string, 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary', sent: 'success', scheduled: 'warning',
};
const AUDIENCE_KEYS: Record<string, string> = {
  all: 'audShortAll', free: 'audShortFree', paid: 'audShortPaid', doctors: 'audShortDoctors',
};

export default function EmailCampaignsPage() {
  const { t: tr } = useI18n();
  const qc = useQueryClient();

  // Compose form state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');

  // Template dialog
  const [templateDialog, setTemplateDialog] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [editTpl, setEditTpl] = useState<Template | null>(null);

  const { data: campaignsData, isLoading: campLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => api.get<{ data: Campaign[] }>('/v1/admin/marketing/email/campaigns'),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.get<{ data: Template[] }>('/v1/admin/marketing/email/templates'),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post('/v1/admin/marketing/email/send', { subject, body, audience }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      setSubject(''); setBody(''); setAudience('all');
      toast.success(tr.marketing.campaignStarted);
    },
    onError: () => toast.error(tr.marketing.sendFailed),
  });

  const saveTplMutation = useMutation({
    mutationFn: () => editTpl
      ? api.put(`/v1/admin/marketing/email/templates/${editTpl.id}`, { name: tplName, subject: tplSubject, body: tplBody })
      : api.post('/v1/admin/marketing/email/templates', { name: tplName, subject: tplSubject, body: tplBody }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setTemplateDialog(false);
      resetTpl();
      toast.success(editTpl ? tr.marketing.tplUpdated : tr.marketing.tplSaved);
    },
    onError: () => toast.error(tr.common.error),
  });

  const deleteTplMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/admin/marketing/email/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success(tr.marketing.tplDeleted);
    },
    onError: () => toast.error(tr.common.error),
  });

  function resetTpl() {
    setTplName(''); setTplSubject(''); setTplBody(''); setEditTpl(null);
  }

  function openEditTpl(t: Template) {
    setEditTpl(t); setTplName(t.name); setTplSubject(t.subject); setTplBody(t.body);
    setTemplateDialog(true);
  }

  function applyTemplate(t: Template) {
    setSubject(t.subject); setBody(t.body);
    toast.info(`${tr.marketing.tplApplied} ${t.name}`);
  }

  const campaignColumns: ColumnDef<Campaign>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="text-xs text-muted-foreground">#{row.original.id}</span> },
    { accessorKey: 'subject', header: tr.marketing.colSubject, cell: ({ row }) => <span className="text-sm font-medium">{row.original.subject}</span> },
    {
      header: tr.marketing.audience,
      cell: ({ row }) => {
        const key = AUDIENCE_KEYS[row.original.audience];
        return <Badge variant="secondary">{key ? tr.marketing[key] : row.original.audience}</Badge>;
      },
    },
    {
      header: tr.common.status,
      cell: ({ row }) => {
        const key = STATUS_KEYS[row.original.status];
        return (
          <Badge variant={STATUS_VARIANTS[row.original.status] ?? 'secondary'}>
            {key ? tr.marketing[key] : row.original.status}
          </Badge>
        );
      },
    },
    {
      header: tr.marketing.colRecipients,
      cell: ({ row }) => row.original.recipientCount.toLocaleString('ru-RU'),
    },
    {
      header: tr.marketing.colOpens,
      cell: ({ row }) => {
        const rate = row.original.recipientCount > 0
          ? Math.round(row.original.openCount / row.original.recipientCount * 100)
          : 0;
        return <span className="text-sm">{row.original.openCount} <span className="text-muted-foreground text-xs">({rate}%)</span></span>;
      },
    },
    {
      header: tr.marketing.colSent,
      cell: ({ row }) => row.original.sentAt ? <span className="text-xs">{formatDate(row.original.sentAt)}</span> : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">{tr.marketing.tabCompose}</TabsTrigger>
          <TabsTrigger value="history">{tr.marketing.tabHistory}</TabsTrigger>
          <TabsTrigger value="templates">{tr.marketing.tabTemplates}</TabsTrigger>
        </TabsList>

        {/* ── Compose ── */}
        <TabsContent value="compose" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{tr.marketing.newCampaign}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{tr.marketing.audience}</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tr.marketing.audAll}</SelectItem>
                        <SelectItem value="free">{tr.marketing.audFree}</SelectItem>
                        <SelectItem value="paid">{tr.marketing.audPaid}</SelectItem>
                        <SelectItem value="doctors">{tr.marketing.audDoctors}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tr.marketing.subject}</Label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={tr.marketing.subjectHint} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{tr.marketing.bodyHtml}</Label>
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder={tr.marketing.bodyHint}
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
                <Button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || !subject.trim() || !body.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMutation.isPending ? tr.marketing.sending : tr.marketing.sendCampaign}
                </Button>
              </CardContent>
            </Card>

            {/* Templates quick apply */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.marketing.templates}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(templatesData?.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{tr.marketing.noTemplates}</p>
                )}
                {(templatesData?.data ?? []).map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left px-3 py-2 rounded-lg border text-sm hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="pt-4">
          <DataTable
            columns={campaignColumns}
            data={campaignsData?.data ?? []}
            total={campaignsData?.data.length ?? 0}
            page={1}
            pageSize={50}
            onPageChange={() => {}}
            isLoading={campLoading}
          />
        </TabsContent>

        {/* ── Templates ── */}
        <TabsContent value="templates" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { resetTpl(); setTemplateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {tr.marketing.newTemplate}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(templatesData?.data ?? []).map(t => (
              <Card key={t.id} className="group relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTpl(t)}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => deleteTplMutation.mutate(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(templatesData?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground col-span-3">{tr.marketing.templatesNotFound}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template create/edit dialog */}
      <Dialog open={templateDialog} onOpenChange={v => { setTemplateDialog(v); if (!v) resetTpl(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTpl ? tr.marketing.editTemplate : tr.marketing.newTemplate}</DialogTitle>
            <DialogDescription>{tr.marketing.templateHint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{tr.marketing.templateName}</Label>
              <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder={tr.marketing.templateNameHint} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr.marketing.subject}</Label>
              <Input value={tplSubject} onChange={e => setTplSubject(e.target.value)} placeholder={tr.marketing.subjectHint} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr.marketing.templateBody}</Label>
              <Textarea
                value={tplBody}
                onChange={e => setTplBody(e.target.value)}
                className="font-mono text-sm min-h-[160px]"
                placeholder="<p>...</p>"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTemplateDialog(false); resetTpl(); }}>{tr.common.cancel}</Button>
            <Button
              onClick={() => saveTplMutation.mutate()}
              disabled={saveTplMutation.isPending || !tplName.trim()}
            >
              {saveTplMutation.isPending ? tr.settings.savingShort : tr.settings.saveShort}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
