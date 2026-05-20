'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Все пользователи',
  patients: 'Только пациенты',
  doctors: 'Только врачи',
};

export default function AdminNotificationsPage() {
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
      alert(`Отправлено: ${res.data.sent} пользователям`);
      setTitle('');
      setBody('');
      setLink('');
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
    },
    onError: () => alert('Ошибка при отправке'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    send.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Уведомления</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Массовые уведомления для пользователей платформы AIVITA
        </p>
      </div>

      {/* ── Broadcast form ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Новое уведомление</CardTitle>
          <CardDescription>Будет отправлено выбранной аудитории в раздел «Уведомления»</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Аудитория</Label>
                <Select
                  value={audience}
                  onValueChange={(v) => setAudience(v as typeof audience)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все пользователи</SelectItem>
                    <SelectItem value="patients">Только пациенты</SelectItem>
                    <SelectItem value="doctors">Только врачи</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ссылка (необязательно)</Label>
                <Input
                  placeholder="/pricing или /ai-checkup"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Заголовок</Label>
              <Input
                placeholder="Важное обновление платформы"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Текст уведомления</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Мы добавили новые функции..."
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
                {send.isPending ? 'Отправка...' : `📢 Отправить — ${AUDIENCE_LABELS[audience]}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Broadcast history ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>История рассылок</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Рассылок ещё не было</p>
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
                    <Badge variant="secondary">{b.reach} получателей</Badge>
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
