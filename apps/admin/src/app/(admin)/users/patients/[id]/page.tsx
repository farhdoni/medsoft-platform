'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type UserDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  onboardingCompleted: boolean;
  referralCode: string | null;
};

type DetailResponse = {
  user: UserDetail;
  doctorProfile: null;
};

function isBlocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'plus') return <Badge variant="default">plus</Badge>;
  if (plan === 'pro') return <Badge variant="warning">pro</Badge>;
  return <Badge variant="secondary">free</Badge>;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = (params?.id ?? '') as string;
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ['admin-user', id],
    queryFn: () => api.get(`/v1/admin/users/${id}`),
  });

  const updatePlanMutation = useMutation({
    mutationFn: (tier: string) => api.put(`/v1/admin/users/${id}`, { tier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users-patients'] });
      toast.success('Тариф обновлён');
    },
    onError: () => toast.error('Ошибка при обновлении тарифа'),
  });

  const blockMutation = useMutation({
    mutationFn: () => api.post(`/v1/admin/users/${id}/block`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users-patients'] });
      toast.success('Пользователь заблокирован');
    },
    onError: () => toast.error('Ошибка при блокировке'),
  });

  const unblockMutation = useMutation({
    mutationFn: () => api.put(`/v1/admin/users/${id}`, { status: 'active' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users-patients'] });
      toast.success('Пользователь разблокирован');
    },
    onError: () => toast.error('Ошибка при разблокировке'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => api.post<{ newPassword: string }>(`/v1/admin/users/${id}/reset-password`),
    onSuccess: (res) => {
      setNewPassword(res.newPassword);
      setPasswordDialogOpen(true);
    },
    onError: () => toast.error('Ошибка при сбросе пароля'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/v1/admin/users/${id}`),
    onSuccess: () => {
      toast.success('Аккаунт удалён');
      router.push('/users/patients');
    },
    onError: () => toast.error('Ошибка при удалении'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 bg-muted animate-pulse rounded w-32" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Пользователь не найден</p>;
  }

  const { user } = data;
  const blocked = isBlocked(user.lockedUntil);
  const displayName = user.name ?? user.email ?? 'Без имени';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground text-sm">Назад</span>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Профиль пользователя</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar + name row */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold select-none">
                  {getInitials(user.name)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{displayName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    <PlanBadge plan={user.plan} />
                    {blocked
                      ? <Badge variant="destructive">Заблокирован</Badge>
                      : <Badge variant="success">Активен</Badge>}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{user.email ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Телефон</span>
                    <span>{user.phone ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono text-xs">{user.id.slice(0, 8)}…</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Зарегистрирован</span>
                    <span className="text-xs">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Последний вход</span>
                    <span className="text-xs">{formatDate(user.lastLoginAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Онбординг</span>
                    {user.onboardingCompleted
                      ? <Badge variant="success" className="text-[10px]">✓ пройден</Badge>
                      : <Badge variant="secondary" className="text-[10px]">не пройден</Badge>}
                  </div>
                  {user.referralCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Реферальный код</span>
                      <span className="font-mono text-xs">{user.referralCode}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Change tier */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Изменить тариф</p>
                <Select
                  value={selectedPlan || user.plan}
                  onValueChange={setSelectedPlan}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">free</SelectItem>
                    <SelectItem value="plus">plus</SelectItem>
                    <SelectItem value="pro">pro</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={
                    updatePlanMutation.isPending ||
                    (selectedPlan === '' || selectedPlan === user.plan)
                  }
                  onClick={() => {
                    if (selectedPlan && selectedPlan !== user.plan) {
                      updatePlanMutation.mutate(selectedPlan);
                    }
                  }}
                >
                  {updatePlanMutation.isPending ? 'Сохраняю...' : 'Сохранить тариф'}
                </Button>
              </div>

              {/* Block / Unblock */}
              <div className="space-y-2 pt-3 border-t">
                <p className="text-sm font-medium">Статус аккаунта</p>
                {blocked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-green-600 border-green-200 hover:bg-green-50"
                    disabled={unblockMutation.isPending}
                    onClick={() => unblockMutation.mutate()}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {unblockMutation.isPending ? 'Разблокирую...' : 'Разблокировать'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                    disabled={blockMutation.isPending}
                    onClick={() => blockMutation.mutate()}
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    {blockMutation.isPending ? 'Блокирую...' : 'Заблокировать'}
                  </Button>
                )}
              </div>

              {/* Reset password */}
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                  onClick={() => resetPasswordMutation.mutate()}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {resetPasswordMutation.isPending ? 'Сбрасываю...' : 'Сбросить пароль'}
                </Button>
              </div>

              {/* Delete account */}
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить аккаунт
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New password dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пароль сброшен</DialogTitle>
            <DialogDescription>
              Сохраните новый пароль — он больше не будет показан.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 p-3 bg-muted rounded-md font-mono text-center text-lg tracking-widest select-all">
            {newPassword}
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordDialogOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить аккаунт?</DialogTitle>
            <DialogDescription>
              Вы уверены? Это действие нельзя отменить. Аккаунт пользователя <strong>{displayName}</strong> будет удалён безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Удаляю...' : 'Да, удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
