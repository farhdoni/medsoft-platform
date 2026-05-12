'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ScheduleItem, MedStats, MedicationRow } from './page';

const PROXY = '/api/proxy';

// ─── Types ────────────────────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { label: '1 раз в день',  value: '1 раз в день',  times: ['08:00'] },
  { label: '2 раза в день', value: '2 раза в день',  times: ['08:00', '20:00'] },
  { label: '3 раза в день', value: '3 раза в день',  times: ['08:00', '14:00', '20:00'] },
  { label: 'Перед сном',    value: 'перед сном',     times: ['21:00'] },
  { label: 'Другое',        value: 'другое',          times: [] },
] as const;

// ─── Add Medication Modal ─────────────────────────────────────────────────────

function AddMedModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [title, setTitle]         = useState('');
  const [dosage, setDosage]       = useState('');
  const [freqKey, setFreqKey]     = useState(0);
  const [customTimes, setCustomTimes] = useState('08:00');
  const [instructions, setInstr]  = useState('');
  const [duration, setDuration]   = useState('');
  const [reminder, setReminder]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  const freq = FREQ_OPTIONS[freqKey];
  const times = freq.value === 'другое'
    ? customTimes.split(',').map(t => t.trim()).filter(Boolean)
    : [...freq.times];

  async function submit() {
    if (!title.trim()) { setErr('Введите название'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${PROXY}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          dosage: dosage.trim() || null,
          frequency: freq.value,
          times,
          durationDays: duration ? parseInt(duration, 10) : null,
          instructions: instructions.trim() || null,
          reminderEnabled: reminder,
        }),
      });
      if (!res.ok) throw new Error();
      onAdded();
      onClose();
    } catch {
      setErr('Не удалось сохранить. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold" style={{ color: '#2a2540' }}>💊 Добавить лекарство</h2>
          <button onClick={onClose} className="text-[20px] text-gray-400 hover:text-gray-600">×</button>
        </div>

        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Название *</label>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Метформин, Витамин D3..."
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
        />

        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Дозировка</label>
        <input value={dosage} onChange={e => setDosage(e.target.value)}
          placeholder="500мг, 1 таблетка, 5мл..."
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
        />

        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Частота приёма</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {FREQ_OPTIONS.map((f, i) => (
            <button key={f.value} onClick={() => setFreqKey(i)}
              className="py-2 rounded-[10px] text-[13px] font-semibold transition-all"
              style={{ background: freqKey === i ? 'var(--accent-dark)' : '#f4f3ef', color: freqKey === i ? '#fff' : '#2a2540' }}
            >{f.label}</button>
          ))}
        </div>

        {freq.value === 'другое' && (
          <>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Время(я) через запятую</label>
            <input value={customTimes} onChange={e => setCustomTimes(e.target.value)}
              placeholder="08:00, 14:00, 20:00"
              className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-3"
            />
          </>
        )}

        {freq.value !== 'другое' && times.length > 0 && (
          <div className="flex gap-2 mb-3">
            {times.map(t => (
              <span key={t} className="px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: 'var(--accent-bg-light)', color: 'var(--accent-dark)' }}>🕐 {t}</span>
            ))}
          </div>
        )}

        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Инструкции</label>
        <textarea value={instructions} onChange={e => setInstr(e.target.value)}
          placeholder="После еды, запить водой..."
          rows={2}
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none resize-none mb-4"
        />

        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9a96a8' }}>Длительность (дней)</label>
        <input value={duration} onChange={e => setDuration(e.target.value)}
          type="number" min="1" placeholder="30 (пусто = постоянно)"
          className="w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none mb-4"
        />

        <label className="flex items-center gap-3 mb-5 cursor-pointer">
          <div onClick={() => setReminder(r => !r)}
            className="w-11 h-6 rounded-full transition-all flex items-center px-1"
            style={{ background: reminder ? 'var(--accent-dark)' : '#e8e4dc' }}>
            <div className="w-4 h-4 rounded-full bg-white transition-all"
              style={{ transform: reminder ? 'translateX(20px)' : 'translateX(0)' }} />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>Напоминания</span>
        </label>

        {err && <p className="text-[12px] mb-3" style={{ color: 'var(--accent-dark)' }}>{err}</p>}

        <button onClick={() => void submit()} disabled={saving || !title.trim()}
          className="w-full py-3 rounded-[12px] text-[14px] font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >{saving ? 'Сохраняем…' : '💊 Добавить лекарство'}</button>
      </div>
    </div>
  );
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'taken')   return <span className="text-[20px]">✅</span>;
  if (status === 'skipped') return <span className="text-[20px]">⏭️</span>;
  if (status === 'missed')  return <span className="text-[20px]">❌</span>;
  return (
    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
      style={{ borderColor: 'var(--accent-dark)' }}>
      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-dark)' }} />
    </div>
  );
}

