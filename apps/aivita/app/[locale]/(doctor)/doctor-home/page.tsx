'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { TopBar } from '@/components/cabinet/dashboard/TopBar';
import { EarningsBlock } from '@/components/doctors/EarningsBlock';

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

interface PrescRow {
  prescription: { id: string; type: string; title: string; status: string; createdAt: string };
  patient: { id: string; name: string };
}

interface UserInfo { id: string; name: string; email: string; }

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
  const [prescriptions, setPrescriptions] = useState<PrescRow[]>([]);
  const [docName, setDocName] = useState('Доктор');
  const [docSpec, setDocSpec] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docId, setDocId] = useState('');
  const [loading, setLoading] = useState(true);

  function getMinutesUntil(isoDate: string) {
    const diff = Math.round((new Date(isoDate).getTime() - Date.now()) / 60000);
    if (diff < 0) return null;
    if (diff === 0) return 'сейчас';
    if (diff < 60) return `через ${diff} мин`;
    const h = Math.floor(diff / 60);
    return `через ${h} ч ${diff % 60 ? `${diff % 60} мин` : ''}`;
  }

  useEffect(() => {
    Promise.all([
      apiRequest<DoctorStats>('/doctor/stats'),
      apiRequest<UpcomingItem[]>('/doctor/appointments/upcoming'),
      apiRequest<PatientRow[]>('/doctor/patients?status=active'),
      apiRequest<Notif[]>('/doctor/notifications?unread=true'),
      apiRequest<any>('/doctor/profile'),
      apiRequest<UserInfo>('/users'),
      apiRequest<PrescRow[]>('/doctor/prescriptions?status=active'),
    ]).then(([s, u, p, n, pr, usr, presc]) => {
      if ('data' in s) setStats(s.data);
      if ('data' in u) setUpcoming(u.data ?? []);
      if ('data' in p) setPatients((p.data ?? []).slice(0, 3));
      if ('data' in n) setNotifs(n.data ?? []);
      if ('data' in pr && pr.data) {
        if (pr.data.specialization) setDocSpec(pr.data.specialization + (pr.data.clinicName ? ` · ${pr.data.clinicName}` : ''));
      }
      if ('data' in usr && usr.data) {
        if (usr.data.name) setDocName(usr.data.name);
        if (usr.data.email) setDocEmail(usr.data.email);
        if (usr.data.id) setDocId(usr.data.id);
      }
      if ('data' in presc) setPrescriptions((presc.data ?? []).slice(0, 3));
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent) transparent var(--accent) var(--accent)' }} />
    </div>
  );

  return (
    <div>
      {/* TopBar */}
      <TopBar
        avatarInitial={initials(docName)}
        session={{ userId: docId, name: docName, email: docEmail, role: 'doctor', onboardingCompleted: true }}
        locale={locale}
        role="doctor"
        unreadCount={notifs.length}
      />

      <div className="px-4 pb-4 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
          <p className="text-white/70 text-sm">{greeting}</p>
          <h1 className="text-xl font-bold mt-0.5">Dr. {docName.split(' ')[0]}</h1>
          {docSpec && <p className="text-white/80 text-xs mt-1">{docSpec}</p>}
        </div>

        {/* AI CTA */}
        <Link href={`/${locale}/doctor-ai`} className="block">
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
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

        {/* ── Earnings & consultations monitoring ── */}
        <EarningsBlock locale={locale} />

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: 'family' as const, label: 'Пациентов', value: stats?.totalPatients ?? 0 },
            { icon: 'calendar' as const, label: 'Приёмов в месяце', value: stats?.monthlyConsultations ?? 0 },
            { icon: 'plus' as const, label: 'Приёмов сегодня', value: todayAppts.length },
            { icon: 'heart' as const, label: 'Рейтинг', value: stats?.rating ? `★ ${(+stats.rating).toFixed(1)}` : '—' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border flex flex-col gap-2 border-app-border">
              <Icon3D name={c.icon} size={28} />
              <div className="text-2xl font-bold text-[#2a2540]">{c.value}</div>
              <div className="text-xs text-[#9a96a8] leading-tight">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Week mini-calendar */}
        <div className="bg-white rounded-2xl p-4 border border-app-border">
          <h2 className="text-sm font-bold text-[#2a2540] mb-3">Расписание недели</h2>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day, i) => {
              const d = new Date(today);
              d.setDate(d.getDate() - ((d.getDay() || 7) - 1) + i);
              const isToday = d.toDateString() === today.toDateString();
              const cnt = upcoming.filter(u => new Date(u.appointment.scheduledAt).toDateString() === d.toDateString()).length;
              return (
                <div key={day} className="flex flex-col items-center gap-1 p-1.5 rounded-xl"
                  style={{ background: isToday ? 'var(--accent)' : 'transparent' }}>
                  <span className="text-[10px] font-semibold" style={{ color: isToday ? '#fff' : '#9a96a8' }}>{day}</span>
                  <span className="text-sm font-bold" style={{ color: isToday ? '#fff' : '#2a2540' }}>{d.getDate()}</span>
                  {cnt > 0 && (
                    <span className="text-[9px] font-bold px-1.5 rounded-full"
                      style={{ background: isToday ? 'rgba(255,255,255,0.3)' : 'var(--accent-light)', color: isToday ? '#fff' : 'var(--accent-dark)' }}>
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
          <div className="bg-white rounded-2xl p-4 border border-app-border">
            <h2 className="text-sm font-bold text-[#2a2540] mb-3">Ближайший приём</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
                {initials(upcoming[0].patient.name)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#2a2540] text-sm">{upcoming[0].patient.name}</p>
                <p className="text-xs text-[#9a96a8] capitalize">{upcoming[0].appointment.type === 'offline' ? 'Очно' : 'Онлайн'} · {fmtTime(upcoming[0].appointment.scheduledAt)}</p>
                {getMinutesUntil(upcoming[0].appointment.scheduledAt) && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--accent-dark)' }}>
                    {getMinutesUntil(upcoming[0].appointment.scheduledAt)}
                  </p>
                )}
              </div>
              <Link href={`/${locale}/doctor-appointments`}
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}>Открыть</Link>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alertNotifs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-app-border">
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
                      className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>→</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New requests */}
        {pendingNotifs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-app-border">
            <h2 className="text-sm font-bold text-[#2a2540] mb-3">🆕 Новые запросы ({pendingNotifs.length})</h2>
            <div className="space-y-2">
              {pendingNotifs.slice(0, 2).map(n => (
                <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--accent-bg)' }}>
                  <p className="flex-1 text-xs text-[#2a2540]">{n.message ?? n.title}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => handlePatientRequest(n.id, n.relatedPatientId, 'accept')}
                      className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                      style={{ background: 'var(--accent)' }}>✓</button>
                    <button onClick={() => handlePatientRequest(n.id, n.relatedPatientId, 'archive')}
                      className="text-xs px-2.5 py-1 rounded-full text-[#9a96a8] bg-gray-100">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-col: patients + appts */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-white rounded-2xl p-4 border border-app-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-[#2a2540]">Пациенты</h2>
              <Link href={`/${locale}/doctor-patients`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Все →</Link>
            </div>
            <div className="space-y-2">
              {patients.length === 0 && <p className="text-xs text-[#9a96a8]">Нет пациентов</p>}
              {patients.map(p => (
                <Link key={p.user.id} href={`/${locale}/doctor-patient/${p.user.id}`}
                  className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
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

          <div className="bg-white rounded-2xl p-4 border border-app-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-[#2a2540]">Приёмы</h2>
              <Link href={`/${locale}/doctor-appointments`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Все →</Link>
            </div>
            <div className="space-y-2">
              {upcoming.length === 0 && <p className="text-xs text-[#9a96a8]">Нет приёмов</p>}
              {upcoming.slice(0, 3).map(u => (
                <div key={u.appointment.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
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

        {/* Latest prescriptions */}
        {prescriptions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-app-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2a2540]">Последние назначения</h2>
              <Link href={`/${locale}/doctor-prescriptions`} className="text-xs font-medium" style={{ color: 'var(--accent-dark)' }}>Все →</Link>
            </div>
            <div className="space-y-2">
              {prescriptions.map(row => {
                const icons: Record<string, string> = { medication: '💊', test: '🧪', procedure: '🩺' };
                const statusBg: Record<string, string> = { active: '#e8f0ff', pending: '#fff3e8', completed: '#e8f4ec' };
                const statusColor: Record<string, string> = { active: 'var(--accent-dark)', pending: '#c07038', completed: '#2d7a56' };
                const statusLabel: Record<string, string> = { active: 'Активно', pending: 'Ожидание', completed: 'Выполнено' };
                return (
                  <div key={row.prescription.id} className="flex items-center gap-3">
                    <span className="text-lg">{icons[row.prescription.type] ?? '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2a2540] truncate">{row.prescription.title}</p>
                      <p className="text-[10px] text-[#9a96a8]">{row.patient.name}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: statusBg[row.prescription.status] ?? '#f0f0f0', color: statusColor[row.prescription.status] ?? '#9a96a8' }}>
                      {statusLabel[row.prescription.status] ?? row.prescription.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent chats */}
        {patients.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-app-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2a2540]">Чаты с пациентами</h2>
              <Link href={`/${locale}/doctor-chats`} className="text-xs font-medium" style={{ color: 'var(--accent-dark)' }}>Все →</Link>
            </div>
            <div className="space-y-2">
              {patients.slice(0, 2).map(p => (
                <Link key={p.user.id} href={`/${locale}/doctor-chats`}
                  className="flex items-center gap-3 active:opacity-70">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
                    {initials(p.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#2a2540] truncate">{p.user.name}</p>
                    <p className="text-[10px] text-[#9a96a8]">{p.connection.consultationCount} консультаций</p>
                  </div>
                  <span className="text-[#9a96a8] text-sm">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
