'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playTone, speak, type TonePreset } from '@/lib/voice-notifications';

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f3ef', card: '#fff', border: '#e8e4dc',
  accent: '#9c5e6c', accentBg: '#f0d4dc',
  green: '#3a7a4a', greenBg: '#d4e8d8',
  t1: '#2a2540', t2: '#6a6580', t3: '#9a96a8',
  red: '#dc3545',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface TypeSetting {
  enabled:     boolean;
  sound:       string;
  voice:       boolean;
  persistent?: boolean;
  intervalHours?: number;
  time?:       string;
  times?:      string[];
}

interface ReminderSettings {
  settings:           Record<string, TypeSetting>;
  quietHoursStart:    string;
  quietHoursEnd:      string;
  globalVoiceEnabled: boolean;
  globalSoundEnabled: boolean;
  globalVolume:       number;
}

interface CustomReminder {
  id:           number;
  title:        string;
  time:         string;
  repeat:       string;
  voiceEnabled: boolean;
  voiceText?:   string | null;
}

const REPEAT_LABELS: Record<string, string> = {
  daily: 'Ежедневно', weekdays: 'По будням', weekly: 'Еженедельно', once: 'Один раз',
};

// ─── 10 reminder types ────────────────────────────────────────────────────────
const REMINDER_TYPES = [
  { key: 'medication',  icon: '💊', label: 'Лекарства',              sub: 'По расписанию',           voice: true,  canPersistent: true  },
  { key: 'appointment', icon: '📅', label: 'Приём врача',            sub: 'За 24ч и за 1ч',          voice: true,  canPersistent: false },
  { key: 'vitals',      icon: '❤️', label: 'Измерить давление/сахар',sub: 'По настройке',            voice: true,  canPersistent: false },
  { key: 'water',       icon: '💧', label: 'Выпить воду',            sub: 'Каждые N часов',          voice: false, canPersistent: false },
  { key: 'nutrition',   icon: '🍽', label: 'Приём пищи',            sub: '08:00, 13:00, 19:00',      voice: false, canPersistent: false },
  { key: 'mood',        icon: '😊', label: 'Отметить настроение',    sub: 'Ежедневно',               voice: false, canPersistent: false },
  { key: 'exercise',    icon: '🏃', label: 'Тренировка',             sub: 'По расписанию',           voice: false, canPersistent: false },
  { key: 'breathing',   icon: '🫁', label: 'Дыхательное упражнение', sub: 'По настройке',            voice: false, canPersistent: false },
  { key: 'checkup',     icon: '🧬', label: 'Пройти чекап',          sub: 'Еженедельно',              voice: false, canPersistent: false },
  { key: 'custom',      icon: '✏️', label: 'Свои напоминания',       sub: 'Настраиваемые',           voice: true,  canPersistent: false },
];

const SOUNDS = [
  { id: 'soft',       label: '🌊 Мягкий'     },
  { id: 'standard',   label: '🔔 Стандартный' },
  { id: 'medication', label: '💊 Лекарство'  },
  { id: 'urgent',     label: '⚠️ Срочный'   },
];

