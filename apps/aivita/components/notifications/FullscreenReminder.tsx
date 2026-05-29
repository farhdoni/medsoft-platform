'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { speak, playTone, loadNotifPrefs, isQuietHours, type TonePreset } from '@/lib/voice-notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderPayload {
  id:          string;
  title:       string;
  body:        string;
  voiceText?:  string;
  sound?:      TonePreset;
  persistent?: boolean;    // re-fires every 5 min until dismissed
  actions?: {
    confirm: string;   // e.g. "✅ Принял"
    snooze:  string;   // e.g. "⏰ Через 15 мин"
  };
  onConfirm?: () => void;
  onSnooze?:  () => void;
}

// ─── Event bus ───────────────────────────────────────────────────────────────

type ReminderListener = (payload: ReminderPayload) => void;
const listeners = new Set<ReminderListener>();

/** Call this anywhere in the app to trigger a fullscreen reminder */
export function triggerReminder(payload: ReminderPayload): void {
  listeners.forEach(fn => fn(payload));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FullscreenReminder() {
  const [active, setActive] = useState<ReminderPayload | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    if (repeatRef.current) { clearInterval(repeatRef.current); repeatRef.current = null; }
    setActive(null);
  }, []);

  const handleConfirm = useCallback(() => {
    active?.onConfirm?.();
    dismiss();
  }, [active, dismiss]);

  const handleSnooze = useCallback(() => {
    active?.onSnooze?.();
    dismiss();
    // Re-fire after 15 minutes if not confirmed
    setTimeout(() => {
      if (active) listeners.forEach(fn => fn(active));
    }, 15 * 60 * 1000);
  }, [active, dismiss]);

  useEffect(() => {
    const handler = (payload: ReminderPayload) => {
      const prefs = loadNotifPrefs();
      if (!prefs.enabled) return;
      if (isQuietHours(prefs)) return;

      setActive(payload);

      // Play sound + voice
      const vol = prefs.volume / 100;
      playTone(payload.sound ?? prefs.sound, vol);
      if (prefs.voice && payload.voiceText) speak(payload.voiceText);

      // Vibrate
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);

      // Persistent: repeat every 5 min
      if (payload.persistent) {
        if (repeatRef.current) clearInterval(repeatRef.current);
        repeatRef.current = setInterval(() => {
          playTone(payload.sound ?? prefs.sound, vol);
          if (prefs.voice && payload.voiceText) speak(payload.voiceText);
        }, 5 * 60 * 1000);
      }
    };

    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  useEffect(() => () => { if (repeatRef.current) clearInterval(repeatRef.current); }, []);

  if (!active) return null;

  const actions = active.actions ?? { confirm: '✅ Принял', snooze: '⏰ Через 15 мин' };
  const soundIcon = active.sound === 'medication' ? '💊' : active.sound === 'urgent' ? '⚠️' : '🔔';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 28, padding: '36px 28px',
        maxWidth: 380, width: '100%', textAlign: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        animation: 'reminderPulse 2s ease-in-out infinite',
      }}>
        {/* Pulsing icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f0d4dc, #e0d8f0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 36,
        }}>
          {soundIcon}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#2a2540', marginBottom: 10 }}>
          {active.title}
        </h2>
        <p style={{ fontSize: 16, color: '#6a6580', lineHeight: 1.5, marginBottom: 28 }}>
          {active.body}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleConfirm}
            style={{
              padding: '16px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #9c5e6c, #7a3848)',
              color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer',
              letterSpacing: 0.3,
            }}>
            {actions.confirm}
          </button>
          <button
            onClick={handleSnooze}
            style={{
              padding: '14px', borderRadius: 16, border: '1.5px solid #e8e4dc',
              background: '#fafaf8', color: '#6a6580', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
            {actions.snooze}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes reminderPulse {
          0%, 100% { box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 0 rgba(156,94,108,0.4); }
          50%       { box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 20px rgba(156,94,108,0); }
        }
      `}</style>
    </div>
  );
}
