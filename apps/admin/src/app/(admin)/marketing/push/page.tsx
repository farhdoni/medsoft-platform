'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type PushHistory = {
  id: string; title: string; body: string;
  targetAudience: string | null; totalSent: number;
  createdAt: string;
};

const AUDIENCE_KEYS: Record<string, string> = {
  all: 'audShortAll', free: 'audShortFree', paid: 'audShortPaid', doctors: 'audShortDoctors',
};

export default function PushNotificationsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['push-history'],
    queryFn: () => api.get<{ data: PushHistory[] }>('/v1/admin/marketing/push/history'),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post('/v1/admin/marketing/push/send', { title, body, audience }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['push-history'] });
      setTitle(''); setBody(''); setAudience('all');
      toast.success(t.marketing.pushSent);
    },
    onError: () => toast.error(t.marketing.sendFailed),
  });

  const columns: ColumnDef<PushHistory>[] = [
    {
      accessorKey: 'title',
      header: t.marketing.pushTitle,
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'body',
      header: t.marketing.pushBody,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">{row.original.body}</span>
      ),
    },
    {
      header: t.marketing.audience,
      cell: ({ row }) => {
        const key = AUDIENCE_KEYS[row.original.targetAudience ?? 'all'];
        return (
          <Badge variant="secondary">
            {key ? t.marketing[key] : row.original.targetAudience}
          </Badge>
        );
      },
    },
    {
      header: t.marketing.colSent,
      cell: ({ row }) => row.original.totalSent.toLocaleString('ru-RU'),
    },
    {
      header: t.marketing.colDate,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Send form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t.marketing.newPush}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.marketing.audience}</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.marketing.audAll}</SelectItem>
                  <SelectItem value="free">{t.marketing.audFree}</SelectItem>
                  <SelectItem value="paid">{t.marketing.audPaid}</SelectItem>
                  <SelectItem value="doctors">{t.marketing.audDoctors}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.marketing.pushTitle}</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.marketing.pushTitleHint} maxLength={100} />
              <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t.marketing.pushBody}</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={t.marketing.pushBodyHint}
                maxLength={200}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground text-right">{body.length}/200</p>
            </div>
            <Button
              className="w-full"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? t.marketing.sending : t.marketing.send}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t.marketing.historyTitle}</h2>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            total={data?.data.length ?? 0}
            page={1}
            pageSize={50}
            onPageChange={() => {}}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
