'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react';

const PROXY = '/api/proxy';

interface ScheduleDay {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  slotDurationMinutes: number;
}

interface BookingModalProps {
  doctorId: string;
  doctorName: string;
  locale?: string;
  onClose: () => void;
}

const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function generateSlots(day: ScheduleDay): string[] {
  const start  = timeToMinutes(day.startTime);
  const end    = timeToMinutes(day.endTime);
  const bStart = day.breakStart ? timeToMinutes(day.breakStart) : null;
  const bEnd   = day.breakEnd   ? timeToMinutes(day.breakEnd)   : null;
  const dur    = day.slotDurationMinutes;

  const slots: string[] = [];
  for (let t = start; t + dur <= end; t += dur) {
    if (bStart !== null && bEnd !== null && t >= bStart && t < bEnd) continue;
    slots.push(minutesToTime(t));
  }
  return slots;
}

// Returns next 7 dates starting from today
function getNextDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// JS Date.getDay(): 0=Sun,1=Mon..6=Sat → our schedule: 0=Mon..6=Sun
function jsDayToOurDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function BookingModal({ doctorId, doctorName, locale = 'ru', onClose }: BookingModalProps) {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'pick' | 'confirm' | 'done'>('pick');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ date: Date; time: string } | null>(null);
  const [error, setError] = useState('');

  const dates = getNextDates();

  useEffect(() => {
    fetch(`${PROXY}/catalog/${doctorId}/schedule`)
      .then(r => r.json())
      .then(j => { setSchedule(j.data ?? []); })
      .catch(() => {})
      .finally(() => setLoadingSchedule(false));
  }, [doctorId]);

  function getSlotsForDate(date: Date): string[] {
    const ourDay = jsDayToOurDay(date.getDay());
    const daySchedule = schedule.find(s => s.dayOfWeek === ourDay);
    if (!daySchedule) return [];
    const slots = generateSlots(daySchedule);
    // If today, filter past slots
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes() + 30; // +30 buffer
      return slots.filter(t => timeToMinutes(t) >= nowMinutes);
    }
    return slots;
  }

  async function handleBook() {
    if (!selectedDate || !selectedTime) return;
    setBooking(true);
    setError('');
    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);

      const res = await fetch(`${PROXY}/catalog/${doctorId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: dt.toISOString(), type: 'offline' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Ошибка записи');
        return;
      }
      setBooked({ date: selectedDate, time: selectedTime });
      setStep('done');
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setBooking(false);
    }
  }

  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="relative rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: '#fff', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Handle */}
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ background: '#e8e4dc' }} />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
          {step === 'confirm' ? (
            <button type="button" onClick={() => setStep('pick')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f4f3ef' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: '#2a2540' }} />
            </button>
          ) : <div />}
          <h2 className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
            {step === 'done' ? '✅ Вы записаны' : '📅 Запись на приём'}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f4f3ef' }}>
            <X className="w-4 h-4" style={{ color: '#6a6580' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">

          {/* ── DONE ──────────────────────────────────────────────────────── */}
          {step === 'done' && booked && (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-[16px] font-bold text-[#2a2540] mb-2">
                Запись подтверждена!
              </p>
              <p className="text-sm text-[#6a6580] mb-1">
                Dr. {doctorName}
              </p>
              <p className="text-[15px] font-semibold text-[#2a2540] mt-3 mb-6">
                {booked.date.getDate()} {MONTHS[booked.date.getMonth()]}, {booked.time}
              </p>
              <button type="button" onClick={onClose}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #6BA3D6, #3a6fa0)' }}>
                Понятно
              </button>
            </div>
          )}

          {/* ── CONFIRM ──────────────────────────────────────────────────── */}
          {step === 'confirm' && selectedDate && selectedTime && (
            <div>
              <div className="rounded-2xl p-4 mb-5" style={{ background: '#f4f3ef' }}>
                <p className="text-xs text-[#9a96a8] mb-1">Врач</p>
                <p className="font-bold text-[#2a2540]">Dr. {doctorName}</p>
                <p className="text-xs text-[#9a96a8] mt-3 mb-1">Дата и время</p>
                <p className="font-semibold text-[#2a2540]">
                  {DAY_NAMES[jsDayToOurDay(selectedDate.getDay())]},{' '}
                  {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} · {selectedTime}
                </p>
                <p className="text-xs text-[#9a96a8] mt-3 mb-1">Формат</p>
                <p className="text-sm text-[#2a2540]">Очный приём</p>
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button type="button" onClick={handleBook} disabled={booking}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--hero-from, #9c5e6c), var(--accent-dark, #6a3a5a))' }}>
                {booking ? 'Записываю...' : 'Подтвердить запись'}
              </button>
            </div>
          )}

          {/* ── PICK ─────────────────────────────────────────────────────── */}
          {step === 'pick' && (
            <>
              {loadingSchedule ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-[3px] rounded-full animate-spin"
                    style={{ borderColor: 'var(--accent-dark)', borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <>
                  {/* Date scroll */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[#9a96a8] mb-2">Выберите дату</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dates.map(date => {
                        const ourDay = jsDayToOurDay(date.getDay());
                        const hasSlots = schedule.some(s => s.dayOfWeek === ourDay);
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <button key={date.toISOString()} type="button"
                            onClick={() => { if (hasSlots) { setSelectedDate(date); setSelectedTime(null); } }}
                            disabled={!hasSlots}
                            className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl border transition-colors min-w-[52px] disabled:opacity-40"
                            style={isSelected
                              ? { background: '#9c5e6c', borderColor: '#9c5e6c', color: '#fff' }
                              : { background: '#fff', borderColor: '#e8e4dc', color: '#2a2540' }}>
                            <span className="text-[10px] font-semibold">{DAY_NAMES_SHORT[ourDay]}</span>
                            <span className="text-[15px] font-bold leading-tight">{date.getDate()}</span>
                            <span className="text-[9px]" style={{ opacity: 0.7 }}>{MONTHS[date.getMonth()]}</span>
                            {isToday && !isSelected && (
                              <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: '#9c5e6c' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  {selectedDate && (
                    <div>
                      <p className="text-xs font-semibold text-[#9a96a8] mb-2">Доступное время</p>
                      {slots.length === 0 ? (
                        <p className="text-sm text-[#9a96a8] text-center py-4">Нет свободных слотов</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {slots.map(t => (
                            <button key={t} type="button"
                              onClick={() => setSelectedTime(t)}
                              className="py-2 rounded-xl text-sm font-semibold border transition-colors"
                              style={selectedTime === t
                                ? { background: '#6BA3D6', borderColor: '#6BA3D6', color: '#fff' }
                                : { background: '#f4f3ef', borderColor: '#e8e4dc', color: '#2a2540' }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedDate && schedule.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#9a96a8]">Расписание пока не заполнено</p>
                    </div>
                  )}

                  {selectedDate && selectedTime && (
                    <button type="button" onClick={() => setStep('confirm')}
                      className="w-full py-3 rounded-2xl text-white font-bold text-sm mt-4"
                      style={{ background: 'linear-gradient(135deg, var(--hero-from, #9c5e6c), var(--accent-dark, #6a3a5a))' }}>
                      Продолжить →
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
