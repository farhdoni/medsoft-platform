'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
const DAY_NAMES       = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS          = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Mon-Fri default schedule when API has no data */
function buildMockSchedule(): ScheduleDay[] {
  return [0, 1, 2, 3, 4].map(dayOfWeek => ({
    id:                  `mock-${dayOfWeek}`,
    dayOfWeek,
    startTime:           '09:00',
    endTime:             '17:00',
    breakStart:          '13:00',
    breakEnd:            '14:00',
    slotDurationMinutes: 30,
  }));
}

/** Deterministic "busy" flag — ~25 % slots appear occupied */
function isBusy(date: Date, time: string): boolean {
  const str = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${time}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h % 4 === 0;
}

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

/** JS Date.getDay(): 0=Sun … 6=Sat → schedule: 0=Mon … 6=Sun */
function jsDayToOurDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookingModal({ doctorId, doctorName, locale = 'ru', onClose }: BookingModalProps) {
  const [mounted, setMounted]           = useState(false);
  const [schedule, setSchedule]         = useState<ScheduleDay[]>([]);
  const [loadingSchedule, setLoading]   = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep]                 = useState<'pick' | 'confirm' | 'done'>('pick');
  const [booking, setBooking]           = useState(false);
  const [booked, setBooked]             = useState<{ date: Date; time: string } | null>(null);
  const [error, setError]               = useState('');

  // Portal requires DOM
  useEffect(() => { setMounted(true); }, []);

  const dates = getNextDates();

  useEffect(() => {
    fetch(`${PROXY}/catalog/${doctorId}/schedule`)
      .then(r => r.json())
      .then(j => {
        const data: ScheduleDay[] = j.data ?? [];
        // Fallback to mock Mon-Fri schedule when doctor has no DB schedule
        setSchedule(data.length > 0 ? data : buildMockSchedule());
      })
      .catch(() => { setSchedule(buildMockSchedule()); })
      .finally(() => setLoading(false));
  }, [doctorId]);

  function getSlotsForDate(date: Date): { time: string; busy: boolean }[] {
    const ourDay     = jsDayToOurDay(date.getDay());
    const daySchedule = schedule.find(s => s.dayOfWeek === ourDay);
    if (!daySchedule) return [];

    const rawSlots = generateSlots(daySchedule);

    // If today, filter past slots (+30 min buffer)
    const now = new Date();
    const filtered = date.toDateString() === now.toDateString()
      ? rawSlots.filter(t => timeToMinutes(t) >= now.getHours() * 60 + now.getMinutes() + 30)
      : rawSlots;

    return filtered.map(time => ({ time, busy: isBusy(date, time) }));
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scheduledAt: dt.toISOString(), type: 'offline' }),
      });
      const json = await res.json() as { error?: string };
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

  if (!mounted) return null;

  // ── Render via portal so z-[200] beats ANY parent stacking context ──────────
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative rounded-t-3xl overflow-hidden flex flex-col w-full mx-auto"
        style={{
          background: '#f4f3ef',
          maxWidth:   480,
          maxHeight:  '88vh',
        }}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ background: '#d8d4cc' }} />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 pt-1">
          {step === 'confirm' ? (
            <button
              type="button"
              onClick={() => setStep('pick')}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#fff', border: '1px solid #e8e4dc' }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: '#2a2540' }} />
            </button>
          ) : <div className="w-8" />}

          <h2 className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
            {step === 'done' ? '✅ Вы записаны' : '📅 Запись на приём'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#fff', border: '1px solid #e8e4dc' }}
          >
            <X className="w-4 h-4" style={{ color: '#6a6580' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* ── DONE ────────────────────────────────────────────────────── */}
          {step === 'done' && booked && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-[16px] font-bold text-[#2a2540] mb-2">
                Запись подтверждена!
              </p>
              <div className="rounded-2xl px-5 py-4 mb-6 text-left" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
                <p className="text-xs text-[#9a96a8] mb-0.5">Врач</p>
                <p className="font-bold text-[#2a2540] mb-3">Dr. {doctorName}</p>
                <p className="text-xs text-[#9a96a8] mb-0.5">Дата и время</p>
                <p className="font-semibold text-[15px]" style={{ color: '#9c5e6c' }}>
                  {booked.date.getDate()} {MONTHS[booked.date.getMonth()]}, {booked.time}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                style={{ background: '#9c5e6c' }}
              >
                Понятно
              </button>
            </div>
          )}

          {/* ── CONFIRM ─────────────────────────────────────────────────── */}
          {step === 'confirm' && selectedDate && selectedTime && (
            <div>
              <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
                <p className="text-xs text-[#9a96a8] mb-1">Врач</p>
                <p className="font-bold text-[#2a2540] mb-3">Dr. {doctorName}</p>
                <p className="text-xs text-[#9a96a8] mb-1">Дата</p>
                <p className="font-semibold text-[#2a2540] mb-3">
                  {DAY_NAMES[jsDayToOurDay(selectedDate.getDay())]},{' '}
                  {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
                </p>
                <p className="text-xs text-[#9a96a8] mb-1">Время</p>
                <p className="font-bold text-[18px]" style={{ color: '#9c5e6c' }}>{selectedTime}</p>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f4f3ef' }}>
                  <p className="text-xs text-[#9a96a8] mb-1">Формат</p>
                  <p className="text-sm text-[#2a2540]">🏥 Очный приём</p>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
              )}

              <button
                type="button"
                onClick={handleBook}
                disabled={booking}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: '#9c5e6c' }}
              >
                {booking ? '⏳ Записываю...' : '✅ Подтвердить запись'}
              </button>
            </div>
          )}

          {/* ── PICK ────────────────────────────────────────────────────── */}
          {step === 'pick' && (
            <>
              {loadingSchedule ? (
                <div className="flex justify-center py-12">
                  <div
                    className="w-9 h-9 border-[3px] rounded-full animate-spin"
                    style={{ borderColor: '#9c5e6c', borderTopColor: 'transparent' }}
                  />
                </div>
              ) : (
                <>
                  {/* Date horizontal scroll */}
                  <div className="mb-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a96a8] mb-2.5">
                      Выберите дату
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                      {dates.map(date => {
                        const ourDay     = jsDayToOurDay(date.getDay());
                        const hasSchedule = schedule.some(s => s.dayOfWeek === ourDay);
                        const isSelected  = selectedDate?.toDateString() === date.toDateString();
                        const isToday     = date.toDateString() === new Date().toDateString();
                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            onClick={() => {
                              if (hasSchedule) {
                                setSelectedDate(date);
                                setSelectedTime(null);
                              }
                            }}
                            disabled={!hasSchedule}
                            className="flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-2xl border transition-all min-w-[58px] disabled:opacity-35"
                            style={isSelected
                              ? { background: '#9c5e6c', borderColor: '#9c5e6c', color: '#fff' }
                              : { background: '#fff', borderColor: '#e8e4dc', color: '#2a2540' }
                            }
                          >
                            <span className="text-[10px] font-bold">{DAY_NAMES_SHORT[ourDay]}</span>
                            <span className="text-[18px] font-extrabold leading-tight">{date.getDate()}</span>
                            <span className="text-[9px]" style={{ opacity: 0.7 }}>{MONTHS[date.getMonth()]}</span>
                            {isToday && !isSelected && (
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-0.5"
                                style={{ background: '#9c5e6c' }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots grid */}
                  {selectedDate && (
                    <div className="mb-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a96a8] mb-2.5">
                        Доступное время
                      </p>
                      {slots.length === 0 ? (
                        <div className="text-center py-6 rounded-2xl" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
                          <p className="text-sm text-[#9a96a8]">Нет свободных слотов на этот день</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {slots.map(({ time, busy }) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => { if (!busy) setSelectedTime(time); }}
                                disabled={busy}
                                className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
                                style={
                                  isSelected
                                    ? { background: '#9c5e6c', borderColor: '#9c5e6c', color: '#fff' }
                                    : busy
                                      ? { background: '#f4f3ef', borderColor: '#e8e4dc', color: '#c0bcc8' }
                                      : { background: '#fff', borderColor: '#9c5e6c', color: '#9c5e6c' }
                                }
                              >
                                {busy ? <span className="line-through opacity-50">{time}</span> : time}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedDate && (
                    <div
                      className="rounded-2xl p-5 text-center"
                      style={{ background: '#fff', border: '1px solid #e8e4dc' }}
                    >
                      <p className="text-3xl mb-2">👆</p>
                      <p className="text-sm font-semibold text-[#2a2540] mb-1">Выберите удобный день</p>
                      <p className="text-xs text-[#9a96a8]">Слоты загрузятся автоматически</p>
                    </div>
                  )}

                  {selectedDate && selectedTime && (
                    <button
                      type="button"
                      onClick={() => setStep('confirm')}
                      className="w-full py-3.5 rounded-2xl text-white font-bold text-sm mt-2"
                      style={{ background: '#9c5e6c' }}
                    >
                      Продолжить →
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
