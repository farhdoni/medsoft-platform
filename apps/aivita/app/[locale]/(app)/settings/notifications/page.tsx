'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadNotifPrefs, saveNotifPrefs, requestNotificationPermission,
  playTone, speak, DEFAULT_PREFS,
  type NotificationPrefs, type TonePreset,
} from '@/lib/voice-notifications';

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f3ef', card: '#fff', border: '#e8e4dc',
  accent: '#9c5e6c', accentBg: '#f0d4dc',
  green: '#3a7a4a', greenBg: '#d4e8d8',
  t1: '#2a2540', t2: '#6a6580', t3: '#9a96a8',
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: on ? `linear-gradient(135deg, ${C.accent}, #7a3848)` : '#d0cce0',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: on ? 23 : 3,
        transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: C.t3, margin: '2px 0 0' }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationSettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permStatus, setPermStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadNotifPrefs());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermStatus(Notification.permission as 'default' | 'granted' | 'denied');
    }
  }, []);

  const update = useCallback(<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      saveNotifPrefs(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const updateType = useCallback((type: keyof NotificationPrefs['types'], value: boolean) => {
    setPrefs(prev => {
      const next = { ...prev, types: { ...prev.types, [type]: value } };
      saveNotifPrefs(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? 'granted' : 'denied');
  };

  const testSound = (preset: TonePreset) => {
    playTone(preset, prefs.volume / 100);
  };

  const testVoice = () => {
    speak('Пора принять Метформин 850 мг! Не забудьте выпить после еды.');
  };

  const TYPE_ROWS: Array<{ key: keyof NotificationPrefs['types']; label: string; sub: string; voice: boolean }> = [
    { key: 'medication',  label: '💊 Лекарства',       sub: 'По расписанию',          voice: true  },
    { key: 'appointment', label: '👨‍⚕️ Приём врача',   sub: 'За 24ч и 1ч',            voice: true  },
    { key: 'nutrition',   label: '🍽 Питание',          sub: '08:00, 13:00, 19:00',    voice: false },
    { key: 'mood',        label: '😊 Настроение',       sub: 'Ежедневно в 21:00',      voice: false },
    { key: 'biometrics',  label: '📊 Биометрия',        sub: 'По настройке',           voice: true  },
    { key: 'water',       label: '💧 Вода',             sub: 'Каждые 2 часа',          voice: false },
    { key: 'aiAlert',     label: '⚠️ AI-оповещения',   sub: 'Аномальные показатели',  voice: true  },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: C.card, padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: C.t2, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, margin: 0 }}>Настройки уведомлений</h1>
        </div>
        {saved && <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>✓ Сохранено</span>}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px' }}>

        {/* ── Permission banner ──────────────────────────────────────────────── */}
        {permStatus !== 'granted' && (
          <div style={{ background: permStatus === 'denied' ? '#fde8e8' : '#fff9e6', borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${permStatus === 'denied' ? '#f0c0c0' : '#f0e08a'}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: permStatus === 'denied' ? '#c03030' : '#856404', marginBottom: 6 }}>
              {permStatus === 'denied' ? '🚫 Уведомления заблокированы' : '🔔 Разрешите уведомления'}
            </p>
            <p style={{ fontSize: 12, color: C.t2, marginBottom: 10, lineHeight: 1.5 }}>
              {permStatus === 'denied'
                ? 'Включите уведомления в настройках браузера, затем обновите страницу.'
                : 'Для напоминаний о лекарствах и приёмах врача разрешите уведомления.'}
            </p>
            {permStatus === 'default' && (
              <button onClick={handleRequestPermission}
                style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#856404', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Разрешить
              </button>
            )}
          </div>
        )}

        {/* ── Master toggle ──────────────────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 18, padding: '4px 16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
          <Row label="Все уведомления" sub="Включить/отключить все">
            <Toggle on={prefs.enabled} onChange={v => update('enabled', v)} />
          </Row>
        </div>

        {/* ── Voice settings ──────────────────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 18, padding: '4px 16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, padding: '10px 0 4px' }}>ГОЛОС И ЗВУК</p>

          <Row label="🔊 Голосовые напоминания" sub="Web Speech API (русский)">
            <Toggle on={prefs.voice} onChange={v => update('voice', v)} />
          </Row>

          <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>🔉 Громкость</p>
                <p style={{ fontSize: 12, color: C.t3, margin: '2px 0 0' }}>{prefs.volume}%</p>
              </div>
            </div>
            <input type="range" min={0} max={100} value={prefs.volume}
              onChange={e => update('volume', Number(e.target.value))}
              style={{ width: '100%', accentColor: C.accent }} />
          </div>

          <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginBottom: 10 }}>🎵 Звук уведомления</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { id: 'reminder',   label: '🔔 Обычный' },
                { id: 'medication', label: '💊 Лекарство' },
                { id: 'gentle',     label: '🌊 Мягкий' },
                { id: 'urgent',     label: '⚠️ Срочный' },
              ] as const).map(s => (
                <button key={s.id} onClick={() => { update('sound', s.id as typeof prefs.sound); testSound(s.id); }}
                  style={{
                    padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                    border: `1.5px solid ${prefs.sound === s.id ? C.accent : C.border}`,
                    background: prefs.sound === s.id ? C.accentBg : '#fafaf8',
                    fontSize: 12, fontWeight: 600, color: prefs.sound === s.id ? C.accent : C.t2,
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 10 }}>Тест уведомлений:</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => testSound(prefs.sound)}
                style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fafaf8', fontSize: 13, fontWeight: 600, color: C.t1, cursor: 'pointer' }}>
                🔊 Звук
              </button>
              <button onClick={testVoice}
                style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fafaf8', fontSize: 13, fontWeight: 600, color: C.t1, cursor: 'pointer' }}>
                🗣 Голос
              </button>
            </div>
          </div>
        </div>

        {/* ── Quiet hours ────────────────────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 18, padding: '4px 16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, padding: '10px 0 4px' }}>РЕЖИМ ТИШИНЫ</p>
          <Row label="🌙 Время тишины" sub="Уведомления не приходят">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="time" value={prefs.quietStart} onChange={e => update('quietStart', e.target.value)}
                style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.t1 }} />
              <span style={{ fontSize: 12, color: C.t3 }}>—</span>
              <input type="time" value={prefs.quietEnd} onChange={e => update('quietEnd', e.target.value)}
                style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.t1 }} />
            </div>
          </Row>
        </div>

        {/* ── Notification types ────────────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 18, padding: '4px 16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, padding: '10px 0 4px' }}>ТИПЫ УВЕДОМЛЕНИЙ</p>
          {TYPE_ROWS.map(r => (
            <Row key={r.key} label={r.label} sub={`${r.sub}${r.voice ? ' · голос 🗣' : ''}`}>
              <Toggle on={prefs.types[r.key]} onChange={v => updateType(r.key, v)} />
            </Row>
          ))}
        </div>

      </div>
    </div>
  );
}
