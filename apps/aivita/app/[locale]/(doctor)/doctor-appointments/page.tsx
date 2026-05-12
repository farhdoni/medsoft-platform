'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import Modal from '@/components/ui/Modal';

interface Appointment {
  id: string; scheduledAt: string; durationMinutes: number;
  type: string; status: string; reason?: string;
  doctorNotes?: string; diagnosis?: string;
}
interface PatientInfo { id: string; name: string; avatarUrl?: string; }
interface ApptRow { appointment: Appointment; patient: PatientInfo; }
interface Patient { user: { id: string; name: string }; }

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('ru', { day: '2-digit', month: 'short' }); }
function fmtTime(s: string) { return new Date(s).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }); }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  scheduled:  { bg: 'var(--accent-bg)', color: 'var(--accent-dark)', label: 'Запланирован' },
  completed:  { bg: '#e8f4ec', color: '#2d7a56', label: 'Завершён' },
  cancelled:  { bg: '#fff0ec', color: '#c0304a', label: 'Отменён' },
};

export default function DoctorAppointmentsPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const [selected, setSelected] = useState<ApptRow | null>(null);
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createPatients, setCreatePatients] = useState<Patient[]>([]);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    patientId: '', date: '', time: '', type: 'offline', durationMinutes: 30, reason: '',
  });

  const load = (status: string) => {
    setLoading(true);
    apiRequest<ApptRow[]>(`/doctor/appointments?status=${status}`)
      .then(res => { if ('data' in res) setAppts(res.data ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    apiRequest<Patient[]>('/doctor/patients?status=active')
      .then(res => { if ('data' in res) setCreatePatients(res.data ?? []); });
  }, []);

  const handleCreate = async () => {
    if (!createForm.patientId || !createForm.date || !createForm.time) return;
    setCreating(true);
    const scheduledAt = new Date(`${createForm.date}T${createForm.time}`).toISOString();
    await apiRequest('/doctor/appointments', {
      method: 'POST',
      body: { patientId: createForm.patientId, scheduledAt, type: createForm.type, durationMinutes: createForm.durationMinutes, reason: createForm.reason || undefined },
    });
    setCreating(false);
    setShowCreate(false);
    setCreateForm({ patientId: '', date: '', time: '', type: 'offline', durationMinutes: 30, reason: '' });
    load(tab);
  };

  const openAppt = (row: ApptRow) => {
    setSelected(row);
    setNotes(row.appointment.doctorNotes ?? '');
    setDiagnosis(row.appointment.diagnosis ?? '');
  };

  const handleComplete = async () => {
    if (!selected) return;
    setCompleting(true);
    await apiRequest(`/doctor/appointments/${selected.appointment.id}/complete`, {
      method: 'PUT', body: { doctorNotes: notes, diagnosis },
    });
    setCompleting(false);
    setSelected(null);
    load(tab);
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    await apiRequest(`/doctor/appointments/${selected.appointment.id}`, {
      method: 'PUT', body: { doctorNotes: notes, diagnosis },
    });
    setSelected(null);
    load(tab);
  };

  const TABS = [
    { id: 'scheduled' as const, label: 'Предстоящие' },
    { id: 'completed' as const, label: 'Прошедшие' },
    { id: 'cancelled' as const, label: 'Отменённые' },
  ];

  return (
    <div>
      <div className="sticky top-0 z-30 bg-app/90 backdrop-blur-md px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#2a2540]">Приёмы</h1>
          <button onClick={() => setShowCreate(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-full text-white"
            style={{ background: 'var(--accent-dark)' }}>+ Создать</button>
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{ background: tab === t.id ? 'var(--accent-dark)' : '#fff', color: tab === t.id ? '#fff' : '#9a96a8', border: `1px solid ${tab === t.id ? 'var(--accent-dark)' : '#e8e4dc'}` }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-[color:var(--accent-dark)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appts.length === 0 ? (
          <div className="text-center py-12">
            <Icon3D name="calendar" size={48} />
            <p className="text-[#9a96a8] text-sm mt-3">Нет приёмов</p>
          </div>
        ) : appts.map(row => {
          const st = STATUS_STYLE[row.appointment.status] ?? STATUS_STYLE.scheduled;
          return (
            <button key={row.appointment.id} onClick={() => openAppt(row)}
              className="w-full bg-white rounded-2xl p-4 border flex items-center gap-3 text-left active:opacity-80">
              <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--accent-dark))' }}>
                {initials(row.patient.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#2a2540] text-sm">{row.patient.name}</p>
                <p className="text-xs text-[#9a96a8]">{fmtDate(row.appointment.scheduledAt)} · {fmtTime(row.appointment.scheduledAt)} · {row.appointment.durationMinutes} мин</p>
                <p className="text-xs text-[#9a96a8] capitalize">{row.appointment.type === 'offline' ? 'Очно' : 'Онлайн'}</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
                style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Create appointment modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Новый приём"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 py-3 rounded-xl text-sm font-medium border text-app-t3">Отмена</button>
            <button onClick={handleCreate} disabled={creating || !createForm.patientId || !createForm.date || !createForm.time}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-opacity"
              style={{ background: 'var(--accent-dark)', opacity: creating || !createForm.patientId || !createForm.date || !createForm.time ? 0.5 : 1 }}>
              {creating ? 'Создание...' : '+ Создать приём'}
            </button>
          </div>
        }
      >
        {/* Patient */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-app-t3">Пациент *</label>
          <select value={createForm.patientId} onChange={e => setCreateForm(f => ({ ...f, patientId: e.target.value }))}
            className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none bg-white"
            style={{ color: createForm.patientId ? '#2a2540' : '#9a96a8' }}>
            <option value="">Выбрать пациента...</option>
            {createPatients.map(p => <option key={p.user.id} value={p.user.id}>{p.user.name}</option>)}
          </select>
        </div>
        {/* Date + time */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-app-t3">Дата *</label>
            <input type="date" value={createForm.date} onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))}
              className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-app-t3">Время *</label>
            <input type="time" value={createForm.time} onChange={e => setCreateForm(f => ({ ...f, time: e.target.value }))}
              className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none" />
          </div>
        </div>
        {/* Type + duration */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-app-t3">Формат</label>
            <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}
              className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none bg-white" style={{ color: '#2a2540' }}>
              <option value="offline">🏥 Очно</option>
              <option value="online">💻 Онлайн</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-app-t3">Длительность</label>
            <select value={createForm.durationMinutes} onChange={e => setCreateForm(f => ({ ...f, durationMinutes: +e.target.value }))}
              className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none bg-white" style={{ color: '#2a2540' }}>
              <option value={15}>15 мин</option>
              <option value={30}>30 мин</option>
              <option value={45}>45 мин</option>
              <option value={60}>60 мин</option>
              <option value={90}>90 мин</option>
            </select>
          </div>
        </div>
        {/* Reason */}
        <div>
          <label className="text-xs font-semibold text-app-t3">Причина обращения</label>
          <input value={createForm.reason} onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Опционально..."
            className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none" />
        </div>
      </Modal>

      {/* Appointment detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.patient.name ?? ''}
        footer={
          <div className="flex gap-3">
            <button onClick={handleSaveNotes}
              className="flex-1 py-3 rounded-xl text-sm font-medium border text-[color:var(--accent-dark)]"
              style={{ borderColor: 'var(--accent-dark)' }}>Сохранить</button>
            {selected?.appointment.status === 'scheduled' && (
              <button onClick={handleComplete} disabled={completing}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white"
                style={{ background: 'var(--accent-dark)', opacity: completing ? 0.6 : 1 }}>
                {completing ? 'Завершение...' : '✓ Завершить приём'}
              </button>
            )}
          </div>
        }
      >
        {selected && (
          <>
            <div className="flex gap-3 text-xs text-app-t3 mb-4 flex-wrap">
              <span>📅 {fmtDate(selected.appointment.scheduledAt)}</span>
              <span>🕐 {fmtTime(selected.appointment.scheduledAt)}</span>
              <span>⏱ {selected.appointment.durationMinutes} мин</span>
              <span className="capitalize">{selected.appointment.type === 'offline' ? '🏥 Очно' : '💻 Онлайн'}</span>
            </div>

            {selected.appointment.reason && (
              <div className="mb-4 p-3 rounded-xl bg-[#f8f7ff]">
                <p className="text-xs text-app-t3">Причина обращения</p>
                <p className="text-sm text-app-t1 mt-0.5">{selected.appointment.reason}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-semibold text-app-t3">Заметки врача</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Введите заметки по приёму..."
                className="w-full mt-2 p-3 rounded-xl border text-sm outline-none resize-none"
                style={{ color: '#2a2540' }} />
            </div>

            <div>
              <label className="text-xs font-semibold text-app-t3">Диагноз</label>
              <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                placeholder="Введите диагноз..."
                className="w-full mt-2 p-3 rounded-xl border text-sm outline-none"
                style={{ color: '#2a2540' }} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
