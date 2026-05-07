'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface DoctorStats {
  totalConsultations: number;
  totalPatients: number;
  monthlyConsultations: number;
  rating: number;
  activePatients: number;
}

interface UpcomingItem {
  appointment: { id: string; scheduledAt: string; type: string; status: string };
  patient: { id: string; name: string; avatarUrl?: string };
}

interface PatientRow {
  connection: { consultationCount: number };
  user: { id: string; name: string };
}

interface Notif {
  id: string; type: string; title: string; message?: string;
  isRead: boolean; relatedPatientId?: string;
}

function initials(name: string) {
  return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function DoctorHomePage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [docName, setDocName] = useState('Доктор');
  const [docSpec, setDocSpec] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<DoctorStats>('/doctor/stats'),
      apiRequest<UpcomingItem[]>('/doctor/appointments/upcoming'),
      apiRequest<PatientRow[]>('/doctor/patients?status=active'),
      apiRequest<Notif[]>('/doctor/notifications?unread=true'),
      apiRequest<any>('/doctor/profile'),
      apiRequest<{ name: string }>('/users'),
    ]).then(([s, u, p, n, pr, usr]) => {
      if ('data' in s) setStats(s.data);
      if ('data' in u) setUpcoming(u.data ?? []);
      if ('data' in p) setPatients((p.data ?? []).slice(0, 3));
      if ('data' in n) setNotifs(n.data ?? []);
      if ('data' in pr && pr.data) {
        if (pr.data.specialization) setDocSpec(pr.data.specialization + (pr.data.clinicName ? ` · ${pr.data.clinicName}` : ''));
      }
      if ('data' in usr && usr.data?.name) setDocName(usr.data.name);
      setLoading(false);
    });
  }, []);

  const handlePatientRequest = async (notifId: string, patientId: string | undefined, action: 'accept' | 'archive') => {
    if (patientId) {
      if (action === 'accept') {
        await apiRequest(`/doctor/patients/accept`, { method: 'POST', body: { patientId } });
      } else {
        await apiRequest(`/doctor/patients/archive`, { method: 'POST', body: { patientId } });
      }
    }
    setNotifs(prev => prev.filter(n => n.id !== notifId));
  };

  const today = new Date();
  const todayAppts = upcoming.filter(u => new Date(u.appointment.scheduledAt).toDateString() === today.toDateString());
  const alertNotifs = notifs.filter(n => n.type === 'vital_anomaly');
  const pendingNotifs = notifs.filter(n => n.type === 'patient_request');
  const greeting = today.getHours() < 12 ? 'Доброе утро' : today.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';

  if (loading) return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[#6e5fa0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* TopBar */}
      <div className="sticky top-0 z-30 bg-[#f4f3ef]/90 backdrop-blur-md px-4 pt-12 pb-3 flex items-center gap-3">
        <span className="text-xl font-bold text-[#2a2540]">aivita</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#6e5fa0' }}>Врач</span>
        <div className="flex-1" />
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#f0eefc' }}>
            <Icon3D name="bell" size={18} />
          </div>
          {notifs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {Math.min(notifs.length, 9)}
            </span>
          )}
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
          {initials(docName)}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
          <p className="text-white/70 text-sm">{greeting}</p>
          <h1 className="text-xl font-bold mt-0.5">Dr. {docName.split(' ')[0]}</h1>
          {docSpec && <p className="text-white/80 text-xs mt-1">{docSpec}</p>}
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: 'family' as const, label: 'Пациентов', value: stats?.totalPatients ?? 0 },
            { icon: 'calendar' as const, label: 'Приёмов в месяце', value: stats?.monthlyConsultations ?? 0 },
            { icon: 'plus' as const, label: 'Приёмов сегодня', value: todayAppts.length },
            { icon: 'heart' as const, label: 'Рейтинг', value: stats?.rating ? `★ ${(+stats.rating).toFixed(1)}` : '—' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border flex flex-col gap-2" style={{ borderColor: '#e8e4dc' }}>
              <Icon3D name={c.icon} size={28} />
              <div className="text-2xl font-bold text-[#2a2540]">{c.value}</div>
              <div className="text-xs text-[#9a96a8] leading-tight">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Week mini-calendar */}
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
          <h2 className="text-sm font-bold text-[#2a2540] mb-3">Расписание недели</h2>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day, i) => {
              const d = new Date(today);
              d.setDate(d.getDate() - ((d.getDay() || 7) - 1) + i);
              const isToday = d.toDateString() === today.toDateString();
              const cnt = upcoming.filter(u => new Date(u.appointment.scheduledAt).toDateString() === d.toDateString()).length;
              return (
                <div key={day} className="flex flex-col items-center gap-1 p-1.5 rounded-xl"
                  style={{ background: isToday ? '#6e5fa0' : 'transparent' }}>
                  <span className="text-[10px] font-semibold" style={{ color: isToday ? '#fff' : '#9a96a8' }}>{day}</span>
                  <span className="text-sm font-bold" style={{ color: isToday ? '#fff' : '#2a2540' }}>{d.getDate()}</span>
                  {cnt > 0 && (
                    <span className="text-[9px] font-bold px-1.5 rounded-full"
                      style={{ background: isToday ? 'rgba(255,255,255,0.3)' : '#e8e4f0', color: isToday ? '#fff' : '#6e5fa0' }}>
                      {cnt}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nearest appointment */}
        {upcoming[0] && (
          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <h2 className="text-sm font-bold text-[#2a2540] mb-3">Ближайший приём</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                {initials(upcoming[0].patient.name)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#2a2540] text-sm">{upcoming[0].patient.name}</p>
                <p className="text-xs text-[#9a96a8] capitalize">{upcoming[0].appointment.type} · {fmtTime(upcoming[0].appointment.scheduledAt)}</p>
              </div>
              <Link href={`/${locale}/doctor-appointments`}
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: '#f0eefc', color: '#6e5fa0' }}>Открыть</Link>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alertNotifs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <h2 className="text-sm font-bold text-[#2a2540] mb-3">⚠️ Алерты</h2>
            <div className="space-y-2">
              {alertNotifs.slice(0, 3).map(n => (
                <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50">
                  <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#2a2540] font-medium">{n.title}</p>
                    {n.message && <p className="text-[10px] text-[#9a96a8] truncate">{n.message}</p>}
                  </div>
                  {n.relatedPatientId && (
                    <Link href={`/${locale}/doctor-patient/${n.relatedPatientId}`}
                      className="text-xs font-medium text-[#6e5fa0] flex-shrink-0">→</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New requests */}
        {pendingNotifs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <h2 className="text-sm font-bold text-[#2a2540] mb-3">🆕 Новые запросы ({pendingNotifs.length})</h2>
            <div className="space-y-2">
              {pendingNotifs.slice(0, 2).map(n => (
                <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
                  <p className="flex-1 text-xs text-[#2a2540]">{n.message ?? n.title}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => handlePatientRequest(n.id, n.relatedPatientId, 'accept')}
                      className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                      style={{ background: '#6e5fa0' }}>✓</button>
                    <button onClick={() => handlePatientRequest(n.id, n.relatedPatientId, 'archive')}
                      className="text-xs px-2.5 py-1 rounded-full text-[#9a96a8] bg-gray-100">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-col: patients + appts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-[#2a2540]">Пациенты</h2>
              <Link href={`/${locale}/doctor-patients`} className="text-xs text-[#6e5fa0]">Все →</Link>
            </div>
            <div className="space-y-2">
              {patients.length === 0 && <p className="text-xs text-[#9a96a8]">Нет пациентов</p>}
              {patients.map(p => (
                <Link key={p.user.id} href={`/${locale}/doctor-patient/${p.user.id}`}
                  className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                    {initials(p.user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2a2540] truncate">{p.user.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-[#9a96a8]">{p.connection.consultationCount} конс.</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-[#2a2540]">Приёмы</h2>
              <Link href={`/${locale}/doctor-appointments`} className="text-xs text-[#6e5fa0]">Все →</Link>
            </div>
            <div className="space-y-2">
              {upcoming.length === 0 && <p className="text-xs text-[#9a96a8]">Нет приёмов</p>}
              {upcoming.slice(0, 3).map(u => (
                <div key={u.appointment.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                    {initials(u.patient.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2a2540] truncate">{u.patient.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-[#9a96a8]">{fmtTime(u.appointment.scheduledAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI CTA */}
        <Link href={`/${locale}/doctor-ai`}>
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
            <div className="flex items-center gap-3 mb-3">
              <Icon3D name="sparkle" size={28} />
              <div>
                <h3 className="font-bold text-base">AI-ассистент врача</h3>
                <p className="text-white/70 text-xs">Анализ пациентов, диагнозы, анализы</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Анализ данных', 'Предложить диагноз', 'Рекомендовать анализы'].map(btn => (
                <span key={btn} className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>{btn}</span>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
