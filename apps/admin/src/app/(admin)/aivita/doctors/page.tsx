'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Eye, ToggleLeft, ToggleRight, Search, UserPlus, Copy, Check,
} from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

type AivitaDoctor = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  city: string | null;
  verificationStatus: string;
  diplomaVerified: string;
  licenseVerified: string;
  showInCatalog: boolean;
  isActive: boolean;
  rating: number;
  totalConsultations: number;
  consultationPrice: number;
  createdAt: string;
  rejectionReason: string | null;
};

const VERIFY_STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  verified:     'success',
  pending:      'warning',
  not_verified: 'secondary',
  rejected:     'destructive',
};

type CreatedDoctor = {
  userId: string;
  email: string;
  name: string;
  password: string;
  specialization: string | null;
};

// `value` stays the Russian string: it is what gets written to
// doctorProfiles.specialization, and every existing row already holds it.
// Only the visible label follows the interface language — translating the
// value would split one specialty into three spellings.
const SPECIALIZATIONS: Array<{ value: string; key: string }> = [
  { value: 'Терапевт', key: 'therapist' },
  { value: 'Педиатр', key: 'pediatrician' },
  { value: 'Кардиолог', key: 'cardiologist' },
  { value: 'Невролог', key: 'neurologist' },
  { value: 'Хирург', key: 'surgeon' },
  { value: 'Гинеколог', key: 'gynecologist' },
  { value: 'Уролог', key: 'urologist' },
  { value: 'Офтальмолог', key: 'ophthalmologist' },
  { value: 'Оториноларинголог (ЛОР)', key: 'ent' },
  { value: 'Стоматолог', key: 'dentist' },
  { value: 'Дерматолог', key: 'dermatologist' },
  { value: 'Эндокринолог', key: 'endocrinologist' },
  { value: 'Онколог', key: 'oncologist' },
  { value: 'Ортопед-травматолог', key: 'orthopedist' },
  { value: 'Гастроэнтеролог', key: 'gastro' },
  { value: 'Психиатр', key: 'psychiatrist' },
  { value: 'Пульмонолог', key: 'pulmonologist' },
  { value: 'Нефролог', key: 'nephrologist' },
  { value: 'Аллерголог', key: 'allergist' },
  { value: 'Ревматолог', key: 'rheumatologist' },
  { value: 'Инфекционист', key: 'infectious' },
  { value: 'Анестезиолог', key: 'anesthesiologist' },
  { value: 'Радиолог', key: 'radiologist' },
  { value: 'Другое', key: 'other' },
];

