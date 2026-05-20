'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import Modal from '@/components/ui/Modal';

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
  appointment: { icon: '🩺', label: 'Приём', color: 'var(--accent-bg)' },
  prescription: { icon: '💊', label: 'Назначение', color: '#e8f4ec' },
  vital:        { icon: '📊', label: 'Показатель', color: '#fff3e8' },
};

/** Compute 0-100 score from a vital value */
function computeScore(type: string, value: any): number {
  switch (type) {
    case 'heart_rate': { const v = value?.value ?? value; return v >= 60 && v <= 100 ? 100 : v >= 50 && v <= 110 ? 70 : 30; }
    case 'blood_pressure': { const s = value?.systolic; const d = value?.diastolic; if (!s || !d) return 50; return s < 130 && d < 85 ? 90 : s < 140 && d < 90 ? 60 : 30; }
    case 'blood_sugar': { const v = value?.value ?? value; return v >= 70 && v <= 100 ? 100 : v >= 60 && v <= 126 ? 70 : 30; }
    case 'spo2': { const v = value?.value ?? value; return v >= 96 ? 100 : v >= 90 ? 60 : 20; }
    case 'sleep_hours': { const v = value?.hours ?? value?.value ?? value; return v >= 7 && v <= 9 ? 100 : v >= 6 && v <= 10 ? 70 : 40; }
    default: return 50;
  }
}

function HealthScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx={22} cy={22} r={r} fill="none" stroke="#f0f0f0" strokeWidth={4} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 22 22)" />
        <text x={22} y={26} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#2a2540">{score}</text>
      </svg>
      <span className="text-[9px] text-[#9a96a8] text-center leading-tight">{label}</span>
    </div>
  );
}

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

function VideoCallButton({ patientId, locale }: { patientId: string; locale: string }) {
  const [loading, setLoading] = useState(false);

  async function start() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ id: string; roomId: string }>('/video-call/create', {
        method: 'POST',
        body: { patientId },
      });
      if ('data' in res && res.data?.roomId) {
        window.location.href = `/${locale}/doctor-video-call/${res.data.roomId}?callId=${res.data.id}`;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void start()}
      disabled={loading}
      className="text-xs font-medium px-3 py-1.5 rounded-full text-white flex items-center gap-1"
      style={{ background: '#28a745', opacity: loading ? 0.7 : 1 }}
    >
      {loading ? '⏳' : '📹'} Звонок
    </button>
  );
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[color:var(--accent-dark)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!patient) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-[#9a96a8]">Пациент не найден</p>
    </div>
  );

  const age = calcAge(patient.profile?.dateOfBirth);
  const vitals = patient.latestVitals ?? [];
  const pinnedNotes = notes.filter(n => n.isPinned);
  const otherNotes = notes.filter(n => !n.isPinned);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-app/90 backdrop-blur-md px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href={`/${locale}/doctor-patients`} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border text-[color:var(--accent-dark)] font-bold text-lg border-app-border">‹</Link>
        <h1 className="font-bold text-[#2a2540] flex-1 truncate">{patient.user.name}</h1>
        <VideoCallButton patientId={patientId} locale={locale} />
        <Link href={`/${locale}/doctor-scribe?patientId=${patientId}`}
          className="text-xs font-medium px-3 py-1.5 rounded-full text-white flex items-center gap-1"
          style={{ background: 'var(--accent-dark)' }}>🎙️ Приём</Link>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Hero */}
        <div className="bg-white rounded-2xl p-5 border flex gap-4 border-app-border">
          <div className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--accent-dark))' }}>
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

        {/* Health Score rings */}
        {vitals.length > 0 && (() => {
          const SCORE_TYPES = [
            { type: 'heart_rate', label: 'Пульс', color: '#e05a6a' },
            { type: 'blood_pressure', label: 'Давление', color: '#5e75a8' },
            { type: 'blood_sugar', label: 'Сахар', color: '#c04080' },
            { type: 'spo2', label: 'SpO2', color: '#4a7fb5' },
            { type: 'sleep_hours', label: 'Сон', color: '#548068' },
          ];
          const scores = SCORE_TYPES.map(s => ({
            ...s, score: vitals.find(v => v.type === s.type) ? computeScore(s.type, vitals.find(v => v.type === s.type)!.value) : -1,
          })).filter(s => s.score >= 0);
          if (scores.length === 0) return null;
          const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
          return (
            <div className="bg-white rounded-2xl p-4 border border-app-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#2a2540]">Health Score</h3>
                <span className="text-2xl font-extrabold" style={{ color: avg >= 80 ? '#4caf82' : avg >= 60 ? '#e8a000' : '#f47c5f' }}>{avg}</span>
              </div>
              <div className="flex justify-around">
                {scores.map(s => <HealthScoreRing key={s.type} score={s.score} label={s.label} color={s.color} />)}
              </div>
            </div>
          );
        })()}

        {/* Latest vitals grid */}
        {vitals.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-app-border">
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
          <div className="bg-white rounded-2xl p-4 border border-app-border">
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
              style={{ background: activeTab === t ? 'var(--accent-dark)' : '#fff', color: activeTab === t ? '#fff' : '#9a96a8', border: `1px solid ${activeTab === t ? 'var(--accent-dark)' : '#e8e4dc'}` }}>
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
                <div key={i} className="bg-white rounded-2xl p-4 border flex gap-3 border-app-border">
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
                <div key={i} className="bg-white rounded-xl p-3 border flex items-center gap-3 border-app-border">
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
              className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium text-[color:var(--accent-dark)] flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--accent-dark)' }}>
              <span>+</span> Добавить заметку
            </button>
            {pinnedNotes.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-4 border" style={{ background: '#fffbf0' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">📌</span>
                  <span className="text-[10px] text-[#9a96a8]">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="text-sm text-[#2a2540]">{n.text}</p>
              </div>
            ))}
            {otherNotes.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-4 border border-app-border">
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
            { label: '💬 Написать', href: `/${locale}/doctor-chats?patientId=${patientId}` },
            { label: '📅 Записать', href: `/${locale}/doctor-appointments?patientId=${patientId}` },
            { label: '💊 Назначить', href: `/${locale}/doctor-prescriptions?patientId=${patientId}` },
            { label: '📋 Отчёт', href: `/${locale}/doctor-patient/${patientId}` },
          ].map(btn => (
            <Link key={btn.label} href={btn.href}>
              <button className="w-full py-3 rounded-xl text-sm font-medium border text-[#2a2540] bg-white">
                {btn.label}
              </button>
            </Link>
          ))}
        </div>
        <Link href={`/${locale}/doctor-drug-checker?patientId=${patientId}`}>
          <button className="w-full py-3 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-2"
            style={{ borderColor: '#6BA3D6', color: '#4a7fb5', background: '#f0f7ff' }}>
            🔍 Проверить совместимость лекарств
          </button>
        </Link>
      </div>

      {/* Add note modal */}
      <Modal
        isOpen={showAddNote}
        onClose={() => setShowAddNote(false)}
        title="Новая заметка"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowAddNote(false)}
              className="flex-1 py-3 rounded-xl text-sm font-medium border text-app-t3">Отмена</button>
            <button onClick={handleAddNote} disabled={savingNote}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-opacity"
              style={{ background: 'var(--accent-dark)', opacity: savingNote ? 0.6 : 1 }}>
              {savingNote ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        }
      >
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Введите заметку..."
          rows={5}
          className="w-full p-3 rounded-xl border text-sm outline-none resize-none"
          style={{ color: '#2a2540' }}
          autoFocus
        />
      </Modal>
    </div>
  );
}
