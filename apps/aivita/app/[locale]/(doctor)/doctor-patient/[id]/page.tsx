'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface PatientData {
  user: { id: string; name: string; email: string; avatarUrl?: string };
  profile?: { bloodType?: string; allergies?: string[]; chronicConditions?: string[]; gender?: string; dateOfBirth?: string; city?: string };
  connection: { consultationCount: number; lastConsultationAt?: string; notes?: string };
  latestVitals: Array<{ type: string; value: any; recordedAt: string }>;
}

interface TimelineItem {
  date: string;
  type: 'appointment' | 'prescription' | 'vital';
  data: any;
}

interface Note { id: string; text: string; isPinned: boolean; createdAt: string; }

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(s?: string) { return s ? new Date(s).toLocaleDateString('ru') : '—'; }
function fmtTime(s: string) { return new Date(s).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }); }
function calcAge(dob?: string) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

const TYPE_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  appointment: { icon: '🩺', label: 'Приём', color: '#e8e4f0' },
  prescription: { icon: '💊', label: 'Назначение', color: '#e8f4ec' },
  vital:        { icon: '📊', label: 'Показатель', color: '#fff3e8' },
};

function getVitalDisplay(v: { type: string; value: any }) {
  const val = v.value;
  switch (v.type) {
    case 'heart_rate': return { label: 'Пульс', value: `${val?.value ?? val} уд/мин`, icon: '❤️' };
    case 'blood_pressure': return { label: 'Давление', value: `${val?.systolic}/${val?.diastolic}`, icon: '🩸' };
    case 'weight': return { label: 'Вес', value: `${val?.value ?? val} кг`, icon: '⚖️' };
    case 'blood_sugar': return { label: 'Сахар', value: `${val?.value ?? val} ммоль/л`, icon: '🧪' };
    case 'spo2': return { label: 'SpO2', value: `${val?.value ?? val}%`, icon: '💨' };
    case 'temperature': return { label: 'Темп.', value: `${val?.value ?? val}°C`, icon: '🌡️' };
    default: return { label: v.type, value: JSON.stringify(val), icon: '📈' };
  }
}