// ─── Pending reminder banner ──────────────────────────────────────────────────

function ReminderBanner({ item, onTake, onDismiss }: {
  item: ScheduleItem;
  onTake: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-[16px] p-4 mb-4 flex items-center gap-3"
      style={{ background: 'linear-gradient(135deg, var(--accent-dark), var(--accent-rose))', color: '#fff' }}>
      <span className="text-[28px] flex-shrink-0">💊</span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold leading-tight">Время принять {item.title}</p>
        {item.dosage && <p className="text-[11px] opacity-80">{item.dosage}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onTake}
          className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-white"
          style={{ color: 'var(--accent-dark)' }}>✅ Принял</button>
        <button onClick={onDismiss}
          className="px-2 py-1.5 rounded-full text-[12px] font-bold"
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>✕</button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialSchedule: ScheduleItem[];
  initialStats: MedStats | null;
  initialMedications: MedicationRow[];
}

export function MedicationsClient({ initialSchedule, initialStats, initialMedications }: Props) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [stats, setStats]       = useState<MedStats | null>(initialStats);
  const [medications]           = useState<MedicationRow[]>(initialMedications);
  const [showAdd, setShowAdd]   = useState(false);
  const [pendingBanner, setPendingBanner] = useState<ScheduleItem | null>(null);
  const [loading, setLoading]   = useState<Record<string, boolean>>({});

  // Check for pending reminder in current hour
  useEffect(() => {
    const now = new Date();
    const pending = schedule.find(item => {
      if (item.status !== 'pending') return false;
      const [h, m] = item.time.split(':').map(Number);
      const scheduled = new Date();
      scheduled.setHours(h, m, 0, 0);
      const diff = (scheduled.getTime() - now.getTime()) / 60000;
      return diff > -30 && diff < 30;
    });
    if (pending) setPendingBanner(pending);
  }, [schedule]);

  const markStatus = useCallback(async (scheduleId: string, time: string, action: 'take' | 'skip') => {
    setLoading(l => ({ ...l, [`${scheduleId}-${time}`]: true }));
    try {
      await fetch(`${PROXY}/medications/${scheduleId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time }),
      });
      // Optimistic update
      setSchedule(prev => prev.map(item =>
        item.scheduleId === scheduleId && item.time === time
          ? { ...item, status: action === 'take' ? 'taken' : 'skipped', takenAt: action === 'take' ? new Date().toISOString() : null }
          : item
      ));
      if (scheduleId === pendingBanner?.scheduleId) setPendingBanner(null);
    } catch { /* silent */ } finally {
      setLoading(l => ({ ...l, [`${scheduleId}-${time}`]: false }));
    }
  }, [pendingBanner]);

  function handleAdded() {
    router.refresh();
  }

  // Group schedule by period
  const periods: { id: 'morning' | 'afternoon' | 'evening'; label: string; emoji: string }[] = [
    { id: 'morning',   label: 'Утро',  emoji: '🌅' },
    { id: 'afternoon', label: 'День',  emoji: '☀️' },
    { id: 'evening',   label: 'Вечер', emoji: '🌙' },
  ];

  return (
    <>
      {showAdd && <AddMedModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}

      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">ЛЕКАРСТВА</p>
        <h1 className="text-[22px] font-extrabold text-text-primary">💊 Мои лекарства</h1>
      </div>

      {/* Reminder banner */}
      {pendingBanner && (
        <ReminderBanner
          item={pendingBanner}
          onTake={() => void markStatus(pendingBanner.scheduleId, pendingBanner.time, 'take')}
          onDismiss={() => setPendingBanner(null)}
        />
      )}

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="rounded-card bg-white border border-border-soft p-4 mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
            СОБЛЮДЕНИЕ ЗА {stats.days} ДНЕЙ
          </p>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#f4f3ef' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${stats.percent}%`, background: 'linear-gradient(90deg, var(--accent-dark), var(--accent-rose))' }} />
            </div>
            <span className="text-[16px] font-extrabold" style={{ color: 'var(--accent-dark)' }}>{stats.percent}%</span>
          </div>
          <p className="text-[11px] text-text-muted">
            ✅ Принято: {stats.taken} · ⏭️ Пропущено: {stats.skipped} · ❌ Забыто: {stats.missed}
          </p>
        </div>
      )}

      {/* Today schedule */}
      {schedule.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">РАСПИСАНИЕ НА СЕГОДНЯ</p>
          {periods.map(period => {
            const items = schedule.filter(s => s.period === period.id);
            if (items.length === 0) return null;
            return (
              <div key={period.id} className="mb-4">
                <p className="text-[12px] font-semibold text-text-muted mb-2">
                  {period.emoji} {period.label}
                </p>
                <div className="space-y-2">
                  {items.map(item => {
                    const key = `${item.scheduleId}-${item.time}`;
                    const busy = loading[key];
                    const isPending = item.status === 'pending';
                    return (
                      <div key={key}
                        className="flex items-center gap-3 p-4 rounded-card bg-white border"
                        style={{
                          borderColor: item.status === 'taken' ? '#a8d4b8' : item.status === 'missed' ? '#f0c0c0' : '#e8e4dc',
                          background: item.status === 'taken' ? '#f0f8f2' : '#ffffff',
                        }}
                      >
                        <StatusIcon status={item.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold leading-snug" style={{
                            color: item.status === 'taken' ? '#548068' : '#2a2540',
                            textDecoration: item.status === 'taken' ? 'line-through' : 'none',
                          }}>
                            {item.title}
                            {item.dosage && <span className="font-normal text-text-muted"> · {item.dosage}</span>}
                          </p>
                          {item.instructions && (
                            <p className="text-[11px] text-text-muted mt-0.5">{item.instructions}</p>
                          )}
                          <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
                            {item.time}
                            {item.status === 'taken' && item.takenAt && ` · принято в ${new Date(item.takenAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`}
                            {item.createdBy === 'doctor' && ' · 👨‍⚕️ Назначено врачом'}
                          </p>
                        </div>
                        {isPending && (
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => void markStatus(item.scheduleId, item.time, 'take')}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-50"
                              style={{ background: '#548068' }}
                            >✅ Принял</button>
                            <button
                              onClick={() => void markStatus(item.scheduleId, item.time, 'skip')}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-full text-[11px] font-semibold disabled:opacity-50"
                              style={{ background: '#f4f3ef', color: '#9a96a8' }}
                            >⏭ Позже</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty today state */}
      {schedule.length === 0 && medications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center mb-5">
          <span className="text-5xl">💊</span>
          <p className="text-[15px] font-semibold text-text-primary">Нет активных лекарств</p>
          <p className="text-[13px] text-text-muted max-w-[220px] leading-relaxed">
            Добавь лекарства чтобы отслеживать приём и получать напоминания
          </p>
        </div>
      )}

      {/* All medications list */}
      {medications.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">ВСЕ ЛЕКАРСТВА</p>
          <div className="space-y-2">
            {medications.map(med => (
              <div key={med.id} className="flex items-center gap-3 p-4 rounded-card bg-white border border-border-soft">
                <span className="text-[28px] flex-shrink-0">💊</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary">{med.title}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {med.dosage ? `${med.dosage} · ` : ''}{med.frequency}
                    {med.createdBy === 'doctor' && ' · 👨‍⚕️ Врач'}
                  </p>
                  {med.endDate && (
                    <p className="text-[10px] text-text-muted mt-0.5">
                      до {new Date(med.endDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  med.isActive ? 'bg-bg-soft-mint text-accent-mint' : 'bg-bg-app text-text-muted'
                }`}>
                  {med.isActive ? 'Активно' : 'Завершено'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-card text-[13px] font-semibold transition-opacity hover:opacity-80"
        style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))', color: '#ffffff' }}
      >
        + Добавить лекарство
      </button>
    </>
  );
}
