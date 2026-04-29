'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string | null;
  type: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  priceUzs: string;
  isPaid: boolean;
  patientComplaint: string | null;
};

type Patient = { id: string; fullName: string; phone: string };
type Doctor  = { id: string; fullName: string; specialization: string };
type Clinic  = { id: string; name: string; city: string };

type AppointmentForm = {
  patientId: string;
  doctorId: string;
  clinicId: string;
  type: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  priceUzs: number;
  patientComplaint: string;
};

const emptyForm: AppointmentForm = {
  patientId: '',
  doctorId: '',
  clinicId: '',
  type: 'offline_clinic',
  status: 'scheduled',
  scheduledAt: '',
  durationMinutes: 30,
  priceUzs: 0,
  patientComplaint: '',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  { value: 'offline_clinic',   label: 'Очный приём' },
  { value: 'telemedicine_video', label: 'Телемедицина (видео)' },
  { value: 'telemedicine_chat',  label: 'Телемедицина (чат)' },
  { value: 'home_visit',        label: 'Выезд на дом' },
];

const APPOINTMENT_STATUSES = [
  { value: 'scheduled',           label: 'Запланирован' },
  { value: 'confirmed',           label: 'Подтверждён' },
  { value: 'in_progress',         label: 'Идёт' },
  { value: 'completed',           label: 'Завершён' },
  { value: 'cancelled_by_patient', label: 'Отменён пациентом' },
  { value: 'cancelled_by_doctor',  label: 'Отменён врачом' },
  { value: 'no_show',             label: 'Не явился' },
];

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed:            'success',
  confirmed:            'default',
  scheduled:            'secondary',
  in_progress:          'warning',
  cancelled_by_patient: 'destructive',
  cancelled_by_doctor:  'destructive',
  no_show:              'destructive',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]     = useState<Appointment | null>(null);
  const [form, setForm]           = useState<AppointmentForm>(emptyForm);

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page],
    queryFn: () => api.get<{ data: Appointment[]; total: number }>(`/v1/appointments?page=${page}&limit=20`),
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-select'],
    queryFn: () => api.get<{ data: Patient[] }>('/v1/patients?limit=200'),
    staleTime: 60_000,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: () => api.get<{ data: Doctor[] }>('/v1/doctors?limit=200'),
    staleTime: 60_000,
  });

  const { data: clinics } = useQuery({
    queryKey: ['clinics-select'],
    queryFn: () => api.get<{ data: Clinic[] }>('/v1/clinics?limit=200'),
    staleTime: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: AppointmentForm) =>
      api.post('/v1/appointments', {
        ...body,
        clinicId: body.clinicId || undefined,
        patientComplaint: body.patientComplaint || undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Запись создана'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при создании'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AppointmentForm> }) =>
      api.patch(`/v1/appointments/${id}`, {
        ...body,
        clinicId: body.clinicId || undefined,
        patientComplaint: body.patientComplaint || undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Запись обновлена'); setDialogOpen(false); },
    onError: () => toast.error('Ошибка при обновлении'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/appointments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Удалено'); },
    onError: () => toast.error('Ошибка'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setForm({
      patientId:       appt.patientId,
      doctorId:        appt.doctorId,
      clinicId:        appt.clinicId ?? '',
      type:            appt.type,
      status:          appt.status,
      scheduledAt:     appt.scheduledAt.slice(0, 16), // datetime-local format
      durationMinutes: appt.durationMinutes,
      priceUzs:        Number(appt.priceUzs),
      patientComplaint: appt.patientComplaint ?? '',
    });
    setDialogOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function setField<K extends keyof AppointmentForm>(key: K, value: AppointmentForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Lookup helpers ────────────────────────────────────────────────────────
  const patientMap = Object.fromEntries((patients?.data ?? []).map((p) => [p.id, p.fullName]));
  const doctorMap  = Object.fromEntries((doctors?.data  ?? []).map((d) => [d.id, d.fullName]));

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: 'patientId', header: 'Пациент',
      cell: ({ row }) => patientMap[row.original.patientId] ?? row.original.patientId.slice(0, 8) + '…',
    },
    {
      accessorKey: 'doctorId', header: 'Врач',
      cell: ({ row }) => doctorMap[row.original.doctorId] ?? row.original.doctorId.slice(0, 8) + '…',
    },
    { accessorKey: 'type', header: 'Тип', cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge> },
    {
      accessorKey: 'status', header: 'Статус',
      cell: ({ row }) => <Badge variant={statusColors[row.original.status] ?? 'outline'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'scheduledAt', header: 'Дата', cell: ({ row }) => formatDate(row.original.scheduledAt) },
    { accessorKey: 'priceUzs', header: 'Цена', cell: ({ row }) => formatCurrency(row.original.priceUzs) },
    { accessorKey: 'isPaid', header: 'Оплачено', cell: ({ row }) => row.original.isPaid ? '✓' : '✗' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm('Удалить запись?')) deleteMutation.mutate(row.original.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Приёмы</h1>
          <p className="text-muted-foreground">Управление записями к врачам</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Создать запись</Button>
      </div>

      <Input
        placeholder="Поиск..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать запись' : 'Новая запись к врачу'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">

            {/* Patient */}
            <div className="space-y-2">
              <Label>Пациент *</Label>
              <Select value={form.patientId} onValueChange={(v) => setField('patientId', v)} required>
                <SelectTrigger><SelectValue placeholder="Выберите пациента" /></SelectTrigger>
                <SelectContent>
                  {(patients?.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.fullName} — {p.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <Label>Врач *</Label>
              <Select value={form.doctorId} onValueChange={(v) => setField('doctorId', v)} required>
                <SelectTrigger><SelectValue placeholder="Выберите врача" /></SelectTrigger>
                <SelectContent>
                  {(doctors?.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.fullName} — {d.specialization}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clinic (optional) */}
            <div className="space-y-2">
              <Label>Клиника</Label>
              <Select value={form.clinicId} onValueChange={(v) => setField('clinicId', v)}>
                <SelectTrigger><SelectValue placeholder="Выберите клинику (необязательно)" /></SelectTrigger>
                <SelectContent>
                  {(clinics?.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Тип приёма *</Label>
              <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled At */}
            <div className="space-y-2">
              <Label>Дата и время *</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setField('scheduledAt', e.target.value)}
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Длительность (минут)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={form.durationMinutes}
                onChange={(e) => setField('durationMinutes', Number(e.target.value))}
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label>Цена (сум) *</Label>
              <Input
                type="number"
                min={0}
                value={form.priceUzs}
                onChange={(e) => setField('priceUzs', Number(e.target.value))}
                required
              />
            </div>

            {/* Patient Complaint */}
            <div className="space-y-2">
              <Label>Жалоба пациента</Label>
              <Input
                value={form.patientComplaint}
                onChange={(e) => setField('patientComplaint', e.target.value)}
                placeholder="Опишите жалобу..."
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Сохранить' : 'Создать запись'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
