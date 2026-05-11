'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface ScheduleDay {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

interface Appointment {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  status: string;
  patientId: string;
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const DEFAULT_DAYS: ScheduleDay[] = [0, 1, 2, 3, 4].map(d => ({
  dayOfWeek: d, startTime: '09:00', endTime: '18:00',
  breakStart: '13:00', breakEnd: '14:00', slotDurationMinutes: 30, isActive: true,
}));

export default function DoctorSchedulePage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editDays, setEditDays] = useState<ScheduleDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const todayDow = ((today.getDay() || 7) - 1); // 0=Mon

  useEffect(() => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - todayDow);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    Promise.all([
      apiRequest<ScheduleDay[]>('/doctor/schedule'),
      apiRequest<Appointment[]>(`/doctor/appointments?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`),
    ]).then(([s, a]) => {
      const sched = 'data' in s ? (s.data ?? []) : [];
      setSchedule(sched);
      setEditDays(sched.length ? [...sched] : [...DEFAULT_DAYS]);
      if ('data' in a) setAppointments(a.data ?? []);
      setLoading(false);
    });
  }, []);

  const getApptForDay = (dow: number) => {
    return appointments.filter(a => {
      const d = new Date(a.scheduledAt);
      return ((d.getDay() || 7) - 1) === dow;
    });
  };

  const getDaySchedule = (dow: number) => schedule.find(s => s.dayOfWeek === dow);

  const handleSave = async () => {
    setSaving(true);
    const res = await apiRequest('/doctor/schedule', { method: 'PUT', body: { days: editDays } });
    if ('data' in res) { setSchedule(editDays); setShowSettings(false); }
    setSaving(false);
  };

  const updateEditDay = (dow: number, field: keyof ScheduleDay, value: any) => {
    setEditDays(prev => prev.map(d => d.dayOfWeek === dow ? { ...d, [field]: value } : d));
  };

  const toggleDay = (dow: number) => {
    setEditDays(prev => {
      const existing = prev.find(d => d.dayOfWeek === dow);
      if (existing) return prev.map(d => d.dayOfWeek === dow ? { ...d, isActive: !d.isActive } : d);
      return [...prev, { dayOfWeek: dow, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30, isActive: true }];
    });
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[color:var(--accent-dark)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-app/90 backdrop-blur-md px-4 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#2a2540]">Расписание</h1>
        <button onClick={() => { setShowSettings(true); setEditDays([...schedule.length ? schedule : DEFAULT_DAYS]); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border" style={{ borderColor: '#e8e4dc' }}>
          <Icon3D name="settings" size={18} />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Week header */}
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
          <p className="text-xs text-[#9a96a8] mb-3 font-medium">Текущая неделя</p>
          <div className="grid grid-cols-7 gap-1">
            {DAYS_RU.map((day, i) => {
              const d = new Date(today);
              d.setDate(d.getDate() - todayDow + i);
              const isToday = i === todayDow;
              const sched = getDaySchedule(i);
              const appts = getApptForDay(i);
              const isWorkday = sched?.isActive;

              return (
                <button key={day} onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors"
                  style={{
                    background: selectedDay === i ? 'var(--accent-dark)' : isToday ? 'var(--accent-bg)' : 'transparent',
                    opacity: isWorkday ? 1 : 0.4,
                  }}>
                  <span className="text-[10px] font-semibold"
                    style={{ color: selectedDay === i ? '#fff' : '#9a96a8' }}>{day}</span>
                  <span className="text-sm font-bold"
                    style={{ color: selectedDay === i ? '#fff' : '#2a2540' }}>{d.getDate()}</span>
                  {appts.length > 0 && (
                    <span className="text-[9px] font-bold px-1 rounded-full"
                      style={{ background: selectedDay === i ? 'rgba(255,255,255,0.3)' : 'var(--accent-bg)', color: selectedDay === i ? '#fff' : 'var(--accent-dark)' }}>
                      {appts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay !== null && (() => {
          const sched = getDaySchedule(selectedDay);
          const appts = getApptForDay(selectedDay);
          return (
            <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
              <h2 className="text-sm font-bold text-[#2a2540] mb-3">{DAYS_FULL[selectedDay]}</h2>
              {!sched?.isActive ? (
                <p className="text-sm text-[#9a96a8]">Выходной день</p>
              ) : (
                <>
                  <div className="flex gap-4 text-xs text-[#9a96a8] mb-3">
                    <span>🕐 {sched.startTime} – {sched.endTime}</span>
                    {sched.breakStart && <span>☕ {sched.breakStart} – {sched.breakEnd}</span>}
                    <span>⏱ {sched.slotDurationMinutes} мин</span>
                  </div>
                  {appts.length === 0 ? (
                    <p className="text-sm text-[#9a96a8]">Нет приёмов</p>
                  ) : (
                    <div className="space-y-2">
                      {appts.map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: a.status === 'cancelled' ? '#fff8f0' : '#f0eefc' }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: a.status === 'completed' ? '#4caf82' : a.status === 'cancelled' ? '#f47c5f' : 'var(--accent-dark)' }} />
                          <span className="text-xs font-medium text-[#2a2540]">
                            {new Date(a.scheduledAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-[#9a96a8] capitalize">{a.type} · {a.durationMinutes} мин</span>
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: a.status === 'completed' ? '#e8f4ec' : a.status === 'cancelled' ? '#fff0ec' : 'var(--accent-bg)',
                              color: a.status === 'completed' ? '#2d7a56' : a.status === 'cancelled' ? '#c0304a' : 'var(--accent-dark)',
                            }}>
                            {a.status === 'completed' ? 'Завершён' : a.status === 'cancelled' ? 'Отменён' : 'Запланирован'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Full week overview */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-[#2a2540]">Рабочие дни</h2>
          {DAYS_FULL.map((name, i) => {
            const sched = getDaySchedule(i);
            const cnt = getApptForDay(i).length;
            return (
              <div key={i} className="bg-white rounded-xl p-4 border flex items-center gap-3"
                style={{ borderColor: '#e8e4dc', opacity: sched?.isActive ? 1 : 0.5 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: i === todayDow ? 'var(--accent-dark)' : '#f0eefc', color: i === todayDow ? '#fff' : 'var(--accent-dark)' }}>
                  {DAYS_RU[i]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2a2540]">{name}</p>
                  {sched?.isActive
                    ? <p className="text-xs text-[#9a96a8]">{sched.startTime} – {sched.endTime}</p>
                    : <p className="text-xs text-[#9a96a8]">Выходной</p>
                  }
                </div>
                {cnt > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent-dark)' }}>{cnt} приём</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#2a2540] text-lg">Настройки расписания</h3>
              <button onClick={() => setShowSettings(false)} className="text-[#9a96a8] text-xl">✕</button>
            </div>

            {/* Working days */}
            <p className="text-xs font-bold text-[#9a96a8] uppercase tracking-wide mb-3">Рабочие дни</p>
            <div className="flex gap-2 mb-5">
              {DAYS_RU.map((day, i) => {
                const isActive = editDays.find(d => d.dayOfWeek === i)?.isActive ?? false;
                return (
                  <button key={day} onClick={() => toggleDay(i)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                    style={{ background: isActive ? 'var(--accent-dark)' : '#f0f0f0', color: isActive ? '#fff' : '#9a96a8' }}>
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Per-day settings */}
            {editDays.filter(d => d.isActive).sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(d => (
              <div key={d.dayOfWeek} className="mb-4 p-4 rounded-2xl bg-[#f8f7ff]">
                <p className="text-sm font-bold text-[#2a2540] mb-3">{DAYS_FULL[d.dayOfWeek]}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9a96a8]">Начало</label>
                    <input type="time" value={d.startTime} onChange={e => updateEditDay(d.dayOfWeek, 'startTime', e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border text-sm bg-white outline-none"
                      style={{ borderColor: '#e8e4dc' }} />
                  </div>
                  <div>
                    <label className="text-xs text-[#9a96a8]">Конец</label>
                    <input type="time" value={d.endTime} onChange={e => updateEditDay(d.dayOfWeek, 'endTime', e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border text-sm bg-white outline-none"
                      style={{ borderColor: '#e8e4dc' }} />
                  </div>
                  <div>
                    <label className="text-xs text-[#9a96a8]">Перерыв с</label>
                    <input type="time" value={d.breakStart ?? ''} onChange={e => updateEditDay(d.dayOfWeek, 'breakStart', e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border text-sm bg-white outline-none"
                      style={{ borderColor: '#e8e4dc' }} />
                  </div>
                  <div>
                    <label className="text-xs text-[#9a96a8]">Перерыв до</label>
                    <input type="time" value={d.breakEnd ?? ''} onChange={e => updateEditDay(d.dayOfWeek, 'breakEnd', e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border text-sm bg-white outline-none"
                      style={{ borderColor: '#e8e4dc' }} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-[#9a96a8]">Длительность слота</label>
                  <select value={d.slotDurationMinutes} onChange={e => updateEditDay(d.dayOfWeek, 'slotDurationMinutes', +e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border text-sm bg-white outline-none"
                    style={{ borderColor: '#e8e4dc' }}>
                    <option value={15}>15 мин</option>
                    <option value={30}>30 мин</option>
                    <option value={45}>45 мин</option>
                    <option value={60}>60 мин</option>
                  </select>
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowSettings(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border text-[#9a96a8]"
                style={{ borderColor: '#e8e4dc' }}>Отмена</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white"
                style={{ background: 'var(--accent-dark)', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
