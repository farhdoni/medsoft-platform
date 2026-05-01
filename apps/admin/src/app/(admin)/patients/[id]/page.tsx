'use client';

import { useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, MoreHorizontal, MessageSquare, Activity, Heart,
  UserX, Trash2, Download, Shield, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type AivitaUser = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  provider: string;
  onboardingCompleted: boolean;
  emailVerified: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  locale: string;
};

type Habit = {
  id: string;
  name: string;
  emoji: string | null;
  goalType: string;
  completedDays: number;
  completionRate: number;
};

type ChatSummary = {
  sessions: number;
  totalMessages: number;
  latestSession: { id: string; title: string | null; updatedAt: string } | null;
};

type DetailResponse = {
  user: AivitaUser;
  healthScore: number | null;
  habits: Habit[];
  chatSummary: ChatSummary;
};

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return <p className="text-4xl font-bold text-muted-foreground">—</p>;
  const color = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-500' : 'text-red-500';
  return <p className={`text-4xl font-bold ${color}`}>{score}</p>;
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ['aivita-user', id],
    queryFn: () => api.get(`/v1/aivita-admin/users/${id}`),
  });

  const deactivateMutation = useMutation({
    mutationFn: (deletedAt: string | null) =>
      api.patch(`/v1/aivita-admin/users/${id}`, { deletedAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aivita-user', id] });
      qc.invalidateQueries({ queryKey: ['aivita-users'] });
      toast.success(data?.user.deletedAt ? 'Аккаунт восстановлен' : 'Аккаунт деактивирован');
      setDeactivateDialogOpen(false);
    },
    onError: () => toast.error('Ошибка'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/v1/aivita-admin/users/${id}`),
    onSuccess: () => {
      toast.success('Пользователь удалён');
      router.push('/patients');
    },
    onError: () => toast.error('Ошибка при удалении'),
  });

  async function handleExport() {
    try {
      const data = await api.post<Record<string, unknown>>(`/v1/aivita-admin/users/${id}/export`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `aivita-user-${id}.json`;
      a.click();
      toast.success('Экспорт готов');
    } catch {
      toast.error('Ошибка экспорта');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Пользователь не найден</p>;
  }

  const { user, healthScore, habits, chatSummary } = data;
  const displayName = user.name ?? user.nickname ?? 'Без имени';
  const isDeleted = !!user.deletedAt;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patients">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {isDeleted && <Badge variant="destructive">Удалён</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {user.email ?? '—'} · ID: {user.id.slice(0, 8)}… · Зарегистрирован {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Экспорт
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeactivateDialogOpen(true)}
            className={isDeleted ? 'text-green-600' : 'text-orange-600'}
          >
            {isDeleted ? <CheckCircle className="h-4 w-4 mr-1" /> : <UserX className="h-4 w-4 mr-1" />}
            {isDeleted ? 'Восстановить' : 'Деактивировать'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleted}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Удалить
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" /> Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRing score={healthScore} />
            <p className="text-xs text-muted-foreground mt-1">из 100 баллов</p>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" /> Профиль
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Никнейм</span>
              <span>@{user.nickname ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Язык</span>
              <span className="uppercase">{user.locale}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Вход через</span>
              <span className="capitalize">{user.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              {user.emailVerified
                ? <Badge variant="success" className="text-[10px]">✓ подтверждён</Badge>
                : <Badge variant="warning" className="text-[10px]">не подтверждён</Badge>}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Онбординг</span>
              {user.onboardingCompleted
                ? <Badge variant="success" className="text-[10px]">✓ пройден</Badge>
                : <Badge variant="secondary" className="text-[10px]">не пройден</Badge>}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Последний вход</span>
              <span className="text-xs">{formatDate(user.lastLoginAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-500" /> AI-чат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{chatSummary.totalMessages}</p>
                <p className="text-xs text-muted-foreground">сообщений</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{chatSummary.sessions}</p>
                <p className="text-xs text-muted-foreground">сессий</p>
              </div>
            </div>
            {chatSummary.latestSession && (
              <p className="text-xs text-muted-foreground">
                Последнее: {formatDate(chatSummary.latestSession.updatedAt)}
              </p>
            )}
            <Link href={`/patients/${id}/chat`}>
              <Button variant="outline" size="sm" className="w-full mt-2">
                <MessageSquare className="h-4 w-4 mr-2" /> Просмотр переписки
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Habits */}
      {habits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> Привычки (за последние 7 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <span className="text-xl">{h.emoji ?? '✅'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${h.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{h.completedDays}/7</span>
                    </div>
                  </div>
                  <Badge variant={h.completionRate >= 70 ? 'success' : h.completionRate >= 40 ? 'warning' : 'secondary'}>
                    {h.completionRate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {habits.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Привычки ещё не добавлены
          </CardContent>
        </Card>
      )}

      {/* Deactivate dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDeleted ? 'Восстановить аккаунт?' : 'Деактивировать аккаунт?'}</DialogTitle>
            <DialogDescription>
              {isDeleted
                ? `Пользователь ${displayName} снова получит доступ к приложению.`
                : `Пользователь ${displayName} потеряет доступ к приложению. Данные сохранятся.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>Отмена</Button>
            <Button
              variant={isDeleted ? 'default' : 'destructive'}
              onClick={() => deactivateMutation.mutate(isDeleted ? null : new Date().toISOString())}
              disabled={deactivateMutation.isPending}
            >
              {isDeleted ? 'Восстановить' : 'Деактивировать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить аккаунт безвозвратно?</DialogTitle>
            <DialogDescription>
              Все данные пользователя {displayName} (привычки, история AI-чата, медпрофиль) будут помечены как удалённые.
              Это действие невозможно отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаляю...' : 'Да, удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
