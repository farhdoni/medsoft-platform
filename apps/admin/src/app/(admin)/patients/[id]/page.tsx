'use client';

import { useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, MessageSquare, Activity, Heart,
  UserX, Trash2, Download, Shield, CheckCircle,
  Crown, Calendar, RefreshCw, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

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

type SubPlan = {
  id: number; name: string; slug: string; price: number; period: string;
};
type SubInfo = {
  id: number; status: string; startedAt: string; expiresAt: string;
  autoRenew: boolean; planId: number; planName: string; planSlug: string;
  planPrice: number; planPeriod: string;
} | null;
type SubResponse = { subscription: SubInfo; plans: SubPlan[] };

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
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ['aivita-user', id],
    queryFn: () => api.get(`/v1/aivita-admin/users/${id}`),
  });

  const { data: subData, isLoading: subLoading } = useQuery<SubResponse>({
    queryKey: ['aivita-user-sub', id],
    queryFn: () => api.get(`/v1/aivita-admin/users/${id}/subscription`),
  });

  const assignSubMutation = useMutation({
    mutationFn: (planId: number) =>
      api.post(`/v1/aivita-admin/users/${id}/subscription`, { planId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aivita-user-sub', id] });
      qc.invalidateQueries({ queryKey: ['aivita-user', id] });
      toast.success(t.patients.subUpdated);
      setSubDialogOpen(false);
      setSelectedPlanId('');
    },
    onError: () => toast.error(t.patients.subFailed),
  });

  const deactivateMutation = useMutation({
    mutationFn: (deletedAt: string | null) =>
      api.patch(`/v1/aivita-admin/users/${id}`, { deletedAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aivita-user', id] });
      qc.invalidateQueries({ queryKey: ['aivita-users'] });
      toast.success(data?.user.deletedAt ? t.patients.accRestored : t.patients.accDeactivated);
      setDeactivateDialogOpen(false);
    },
    onError: () => toast.error(t.common.error),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/v1/aivita-admin/users/${id}`),
    onSuccess: () => {
      toast.success(t.patients.userDeleted);
      router.push('/patients');
    },
    onError: () => toast.error(t.patients.deleteFailed),
  });

  async function handleExport() {
    try {
      const data = await api.post<Record<string, unknown>>(`/v1/aivita-admin/users/${id}/export`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `aivita-user-${id}.json`;
      a.click();
      toast.success(t.patients.exportReady);
    } catch {
      toast.error(t.common.exportFailed);
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
    return <p className="text-muted-foreground">{t.patients.notFound}</p>;
  }

  const { user, healthScore, habits, chatSummary } = data;
  const displayName = user.name ?? user.nickname ?? t.patients.noName;
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
              {isDeleted && <Badge variant="destructive">{t.patients.deleted}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {user.email ?? '—'} · ID: {user.id.slice(0, 8)}… · {t.patients.registered} {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> {t.patients.exportBtn}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeactivateDialogOpen(true)}
            className={isDeleted ? 'text-green-600' : 'text-orange-600'}
          >
            {isDeleted ? <CheckCircle className="h-4 w-4 mr-1" /> : <UserX className="h-4 w-4 mr-1" />}
            {isDeleted ? t.patients.restore : t.patients.deactivate}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleted}
          >
            <Trash2 className="h-4 w-4 mr-1" /> {t.patients.delete}
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
            <p className="text-xs text-muted-foreground mt-1">{t.patients.outOf100}</p>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" /> {t.patients.profile}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.patients.nickname}</span>
              <span>@{user.nickname ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.patients.language}</span>
              <span className="uppercase">{user.locale}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.patients.provider}</span>
              <span className="capitalize">{user.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              {user.emailVerified
                ? <Badge variant="success" className="text-[10px]">{t.patients.verified}</Badge>
                : <Badge variant="warning" className="text-[10px]">{t.patients.notVerified}</Badge>}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.patients.onboarding}</span>
              {user.onboardingCompleted
                ? <Badge variant="success" className="text-[10px]">{t.patients.onbDone}</Badge>
                : <Badge variant="secondary" className="text-[10px]">{t.patients.onbNotDone}</Badge>}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.patients.lastLogin}</span>
              <span className="text-xs">{formatDate(user.lastLoginAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-500" /> {t.patients.aiChat}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{chatSummary.totalMessages}</p>
                <p className="text-xs text-muted-foreground">{t.patients.messages}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{chatSummary.sessions}</p>
                <p className="text-xs text-muted-foreground">{t.patients.sessions}</p>
              </div>
            </div>
            {chatSummary.latestSession && (
              <p className="text-xs text-muted-foreground">
                {t.patients.latest} {formatDate(chatSummary.latestSession.updatedAt)}
              </p>
            )}
            <Link href={`/patients/${id}/chat`}>
              <Button variant="outline" size="sm" className="w-full mt-2">
                <MessageSquare className="h-4 w-4 mr-2" /> {t.patients.viewChat}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Subscription */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" /> {t.patients.subscription}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setSubDialogOpen(true)}>
            <ChevronDown className="h-3.5 w-3.5 mr-1" /> {t.patients.change}
          </Button>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded" />
          ) : subData?.subscription ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t.patients.plan}</p>
                <Badge variant="default" className="font-semibold">{subData.subscription.planName}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t.common.status}</p>
                <Badge variant={subData.subscription.status === 'active' ? 'success' : 'secondary'}>
                  {subData.subscription.status === 'active' ? t.patients.subActive : subData.subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {t.patients.start}
                </p>
                <p className="font-medium">{formatDate(subData.subscription.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {t.patients.expires}
                </p>
                <p className="font-medium">{formatDate(subData.subscription.expiresAt)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t.patients.noSub}</p>
              <Button size="sm" onClick={() => setSubDialogOpen(true)}>
                {t.patients.assignPlan}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habits */}
      {habits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> {t.patients.habits}
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
            {t.patients.noHabits}
          </CardContent>
        </Card>
      )}

      {/* Subscription dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.patients.changeSub}</DialogTitle>
            <DialogDescription>
              {t.patients.changeSubDesc}
              {subData?.subscription && (
                <span className="block mt-1">
                  {t.patients.currentPlan} <strong>{subData.subscription.planName}</strong>
                  {', '}{t.patients.expiresLower} {formatDate(subData.subscription.expiresAt)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder={t.patients.selectPlan} />
              </SelectTrigger>
              <SelectContent>
                {(subData?.plans ?? []).map(plan => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.name} — {plan.price === 0 ? t.patients.free : `${plan.price.toLocaleString('ru-RU')} ${t.aivita.sumSuffix}`}
                    {plan.period === 'annual' ? t.patients.perYear : plan.period === 'monthly' ? t.patients.perMonth : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSubDialogOpen(false); setSelectedPlanId(''); }}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={!selectedPlanId || assignSubMutation.isPending}
              onClick={() => { if (selectedPlanId) assignSubMutation.mutate(Number(selectedPlanId)); }}
            >
              {assignSubMutation.isPending ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> {t.patients.applying}</>
              ) : t.patients.applyPlan}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDeleted ? t.patients.restoreAsk : t.patients.deactivateAsk}</DialogTitle>
            <DialogDescription>
              {isDeleted
                ? t.patients.restoreDesc.replace('{name}', () => displayName)
                : t.patients.deactivateDesc.replace('{name}', () => displayName)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>{t.common.cancel}</Button>
            <Button
              variant={isDeleted ? 'default' : 'destructive'}
              onClick={() => deactivateMutation.mutate(isDeleted ? null : new Date().toISOString())}
              disabled={deactivateMutation.isPending}
            >
              {isDeleted ? t.patients.restore : t.patients.deactivate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.patients.deleteAsk}</DialogTitle>
            <DialogDescription>
              {t.patients.deleteDesc.replace('{name}', () => displayName)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t.common.cancel}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t.patients.deleting : t.patients.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
