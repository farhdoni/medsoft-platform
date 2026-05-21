'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Trash2, ShieldOff, ShieldCheck, Star, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

type DoctorProfile = {
  id: string;
  specialization: string | null;
  verificationStatus: string;
  rating: number;
  totalPatients: number;
  diplomaScanUrl: string | null;
  rejectionReason: string | null;
  bio: string | null;
  experienceStartDate: string | null;
  diplomaUniversity: string | null;
  showInCatalog?: boolean;
};

type DetailResponse = {
  user: UserDetail;
  doctorProfile: DoctorProfile | null;
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

function VerificationBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <Badge variant="success">Верифицирован</Badge>;
    case 'pending':
      return <Badge variant="warning">На проверке</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Отклонён</Badge>;
    default:
      return <Badge variant="secondary">Не верифицирован</Badge>;
  }
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

function calcExperienceYears(experienceStartDate: string | null): string {
  if (!experienceStartDate) return '—';
  const start = new Date(experienceStartDate);
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const total = months < 0 ? years - 1 : years;
  return `${total} ${total === 1 ? 'год' : total >= 2 && total <= 4 ? 'года' : 'лет'}`;
}

export default function DoctorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ['admin-user', id],
    queryFn: () => api.get(`/v1/admin/users/${id}`),
  });

  const updatePlanMutation = useMutation({
    mutationFn: (tier: string) => api.put(`/v1/admin/users/${id}`, { tier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users-doctors'] });
      toast.success('Тариф обновлён');
    },
    onError: () => toast.error('Ошибка при обновлении тарифа'),
  });

  const blockMutation = useMutation({
    mutationFn: () => api.post(`/v1/admin/users/${id}/block`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users-doctors'] });
      toast.success('Пользователь заблокирован');
    },
    onError: () => toast.error('Ошибка при блокировке'),
  });

  const unblockMutation = useMutation({
    mutationFn: () => api.put(`/v1/admin/users/${id}`, { status: 'active' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users-doctors'] });
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
      router.push('/users/doctors');
    },
    onError: () => toast.error('Ошибка при удалении'),
  });

  const approveMutation = useMutation({
    mutationFn: (doctorProfileId: string) =>
      api.put(`/v1/admin/users/doctors/${doctorProfileId}/verify`, { action: 'approve' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      toast.success('Врач верифицирован');
    },
    onError: () => toast.error('Ошибка при верификации'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ doctorProfileId, reason }: { doctorProfileId: string; reason: string }) =>
      api.put(`/v1/admin/users/doctors/${doctorProfileId}/verify`, { action: 'reject', reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      toast.success('Врач отклонён');
      setRejectDialogOpen(false);
      setRejectReason('');
    },
    onError: () => toast.error('Ошибка при отклонении'),
  });

  const toggleCatalogMutation = useMutation({
    mutationFn: (showInCatalog: boolean) =>
      api.put(`/v1/admin/users/${id}`, { showInCatalog }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      toast.success('Видимость в каталоге обновлена');
    },
    onError: () => toast.error('Ошибка при обновлении'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 bg-muted animate-pulse rounded w-32" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="h-48 bg-muted animate-pulse rounded" />
            <div className="h-40 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="h-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Пользователь не найден</p>;
  }

  const { user, doctorProfile } = data;
  const blocked = isBlocked(user.lockedUntil);
  const displayName = user.name ?? user.email ?? 'Без имени';
  const verStatus = doctorProfile?.verificationStatus ?? 'not_verified';
  const canVerify = verStatus === 'pending' || verStatus === 'not_verified' || verStatus === 'rejected';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/users/doctors')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground text-sm">Врачи</span>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic profile */}
          <Card>
            <CardHeader>
              <CardTitle>Профиль врача</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold select-none">
                  {getInitials(user.name)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{displayName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">врач</Badge>
                    <PlanBadge plan={user.plan} />
                    {blocked
                      ? <Badge variant="destructive">Заблокирован</Badge>
                      : <Badge variant="success">Активен</Badge>}
                    {doctorProfile && <VerificationBadge status={verStatus} />}
                  </div>
                </div>
              </div>

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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional info */}
          {doctorProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Профессиональная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground">Специализация</span>
                    <span>{doctorProfile.specialization ?? '—'}</span>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground">Опыт</span>
                    <span>{calcExperienceYears(doctorProfile.experienceStartDate)}</span>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground">Консультаций</span>
                    <span>{doctorProfile.totalPatients}</span>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground">Рейтинг</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      {doctorProfile.rating ? doctorProfile.rating.toFixed(1) : '—'}
                    </span>
                  </div>
                  {doctorProfile.diplomaUniversity && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Университет</span>
                      <span className="text-right max-w-[60%]">{doctorProfile.diplomaUniversity}</span>
                    </div>
                  )}
                </div>
                {doctorProfile.bio && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Биография</p>
                    <p className="text-sm line-clamp-3">{doctorProfile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Diploma */}
          {doctorProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Диплом</CardTitle>
              </CardHeader>
              <CardContent>
                {doctorProfile.diplomaScanUrl ? (
                  <img
                    src={doctorProfile.diplomaScanUrl}
                    alt="Диплом"
                    className="max-h-80 object-contain rounded border w-full"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Диплом не загружен</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verification status card */}
          {doctorProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Статус верификации</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <VerificationBadge status={verStatus} />
                </div>
                {verStatus === 'rejected' && doctorProfile.rejectionReason && (
                  <div className="mt-2 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                    <p className="font-medium mb-1">Причина отклонения:</p>
                    <p>{doctorProfile.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — actions */}
        <div className="space-y-4">
          {/* Verification actions */}
          {doctorProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Верификация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {verStatus === 'verified' ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Верифицирован
                  </div>
                ) : (
                  <>
                    {canVerify && (
                      <>
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          disabled={approveMutation.isPending}
                          onClick={() => {
                            if (confirm('Одобрить верификацию врача?')) {
                              approveMutation.mutate(doctorProfile.id);
                            }
                          }}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          {approveMutation.isPending ? 'Одобряю...' : 'Одобрить'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => setRejectDialogOpen(true)}
                        >
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Отклонить
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Other actions */}
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

              {/* Catalog visibility */}
              {doctorProfile && (
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={toggleCatalogMutation.isPending}
                    onClick={() =>
                      toggleCatalogMutation.mutate(!(doctorProfile.showInCatalog ?? true))
                    }
                  >
                    {doctorProfile.showInCatalog ?? true ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Скрыть из каталога
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Показать в каталоге
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Block / Unblock */}
              <div className="pt-3 border-t space-y-2">
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

              {/* Delete */}
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

      {/* Reject reason dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить верификацию</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения. Она будет отображена врачу.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Причина отклонения..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (doctorProfile) {
                  rejectMutation.mutate({ doctorProfileId: doctorProfile.id, reason: rejectReason });
                }
              }}
            >
              {rejectMutation.isPending ? 'Отклоняю...' : 'Отклонить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Вы уверены? Это действие нельзя отменить. Аккаунт врача <strong>{displayName}</strong> будет удалён безвозвратно.
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
