/**
 * voice-notifications.ts
 * Web Speech API + Web Audio API utilities for voice & sound notifications.
 * No external audio files required — tones are generated programmatically.
 */

// ─── Sound generation via Web Audio API ──────────────────────────────────────

export type TonePreset = 'reminder' | 'urgent' | 'medication' | 'gentle';

const TONE_CONFIG: Record<TonePreset, { freq: number; duration: number; type: OscillatorType; repeats: number }> = {
  medication: { freq: 880,  duration: 0.15, type: 'sine',     repeats: 3 },
  urgent:     { freq: 1200, duration: 0.1,  type: 'square',   repeats: 5 },
  reminder:   { freq: 660,  duration: 0.2,  type: 'sine',     repeats: 2 },
  gentle:     { freq: 528,  duration: 0.3,  type: 'sine',     repeats: 1 },
};

export function playTone(preset: TonePreset = 'reminder', volumeFraction = 0.5): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const cfg = TONE_CONFIG[preset];

    for (let i = 0; i < cfg.repeats; i++) {
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type      = cfg.type;
      osc.frequency.value = cfg.freq;

      const startTime = ctx.currentTime + i * (cfg.duration + 0.05);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volumeFraction, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + cfg.duration);

      osc.start(startTime);
      osc.stop(startTime + cfg.duration + 0.01);
    }

    // Close context after all tones have played
    setTimeout(() => ctx.close().catch(() => {}), (cfg.repeats * (cfg.duration + 0.05) + 0.5) * 1000);
  } catch {
    // Web Audio not available — silently skip
  }
}

// ─── Voice synthesis via Web Speech API ──────────────────────────────────────

export interface SpeechOptions {
  lang?:  string;  // default 'ru-RU'
  rate?:  number;  // 0.5–2.0, default 1.0
  pitch?: number;  // 0–2, default 1.0
  volume?: number; // 0–1, default 0.9
}

export function speak(text: string, opts: SpeechOptions = {}): void {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang   = opts.lang   ?? 'ru-RU';
  utt.rate   = opts.rate   ?? 1.0;
  utt.pitch  = opts.pitch  ?? 1.0;
  utt.volume = opts.volume ?? 0.9;

  // Pick a Russian voice if available
  const voices = window.speechSynthesis.getVoices();
  const ruVoice = voices.find(v => v.lang.startsWith('ru'));
  if (ruVoice) utt.voice = ruVoice;

  window.speechSynthesis.speak(utt);
}

// ─── Browser notifications ────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export interface NotifyOptions {
  title:       string;
  body:        string;
  icon?:       string;
  voiceText?:  string;  // if set, will speak via TTS
  sound?:      TonePreset;
  vibrate?:    boolean;
  tag?:        string;
}

export function showBrowserNotification(opts: NotifyOptions, volume = 0.5): void {
  if (typeof window === 'undefined') return;

  // Play tone
  if (opts.sound) playTone(opts.sound, volume);

  // Vibration (mobile)
  if (opts.vibrate && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }

  // Voice synthesis
  if (opts.voiceText) speak(opts.voiceText);

  // Browser notification
  if (Notification.permission === 'granted') {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: opts.icon ?? '/icons/icon-192.png',
      tag:  opts.tag,
    });
    n.onclick = () => { window.focus(); n.close(); };
  }
}

// ─── Notification settings localStorage ──────────────────────────────────────

export interface NotificationPrefs {
  enabled:         boolean;
  voice:           boolean;
  volume:          number;   // 0–100
  sound:           TonePreset;
  quietStart:      string;   // HH:MM e.g. "23:00"
  quietEnd:        string;   // HH:MM e.g. "07:00"
  types: {
    medication:    boolean;
    appointment:   boolean;
    nutrition:     boolean;
    mood:          boolean;
    biometrics:    boolean;
    water:         boolean;
    aiAlert:       boolean;
  };
}

const LS_KEY = 'aivita_notif_prefs';

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled:     true,
  voice:       true,
  volume:      70,
  sound:       'reminder',
  quietStart:  '23:00',
  quietEnd:    '07:00',
  types: {
    medication:  true,
    appointment: true,
    nutrition:   false,
    mood:        true,
    biometrics:  true,
    water:       false,
    aiAlert:     true,
  },
};

export function loadNotifPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) as Partial<NotificationPrefs> };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotifPrefs(prefs: NotificationPrefs): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/** Returns true if current time is within the quiet hours window */
export function isQuietHours(prefs: NotificationPrefs): boolean {
  const now    = new Date();
  const hhmm   = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const { quietStart, quietEnd } = prefs;

  if (quietStart > quietEnd) {
    // Overnight window e.g. 23:00–07:00
    return hhmm >= quietStart || hhmm < quietEnd;
  }
  return hhmm >= quietStart && hhmm < quietEnd;
}
