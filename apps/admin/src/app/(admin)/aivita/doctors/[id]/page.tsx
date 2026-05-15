'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronLeft, CheckCircle, XCircle, ToggleLeft, ToggleRight,
  ExternalLink, User, FileText, MapPin, Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

type DoctorDetail = {
  profile: {
    userId: string;
    specialization: string | null;
    city: string | null;
    clinicName: string | null;
    clinicAddress: string | null;
    photoUrl: string | null;
    bio: string | null;
    experienceStartDate: string | null;
    consultationPrice: number;
    rating: number;
    ratingCount: number;
    totalConsultations: number;
    totalPatients: number;
    languages: string[] | null;
    additionalSkills: string[] | null;
    verificationStatus: string;
    diplomaVerified: string;
    diplomaUniversity: string | null;
    diplomaSpecialty: string | null;
    diplomaYear: number | null;
    diplomaNumber: string | null;
    diplomaScanUrl: string | null;
    licenseNumber: string | null;
    licenseVerified: string;
    licenseScanUrl: string | null;
    licenseExpiresAt: string | null;
    showInCatalog: boolean;
    isActive: boolean;
    rejectionReason: string | null;
    verifiedAt: string | null;
    createdAt: string;
  };
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
};

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  verified: 'success', pending: 'warning', not_verified: 'secondary', rejected: 'destructive',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-right flex-1">{value}</span>
    </div>
  );
}

export default function AivitaDoctorDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const qc = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['aivita-doctor-detail', id],
    queryFn: () => api.get<{ data: DoctorDetail }>(`/v1/aivita-admin/aivita-doctors/${id}`),
  });

  const doctor = data?.data;

  const verifyMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'approve' | 'reject'; reason?: string }) =>
      api.patch(`/v1/aivita-admin/aivita-doctors/${id}/verify`, { action, reason }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['aivita-doctor-detail', id] });
      qc.invalidateQueries({ queryKey: ['aivita-doctors'] });
      toast.success(action === 'approve' ? '✅ Врач верифицирован' : '❌ Врач отклонён');
      setRejectDialog(false);
      setRejectReason('');
    },
    onError: () => toast.error('Ошибка'),
  });

  const catalogMutation = useMutation({
    mutationFn: (body: { showInCatalog?: boolean; isActive?: boolean }) =>
      api.patch(`/v1/aivita-admin/aivita-doctors/${id}/catalog`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aivita-doctor-detail', id] });
      toast.success('Обновлено');
    },
    onError: () => toast.error('Ошибка'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>;
  if (!doctor) return <div className="text-muted-foreground">Врач не найден</div>;

  const p = doctor.profile;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{doctor.name}</h1>
          <p className="text-muted-foreground text-sm">{p.specialization ?? 'Специализация не указана'}</p>
        </div>
        <Badge variant={STATUS_COLORS[p.verificationStatus] ?? 'outline'} className="text-sm px-3 py-1">
          {p.verificationStatus}
        </Badge>
      </div>

      {/* Action buttons */}
      {p.verificationStatus !== 'verified' && (
        <div className="flex gap-3 flex-wrap">
          <Button className="bg-green-600 hover:bg-green-700"
            disabled={verifyMutation.isPending}
            onClick={() => verifyMutation.mutate({ action: 'approve' })}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Верифицировать
          </Button>
          <Button variant="destructive"
            disabled={verifyMutation.isPending}
            onClick={() => setRejectDialog(true)}>
            <XCircle className="h-4 w-4 mr-2" />
            Отклонить
          </Button>
        </div>
      )}

      {p.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">Причина отклонения</p>
          <p className="text-muted-foreground mt-1">{p.rejectionReason}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Основная информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Email" value={doctor.email} />
            <InfoRow label="Телефон" value={doctor.phone ?? '—'} />
            <InfoRow label="Город" value={p.city} />
            <InfoRow label="Клиника" value={p.clinicName} />
            <InfoRow label="Цена консультации" value={p.consultationPrice ? `${p.consultationPrice.toLocaleString()} сум` : '—'} />
            <InfoRow label="Рейтинг" value={p.rating > 0 ? `★ ${p.rating.toFixed(1)} (${p.ratingCount})` : '—'} />
            <InfoRow label="Консультаций" value={String(p.totalConsultations)} />
            <InfoRow label="Пациентов" value={String(p.totalPatients)} />
            <InfoRow label="Зарегистрирован" value={formatDate(p.createdAt)} />
            {p.verifiedAt && <InfoRow label="Верифицирован" value={formatDate(p.verifiedAt)} />}
          </CardContent>
        </Card>

        {/* Catalog settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Настройки каталога</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Показывать в каталоге</p>
                <p className="text-xs text-muted-foreground">Видимость для пациентов</p>
              </div>
              <button
                onClick={() => catalogMutation.mutate({ showInCatalog: !p.showInCatalog })}
                disabled={catalogMutation.isPending}
              >
                {p.showInCatalog
                  ? <ToggleRight className="h-7 w-7 text-green-500" />
                  : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Активен</p>
                <p className="text-xs text-muted-foreground">Может принимать пациентов</p>
              </div>
              <button
                onClick={() => catalogMutation.mutate({ isActive: !p.isActive })}
                disabled={catalogMutation.isPending}
              >
                {p.isActive
                  ? <ToggleRight className="h-7 w-7 text-blue-500" />
                  : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
              </button>
            </div>
            {p.bio && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">О враче</p>
                <p className="text-sm line-clamp-4">{p.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diploma */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Диплом
              <Badge variant={STATUS_COLORS[p.diplomaVerified] ?? 'outline'} className="ml-auto text-xs">
                {p.diplomaVerified}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Университет" value={p.diplomaUniversity} />
            <InfoRow label="Специальность" value={p.diplomaSpecialty} />
            <InfoRow label="Год" value={p.diplomaYear ? String(p.diplomaYear) : null} />
            <InfoRow label="Номер диплома" value={p.diplomaNumber} />
            {p.diplomaScanUrl && (
              <div className="pt-3">
                <a href={p.diplomaScanUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Открыть скан диплома
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* License */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" /> Лицензия
              <Badge variant={STATUS_COLORS[p.licenseVerified] ?? 'outline'} className="ml-auto text-xs">
                {p.licenseVerified}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Номер лицензии" value={p.licenseNumber} />
            <InfoRow label="Действует до" value={p.licenseExpiresAt ? formatDate(p.licenseExpiresAt) : null} />
            {p.licenseScanUrl && (
              <div className="pt-3">
                <a href={p.licenseScanUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Открыть скан лицензии
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить верификацию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Причина отклонения *</Label>
              <Input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Например: диплом нечитаем, не совпадают данные..."
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={!rejectReason.trim() || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate({ action: 'reject', reason: rejectReason })}
            >
              Отклонить верификацию
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