// ─── UI helpers ───────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: on ? `linear-gradient(135deg, ${C.accent}, #7a3848)` : '#d0cce0', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`,
  background: '#fafaf8', fontSize: 13, color: C.t1, outline: 'none', width: '100%', boxSizing: 'border-box',
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NotificationSettingsPage() {
  const router = useRouter();
  const [data,         setData]         = useState<ReminderSettings | null>(null);
  const [customs,      setCustoms]      = useState<CustomReminder[]>([]);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [savedMsg,     setSavedMsg]     = useState('');
  const [permStatus,   setPermStatus]   = useState<'default' | 'granted' | 'denied'>('default');
  const [addModal,     setAddModal]     = useState(false);
  const [newReminder,  setNewReminder]  = useState({ title: '', time: '09:00', repeat: 'daily', voiceEnabled: false, voiceText: '' });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermStatus(Notification.permission as 'default' | 'granted' | 'denied');
    }
    // Load settings
    fetch('/api/proxy/reminders/settings')
      .then(r => r.json())
      .then((j: { data?: ReminderSettings }) => { if (j.data) setData(j.data); })
      .catch(() => {});
    // Load custom reminders
    fetch('/api/proxy/reminders/custom')
      .then(r => r.json())
      .then((j: { data?: CustomReminder[] }) => { if (j.data) setCustoms(j.data); })
      .catch(() => {});
  }, []);

  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 1800);
  };

  const save = useCallback(async (patch: Partial<ReminderSettings>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/reminders/settings', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json() as { data?: ReminderSettings };
      if (json.data) { setData(prev => prev ? { ...prev, ...patch } : null); flash('✓ Сохранено'); }
    } catch { /* silent */ }
    finally { setSaving(false); }
  }, []);

  const updateTypeSetting = useCallback((key: string, patch: Partial<TypeSetting>) => {
    if (!data) return;
    const next = { ...data.settings, [key]: { ...(data.settings[key] ?? {}), ...patch } };
    setData(prev => prev ? { ...prev, settings: next } : null);
    void save({ settings: next });
  }, [data, save]);

  const handleRequestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermStatus(result as 'default' | 'granted' | 'denied');
    if (result === 'granted') flash('✓ Разрешено');
  };

  const handleAddCustom = async () => {
    if (!newReminder.title || !newReminder.time) return;
    const res = await fetch('/api/proxy/reminders/custom', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(newReminder),
    });
    const json = await res.json() as { data?: CustomReminder };
    if (json.data) {
      setCustoms(prev => [...prev, json.data!]);
      setNewReminder({ title: '', time: '09:00', repeat: 'daily', voiceEnabled: false, voiceText: '' });
      setAddModal(false);
      flash('✓ Добавлено');
    }
  };

  const handleDeleteCustom = async (id: number) => {
    await fetch(`/api/proxy/reminders/custom/${id}`, { method: 'DELETE' });
    setCustoms(prev => prev.filter(r => r.id !== id));
    flash('✓ Удалено');
  };

  if (!data) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.t3, fontSize: 14 }}>Загрузка...</p>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: C.card, padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: C.t2, padding: 0 }}>←</button>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: C.t1, margin: 0, flex: 1 }}>Уведомления</h1>
        {(saving || savedMsg) && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{saving ? '...' : savedMsg}</span>}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 14px' }}>

        {/* Permission banner */}
        {permStatus !== 'granted' && (
          <div style={{ background: permStatus === 'denied' ? '#fde8e8' : '#fff9e6', borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${permStatus === 'denied' ? '#f0c0c0' : '#f0e08a'}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: permStatus === 'denied' ? C.red : '#856404', marginBottom: 6 }}>
              {permStatus === 'denied' ? '🚫 Уведомления заблокированы' : '🔔 Разрешите уведомления'}
            </p>
            <p style={{ fontSize: 12, color: C.t2, marginBottom: permStatus === 'default' ? 10 : 0, lineHeight: 1.5 }}>
              {permStatus === 'denied' ? 'Включите в настройках браузера.' : 'Нужны для напоминаний о лекарствах и приёмах.'}
            </p>
            {permStatus === 'default' && (
              <button onClick={handleRequestPermission}
                style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#856404', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Разрешить
              </button>
            )}
          </div>
        )}

        {/* Global settings */}
        <div style={{ background: C.card, borderRadius: 16, padding: '4px 16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>🔊 Голосовые</p>
              <p style={{ fontSize: 11, color: C.t3, margin: '2px 0 0' }}>Web Speech API</p>
            </div>
            <Toggle on={data.globalVoiceEnabled} onChange={v => void save({ globalVoiceEnabled: v })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>🎵 Звук</p>
            </div>
            <Toggle on={data.globalSoundEnabled} onChange={v => void save({ globalSoundEnabled: v })} />
          </div>
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>🔉 Громкость</p>
              <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>{data.globalVolume}%</p>
            </div>
            <input type="range" min={0} max={100} value={data.globalVolume} style={{ width: '100%', accentColor: C.accent }}
              onChange={e => setData(prev => prev ? { ...prev, globalVolume: Number(e.target.value) } : null)}
              onMouseUp={() => void save({ globalVolume: data.globalVolume })}
              onTouchEnd={() => void save({ globalVolume: data.globalVolume })} />
          </div>
          <div style={{ padding: '13px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 8 }}>🌙 Время тишины</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="time" value={data.quietHoursStart} style={{ ...inputStyle, width: 'auto' }}
                onChange={e => setData(prev => prev ? { ...prev, quietHoursStart: e.target.value } : null)}
                onBlur={() => void save({ quietHoursStart: data.quietHoursStart })} />
              <span style={{ color: C.t3, fontSize: 13 }}>—</span>
              <input type="time" value={data.quietHoursEnd} style={{ ...inputStyle, width: 'auto' }}
                onChange={e => setData(prev => prev ? { ...prev, quietHoursEnd: e.target.value } : null)}
                onBlur={() => void save({ quietHoursEnd: data.quietHoursEnd })} />
            </div>
          </div>
        </div>

        {/* Test buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => playTone('reminder', data.globalVolume / 100)}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 12, fontWeight: 600, color: C.t1, cursor: 'pointer' }}>
            🔊 Тест звука
          </button>
          <button onClick={() => speak('Время принять Метформин 850 мг после еды')}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 12, fontWeight: 600, color: C.t1, cursor: 'pointer' }}>
            🗣 Тест голоса
          </button>
        </div>

        {/* 10 reminder types */}
        <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>ТИПЫ НАПОМИНАНИЙ</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {REMINDER_TYPES.map(({ key, icon, label, sub, voice: hasVoice, canPersistent }) => {
            const ts: TypeSetting = data.settings[key] ?? { enabled: false, sound: 'standard', voice: false };
            const isOpen = expanded === key;
            return (
              <div key={key} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : key)}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 11, color: C.t3, margin: '2px 0 0' }}>{sub}{hasVoice ? ' · голос 🗣' : ''}</p>
                  </div>
                  <Toggle on={ts.enabled} onChange={v => updateTypeSetting(key, { enabled: v })} />
                  <button onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ border: 'none', background: 'none', fontSize: 18, color: C.t3, cursor: 'pointer', padding: '0 0 0 4px', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </button>
                </div>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Sound selector */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Звук</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {SOUNDS.map(s => (
                          <button key={s.id} onClick={() => { updateTypeSetting(key, { sound: s.id }); playTone(s.id as TonePreset, data.globalVolume / 100); }}
                            style={{ padding: '5px 11px', borderRadius: 18, border: `1.5px solid ${ts.sound === s.id ? C.accent : C.border}`, background: ts.sound === s.id ? C.accentBg : '#fafaf8', fontSize: 11, fontWeight: 600, color: ts.sound === s.id ? C.accent : C.t2, cursor: 'pointer' }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice toggle (only for voice-capable types) */}
                    {hasVoice && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>🗣 Голосовое</p>
                        <Toggle on={ts.voice ?? false} onChange={v => updateTypeSetting(key, { voice: v })} />
                      </div>
                    )}

                    {/* Persistent toggle (medication only) */}
                    {canPersistent && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>🔁 Настойчивое</p>
                          <p style={{ fontSize: 11, color: C.t3, margin: '2px 0 0' }}>Повтор каждые 15 мин</p>
                        </div>
                        <Toggle on={ts.persistent ?? false} onChange={v => updateTypeSetting(key, { persistent: v })} />
                      </div>
                    )}

                    {/* Water interval */}
                    {key === 'water' && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Интервал напоминания</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1, 2, 3].map(h => (
                            <button key={h} onClick={() => updateTypeSetting(key, { intervalHours: h })}
                              style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${ts.intervalHours === h ? C.accent : C.border}`, background: ts.intervalHours === h ? C.accentBg : '#fafaf8', fontSize: 13, fontWeight: 700, color: ts.intervalHours === h ? C.accent : C.t2, cursor: 'pointer' }}>
                              {h}ч
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mood time */}
                    {key === 'mood' && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Время чекина</p>
                        <input type="time" value={ts.time ?? '21:00'} style={{ ...inputStyle, width: 'auto' }}
                          onChange={e => updateTypeSetting(key, { time: e.target.value })} />
                      </div>
                    )}

                    {/* Vitals times */}
                    {key === 'vitals' && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Время измерений</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(ts.times ?? ['08:00', '20:00']).map((t, i) => (
                            <input key={i} type="time" value={t} style={{ ...inputStyle, width: 'auto' }}
                              onChange={e => {
                                const next = [...(ts.times ?? ['08:00', '20:00'])];
                                next[i] = e.target.value;
                                updateTypeSetting(key, { times: next });
                              }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom reminders section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>СВОИ НАПОМИНАНИЯ</p>
          <button onClick={() => setAddModal(true)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Добавить
          </button>
        </div>

        {customs.length === 0 ? (
          <div style={{ background: C.card, borderRadius: 14, padding: '20px', textAlign: 'center', border: `1px solid ${C.border}`, marginBottom: 14 }}>
            <p style={{ fontSize: 24, marginBottom: 6 }}>✏️</p>
            <p style={{ fontSize: 13, color: C.t3 }}>Нет своих напоминаний</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {customs.map(r => (
              <div key={r.id} style={{ background: C.card, borderRadius: 14, padding: '13px 14px', border: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, margin: 0 }}>{r.title}</p>
                  <p style={{ fontSize: 11, color: C.t3, margin: '3px 0 0' }}>
                    {r.time} · {REPEAT_LABELS[r.repeat] ?? r.repeat}
                    {r.voiceEnabled ? ' · 🗣 голос' : ''}
                  </p>
                </div>
                <button onClick={() => void handleDeleteCustom(r.id)}
                  style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#fde8e8', color: C.red, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add custom reminder modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setAddModal(false); }}>
          <div style={{ background: C.card, borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.t1, margin: 0 }}>Новое напоминание</p>

            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 5 }}>Название *</p>
              <input style={inputStyle} placeholder="Например: Выпить витамины" value={newReminder.title} onChange={e => setNewReminder(r => ({ ...r, title: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 5 }}>Время *</p>
                <input type="time" style={inputStyle} value={newReminder.time} onChange={e => setNewReminder(r => ({ ...r, time: e.target.value }))} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 5 }}>Повтор</p>
                <select style={inputStyle} value={newReminder.repeat} onChange={e => setNewReminder(r => ({ ...r, repeat: e.target.value }))}>
                  {Object.entries(REPEAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>🗣 Голосовое</p>
              <Toggle on={newReminder.voiceEnabled} onChange={v => setNewReminder(r => ({ ...r, voiceEnabled: v }))} />
            </div>

            {newReminder.voiceEnabled && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 5 }}>Текст для озвучки</p>
                <input style={inputStyle} placeholder="Что сказать вслух" value={newReminder.voiceText} onChange={e => setNewReminder(r => ({ ...r, voiceText: e.target.value }))} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setAddModal(false)}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 700, color: C.t2, cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={() => void handleAddCustom()} disabled={!newReminder.title}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: newReminder.title ? 1 : 0.5 }}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