export default function DoctorPatientPage() {
  const params = useParams<{ locale: string; id: string }>();
  const locale = params?.locale ?? 'ru';
  const patientId = params?.id ?? '';

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'vitals' | 'notes'>('timeline');

  useEffect(() => {
    if (!patientId) return;
    Promise.all([
      apiRequest<PatientData>(`/doctor/patients/${patientId}`),
      apiRequest<TimelineItem[]>(`/doctor/patients/${patientId}/timeline`),
      apiRequest<Note[]>(`/doctor/notes?patientId=${patientId}`),
    ]).then(([p, t, n]) => {
      if ('data' in p) setPatient(p.data);
      if ('data' in t) setTimeline(t.data ?? []);
      if ('data' in n) setNotes(n.data ?? []);
      setLoading(false);
    });
  }, [patientId]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await apiRequest<Note>('/doctor/notes', {
      method: 'POST', body: { patientId, text: noteText, isPinned: false },
    });
    if ('data' in res) setNotes(prev => [res.data, ...prev]);
    setNoteText('');
    setShowAddNote(false);
    setSavingNote(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[#6e5fa0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center">
      <p className="text-[#9a96a8]">Пациент не найден</p>
    </div>
  );

  const age = calcAge(patient.profile?.dateOfBirth);
  const vitals = patient.latestVitals ?? [];
  const pinnedNotes = notes.filter(n => n.isPinned);
  const otherNotes = notes.filter(n => !n.isPinned);

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f4f3ef]/90 backdrop-blur-md px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href={`/${locale}/doctor-patients`} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border text-[#6e5fa0] font-bold text-lg" style={{ borderColor: '#e8e4dc' }}>‹</Link>
        <h1 className="font-bold text-[#2a2540] flex-1 truncate">{patient.user.name}</h1>
        <Link href={`/${locale}/doctor-appointments`}
          className="text-xs font-medium px-3 py-1.5 rounded-full text-white"
          style={{ background: '#6e5fa0' }}>+ Приём</Link>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Hero */}
        <div className="bg-white rounded-2xl p-5 border flex gap-4" style={{ borderColor: '#e8e4dc' }}>
          <div className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
            {initials(patient.user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[#2a2540] text-base">{patient.user.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {age && <span className="text-xs text-[#9a96a8]">{age} лет</span>}
              {patient.profile?.gender && <span className="text-xs text-[#9a96a8]">· {patient.profile.gender === 'male' ? 'Муж.' : 'Жен.'}</span>}
              {patient.profile?.city && <span className="text-xs text-[#9a96a8]">· {patient.profile.city}</span>}
              {patient.profile?.bloodType && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#ffe8e8', color: '#c0304a' }}>
                  {patient.profile.bloodType}
                </span>
              )}
            </div>
            <p className="text-xs text-[#9a96a8] mt-1">{patient.connection.consultationCount} консультаций</p>
          </div>
        </div>

        {/* Latest vitals grid */}
        {vitals.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <h3 className="text-sm font-bold text-[#2a2540] mb-3">Последние показатели</h3>
            <div className="grid grid-cols-3 gap-2">
              {vitals.slice(0, 6).map((v, i) => {
                const d = getVitalDisplay(v);
                return (
                  <div key={i} className="rounded-xl p-3 text-center" style={{ background: '#f8f7ff' }}>
                    <div className="text-lg mb-1">{d.icon}</div>
                    <div className="text-xs font-bold text-[#2a2540]">{d.value}</div>
                    <div className="text-[10px] text-[#9a96a8]">{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medical profile */}
        {patient.profile && (patient.profile.allergies?.length || patient.profile.chronicConditions?.length) ? (
          <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
            <h3 className="text-sm font-bold text-[#2a2540] mb-3">Мед. профиль</h3>
            {patient.profile.allergies && patient.profile.allergies.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-[#9a96a8] mb-1">Аллергии</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.profile.allergies.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {patient.profile.chronicConditions && patient.profile.chronicConditions.length > 0 && (
              <div>
                <p className="text-xs text-[#9a96a8] mb-1">Хронические</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.profile.chronicConditions.map((c, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Tabs: Timeline / Notes */}
        <div className="flex gap-2">
          {(['timeline', 'vitals', 'notes'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: activeTab === t ? '#6e5fa0' : '#fff', color: activeTab === t ? '#fff' : '#9a96a8', border: `1px solid ${activeTab === t ? '#6e5fa0' : '#e8e4dc'}` }}>
              {t === 'timeline' ? 'Таймлайн' : t === 'vitals' ? 'Показатели' : `Заметки (${notes.length})`}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {timeline.length === 0 && <p className="text-center text-[#9a96a8] text-sm py-8">Нет событий</p>}
            {timeline.slice(0, 20).map((item, i) => {
              const meta = TYPE_ICONS[item.type] ?? TYPE_ICONS.appointment;
              return (
                <div key={i} className="bg-white rounded-2xl p-4 border flex gap-3" style={{ borderColor: '#e8e4dc' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: meta.color }}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#2a2540]">{meta.label}</p>
                    {item.type === 'appointment' && (
                      <p className="text-xs text-[#9a96a8]">{fmtDate(item.date)} {fmtTime(item.date)} · {item.data.status}</p>
                    )}
                    {item.type === 'prescription' && (
                      <p className="text-xs text-[#9a96a8]">{item.data.title} · {item.data.status}</p>
                    )}
                    {item.type === 'vital' && (
                      <p className="text-xs text-[#9a96a8]">{getVitalDisplay(item.data).label}: {getVitalDisplay(item.data).value}</p>
                    )}
                    <p className="text-[10px] text-[#9a96a8] mt-0.5">{fmtDate(item.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All vitals */}
        {activeTab === 'vitals' && (
          <div className="space-y-2">
            {vitals.length === 0 && <p className="text-center text-[#9a96a8] text-sm py-8">Нет данных</p>}
            {vitals.map((v, i) => {
              const d = getVitalDisplay(v);
              return (
                <div key={i} className="bg-white rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: '#e8e4dc' }}>
                  <span className="text-xl">{d.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-[#9a96a8]">{d.label}</p>
                    <p className="font-bold text-[#2a2540] text-sm">{d.value}</p>
                  </div>
                  <p className="text-[10px] text-[#9a96a8]">{fmtDate(v.recordedAt)}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <button onClick={() => setShowAddNote(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium text-[#6e5fa0] flex items-center justify-center gap-2"
              style={{ borderColor: '#6e5fa0' }}>
              <span>+</span> Добавить заметку
            </button>
            {pinnedNotes.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc', background: '#fffbf0' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">📌</span>
                  <span className="text-[10px] text-[#9a96a8]">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="text-sm text-[#2a2540]">{n.text}</p>
              </div>
            ))}
            {otherNotes.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
                <p className="text-[10px] text-[#9a96a8] mb-1">{fmtDate(n.createdAt)}</p>
                <p className="text-sm text-[#2a2540]">{n.text}</p>
              </div>
            ))}
            {notes.length === 0 && !showAddNote && (
              <p className="text-center text-[#9a96a8] text-sm py-8">🔒 Заметок нет</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '💬 Написать', href: `/${locale}/doctor-chats` },
            { label: '📅 Записать', href: `/${locale}/doctor-appointments` },
            { label: '💊 Назначить', href: `/${locale}/doctor-prescriptions` },
            { label: '📋 Отчёт', href: `/${locale}/doctor-patients` },
          ].map(btn => (
            <Link key={btn.label} href={btn.href}>
              <button className="w-full py-3 rounded-xl text-sm font-medium border text-[#2a2540] bg-white"
                style={{ borderColor: '#e8e4dc' }}>
                {btn.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Add note modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6">
            <h3 className="font-bold text-[#2a2540] mb-4">Новая заметка</h3>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Введите заметку..."
              rows={5}
              className="w-full p-3 rounded-xl border text-sm outline-none resize-none"
              style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddNote(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border text-[#9a96a8]"
                style={{ borderColor: '#e8e4dc' }}>Отмена</button>
              <button onClick={handleAddNote} disabled={savingNote}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-opacity"
                style={{ background: '#6e5fa0', opacity: savingNote ? 0.6 : 1 }}>
                {savingNote ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