export default function AivitaDoctorsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Create doctor dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', specialization: '' });
  const [createdDoctor, setCreatedDoctor] = useState<CreatedDoctor | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['aivita-doctors', page, search, statusFilter],
    queryFn: () => api.get<{ data: AivitaDoctor[]; total: number }>(
      `/v1/aivita-admin/aivita-doctors?page=${page}&limit=25${search ? `&search=${encodeURIComponent(search)}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`
    ),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ userId, action, reason }: { userId: string; action: 'approve' | 'reject'; reason?: string }) =>
      api.patch(`/v1/aivita-admin/aivita-doctors/${userId}/verify`, { action, reason }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['aivita-doctors'] });
      toast.success(action === 'approve' ? t.aivita.doctorVerified : t.aivita.doctorRejected);
      setRejectDialog(null);
      setRejectReason('');
    },
    onError: () => toast.error(t.aivita.verifyFailed),
  });

  const catalogMutation = useMutation({
    mutationFn: ({ userId, ...body }: { userId: string; showInCatalog?: boolean; isActive?: boolean }) =>
      api.patch(`/v1/aivita-admin/aivita-doctors/${userId}/catalog`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aivita-doctors'] });
      toast.success(t.aivita.updated);
    },
    onError: () => toast.error(t.common.error),
  });

  const createDoctorMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string; specialization?: string }) =>
      api.post<{ data: CreatedDoctor }>('/v1/aivita-admin/aivita-doctors', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['aivita-doctors'] });
      setCreatedDoctor(res.data);
      setCreateForm({ name: '', email: '', phone: '', specialization: '' });
      toast.success(t.aivita.doctorCreated);
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.includes('email_taken')) toast.error(t.aivita.emailTaken);
      else toast.error(t.aivita.createFailed);
    },
  });

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) return;
    createDoctorMutation.mutate({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim() || undefined,
      specialization: createForm.specialization || undefined,
    });
  }

  function copyPassword() {
    if (!createdDoctor) return;
    navigator.clipboard.writeText(createdDoctor.password).then(() => {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    });
  }

  const columns: ColumnDef<AivitaDoctor>[] = [
    {
      accessorKey: 'name',
      header: t.common.doctor,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'specialization',
      header: t.aivita.specialization,
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.specialization ?? '—'}</p>
          {row.original.city && <p className="text-xs text-muted-foreground">📍 {row.original.city}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'verificationStatus',
      header: t.aivita.verification,
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={VERIFY_STATUS_COLORS[row.original.verificationStatus] ?? 'outline'}>
            {row.original.verificationStatus}
          </Badge>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px]">
              {t.aivita.diplomaLabel}: {row.original.diplomaVerified}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      header: t.aivita.catalog,
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => catalogMutation.mutate({ userId: row.original.userId, showInCatalog: !row.original.showInCatalog })}
            className="flex items-center gap-1 text-xs"
          >
            {row.original.showInCatalog
              ? <ToggleRight className="h-4 w-4 text-green-500" />
              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            {row.original.showInCatalog ? t.aivita.visible : t.aivita.hidden}
          </button>
          <button
            onClick={() => catalogMutation.mutate({ userId: row.original.userId, isActive: !row.original.isActive })}
            className="flex items-center gap-1 text-xs"
          >
            {row.original.isActive
              ? <ToggleRight className="h-4 w-4 text-blue-500" />
              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            {row.original.isActive ? t.common.active : t.aivita.deactivated}
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'rating',
      header: t.aivita.rating,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.rating > 0 ? `★ ${row.original.rating.toFixed(1)}` : '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.totalConsultations} {t.aivita.consultShort}</p>
        </div>
      ),
    },
    { accessorKey: 'createdAt', header: t.aivita.registration, cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: t.aivita.actions,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link href={`/aivita/doctors/${row.original.userId}`}>
            <Button size="icon" variant="ghost" title={t.aivita.viewProfile}>
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {row.original.verificationStatus !== 'verified' && (
            <Button size="icon" variant="ghost" title={t.aivita.verifyAction}
              className="text-green-600 hover:text-green-700"
              onClick={() => verifyMutation.mutate({ userId: row.original.userId, action: 'approve' })}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {row.original.verificationStatus !== 'rejected' && (
            <Button size="icon" variant="ghost" title={t.aivita.rejectAction}
              className="text-destructive hover:text-destructive"
              onClick={() => { setRejectDialog({ userId: row.original.userId, name: row.original.name }); setRejectReason(''); }}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.aivita.docsTitle}</h1>
          <p className="text-muted-foreground">{t.aivita.docsSubtitle}</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreatedDoctor(null); }} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          {t.aivita.addDoctor}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder={t.aivita.searchByName}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t.aivita.verifyStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.aivita.allStatuses}</SelectItem>
            <SelectItem value="not_verified">{t.aivita.notVerified}</SelectItem>
            <SelectItem value="pending">{t.aivita.underReview}</SelectItem>
            <SelectItem value="verified">{t.aivita.verifiedLabel}</SelectItem>
            <SelectItem value="rejected">{t.aivita.rejectedLabel}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={open => { if (!open) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.aivita.rejectTitle} {rejectDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.aivita.rejectReasonReq}</Label>
              <Input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={t.aivita.rejectReasonHint}
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={!rejectReason.trim() || verifyMutation.isPending}
              onClick={() => {
                if (rejectDialog)
                  verifyMutation.mutate({ userId: rejectDialog.userId, action: 'reject', reason: rejectReason });
              }}
            >
              {t.aivita.rejectAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create doctor dialog */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); setCreatedDoctor(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.aivita.addDoctor}</DialogTitle>
            <DialogDescription>
              {t.aivita.createHint}
            </DialogDescription>
          </DialogHeader>

          {createdDoctor ? (
            /* Success state */
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                <p className="text-sm font-semibold text-green-700">{t.aivita.doctorCreatedOk}</p>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">{t.aivita.nameLabel}</span> {createdDoctor.name}</p>
                  <p><span className="text-muted-foreground">Email:</span> {createdDoctor.email}</p>
                  {createdDoctor.specialization && (
                    <p><span className="text-muted-foreground">{t.aivita.specLabel}</span> {createdDoctor.specialization}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{t.aivita.generatedPassword}</Label>
                <div className="flex gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
                    {createdDoctor.password}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyPassword}>
                    {passwordCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.aivita.passwordOnce}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => { setCreateOpen(false); setCreatedDoctor(null); }}
              >
                {t.users.close}
              </Button>
            </div>
          ) : (
            /* Form state */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">{t.aivita.fullNameReq}</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t.aivita.fullNameHint}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="doctor@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">{t.users.phone}</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  value={createForm.phone}
                  onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+998 90 000 00 00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-spec">{t.aivita.specialization}</Label>
                <select
                  id="create-spec"
                  value={createForm.specialization}
                  onChange={e => setCreateForm(f => ({ ...f, specialization: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">{t.aivita.chooseSpec}</option>
                  {SPECIALIZATIONS.map(sp => (
                    <option key={sp.value} value={sp.value}>{t.spec[sp.key]}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.aivita.createNote}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!createForm.name.trim() || !createForm.email.trim() || createDoctorMutation.isPending}
                >
                  {createDoctorMutation.isPending ? t.aivita.creating : t.common.create}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
