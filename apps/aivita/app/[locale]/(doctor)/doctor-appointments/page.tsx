'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface Appointment {
  id: string; scheduledAt: string; durationMinutes: number;
  type: string; status: string; reason?: string;
  doctorNotes?: string; diagnosis?: string;
}
interface PatientInfo { id: string; name: string; avatarUrl?: string; }
interface ApptRow { appointment: Appointment; patient: PatientInfo; }

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('ru', { day: '2-digit', month: 'short' }); }
function fmtTime(s: string) { return new Date(s).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }); }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  scheduled:  { bg: '#e8e4f0', color: '#6e5fa0', label: 'Запланирован' },
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

  const load = (status: string) => {
    setLoading(true);
    apiRequest<ApptRow[]>(`/doctor/appointments?status=${status}`)
      .then(res => { if ('data' in res) setAppts(res.data ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

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
    <div className="min-h-screen bg-[#f4f3ef]">
      <div className="sticky top-0 z-30 bg-[#f4f3ef]/90 backdrop-blur-md px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold text-[#2a2540] mb-3">Приёмы</h1>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{ background: tab === t.id ? '#6e5fa0' : '#fff', color: tab === t.id ? '#fff' : '#9a96a8', border: `1px solid ${tab === t.id ? '#6e5fa0' : '#e8e4dc'}` }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-[#6e5fa0] border-t-transparent rounded-full animate-spin" />
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
              className="w-full bg-white rounded-2xl p-4 border flex items-center gap-3 text-left active:opacity-80"
              style={{ borderColor: '#e8e4dc' }}>
              <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
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

      {/* Appointment detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#2a2540]">{selected.patient.name}</h3>
              <button onClick={() => setSelected(null)} className="text-[#9a96a8] text-xl">✕</button>
            </div>

            <div className="flex gap-3 text-xs text-[#9a96a8] mb-4 flex-wrap">
              <span>📅 {fmtDate(selected.appointment.scheduledAt)}</span>
              <span>🕐 {fmtTime(selected.appointment.scheduledAt)}</span>
              <span>⏱ {selected.appointment.durationMinutes} мин</span>
              <span className="capitalize">{selected.appointment.type === 'offline' ? '🏥 Очно' : '💻 Онлайн'}</span>
            </div>

            {selected.appointment.reason && (
              <div className="mb-4 p-3 rounded-xl bg-[#f8f7ff]">
                <p className="text-xs text-[#9a96a8]">Причина обращения</p>
                <p className="text-sm text-[#2a2540] mt-0.5">{selected.appointment.reason}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-semibold text-[#9a96a8]">Заметки врача</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Введите заметки по приёму..."
                className="w-full mt-2 p-3 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: '#e8e4dc', color: '#2a2540' }} />
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-[#9a96a8]">Диагноз</label>
              <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                placeholder="Введите диагноз..."
                className="w-full mt-2 p-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#e8e4dc', color: '#2a2540' }} />
            </div>

            <div className="flex gap-3">
              <button onClick={handleSaveNotes}
                className="flex-1 py-3 rounded-xl text-sm font-medium border text-[#6e5fa0]"
                style={{ borderColor: '#6e5fa0' }}>Сохранить</button>
              {selected.appointment.status === 'scheduled' && (
                <button onClick={handleComplete} disabled={completing}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white"
                  style={{ background: '#6e5fa0', opacity: completing ? 0.6 : 1 }}>
                  {completing ? 'Завершение...' : '✓ Завершить приём'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
