'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BroadcastRecord {
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  reach: number;
}

function relTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const AUDIENCE_KEYS: Record<string, string> = {
  all: 'audienceAll',
  patients: 'audiencePatients',
  doctors: 'audienceDoctors',
};

export default function AdminNotificationsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [audience, setAudience] = useState<'all' | 'patients' | 'doctors'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');

  const { data: broadcasts = [], isLoading } = useQuery<BroadcastRecord[]>({
    queryKey: ['admin-broadcasts'],
    queryFn: () => api.get<{ data: BroadcastRecord[] }>('/v1/admin/notifications/broadcasts')
      .then((r) => r.data),
    staleTime: 30_000,
  });

  const send = useMutation({
    mutationFn: () =>
      api.post<{ data: { sent: number } }>('/v1/admin/notifications/broadcast', {
        audience,
        title,
        body,
        ...(link ? { link } : {}),
      }),
    onSuccess: (res) => {
      alert(`${t.aivita.sentTo} ${res.data.sent} ${t.aivita.sentSuffix}`);
      setTitle('');
      setBody('');
      setLink('');
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
    },
    onError: () => alert(t.aivita.sendFailed),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    send.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.aivita.notifTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t.aivita.notifSubtitle}
        </p>
      </div>

      {/* ── Broadcast form ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t.aivita.notifNew}</CardTitle>
          <CardDescription>{t.aivita.notifNewHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.aivita.audience}</Label>
                <Select
                  value={audience}
                  onValueChange={(v) => setAudience(v as typeof audience)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.aivita.audienceAll}</SelectItem>
                    <SelectItem value="patients">{t.aivita.audiencePatients}</SelectItem>
                    <SelectItem value="doctors">{t.aivita.audienceDoctors}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t.aivita.linkOptional}</Label>
                <Input
                  placeholder={t.aivita.linkHint}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.aivita.notifHeading}</Label>
              <Input
                placeholder={t.aivita.notifHeadingHint}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.aivita.notifText}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t.aivita.notifTextHint}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={send.isPending || !title.trim() || !body.trim()}
              >
                {send.isPending ? t.aivita.sending : `${t.aivita.sendTo} ${t.aivita[AUDIENCE_KEYS[audience]]}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Broadcast history ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t.aivita.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.aivita.historyEmpty}</p>
          ) : (
            <div className="divide-y">
              {broadcasts.map((b, i) => (
                <div key={i} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.body}</p>
                    {b.link && (
                      <p className="text-xs text-muted-foreground mt-0.5">→ {b.link}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <Badge variant="secondary">{b.reach} {t.aivita.recipients}</Badge>
                    <p className="text-[11px] text-muted-foreground">{relTime(b.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
