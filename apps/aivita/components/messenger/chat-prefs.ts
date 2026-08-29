/**
 * Per-device chat appearance settings.
 *
 * These are viewing preferences, not account data: they belong to the device
 * someone is reading on, so localStorage is the right home and there is no API
 * behind them. Everything here is pure except read/write, which keeps the
 * palette and sizing testable without a browser.
 *
 * Applied by <ChatSurface>, which turns a Prefs object into CSS custom
 * properties. Components consume them as var(--av-…) with the light value as
 * the fallback, so a screen still renders correctly before hydration.
 */

export type ThemeId = 'light' | 'dark';
export type TextSizeId = 's' | 'm' | 'l';
export type BackgroundId = 'plain' | 'rose' | 'sky' | 'sage' | 'dots';

export type ChatPrefs = {
  theme: ThemeId;
  textSize: TextSizeId;
  background: BackgroundId;
  sound: boolean;
  enterSend: boolean;
  autoloadMedia: boolean;
  autoplayGif: boolean;
};

export const PREF_KEYS = {
  theme: 'av-chat-theme',
  textSize: 'av-chat-text-size',
  background: 'av-chat-bg',
  sound: 'av-chat-sound',
  enterSend: 'av-chat-enter-send',
  autoloadMedia: 'av-chat-autoload-media',
  autoplayGif: 'av-chat-autoplay-gif',
} as const;

export const DEFAULT_PREFS: ChatPrefs = {
  theme: 'light',
  textSize: 'm',
  background: 'plain',
  sound: true,
  enterSend: true,
  autoloadMedia: true,
  autoplayGif: true,
};

export const TEXT_SIZES: { id: TextSizeId; label: string; px: number }[] = [
  { id: 's', label: 'S', px: 13 },
  { id: 'm', label: 'M', px: 14 },
  { id: 'l', label: 'L', px: 16 },
];

export const BACKGROUNDS: { id: BackgroundId; label: string; light: string; dark: string }[] = [
  { id: 'plain', label: 'Чистый', light: '#f4f3ef', dark: '#1e1a28' },
  {
    id: 'rose',
    label: 'Роза',
    light: 'linear-gradient(160deg, #fdf5f7 0%, #f0d4dc 100%)',
    dark: 'linear-gradient(160deg, #241d2a 0%, #33222c 100%)',
  },
  {
    id: 'sky',
    label: 'Небо',
    light: 'linear-gradient(160deg, #f2f8ff 0%, #dbeeff 100%)',
    dark: 'linear-gradient(160deg, #1b1f2b 0%, #232f3d 100%)',
  },
  {
    id: 'sage',
    label: 'Шалфей',
    light: 'linear-gradient(160deg, #f6faf0 0%, #d8e8c0 100%)',
    dark: 'linear-gradient(160deg, #1d241d 0%, #26302a 100%)',
  },
  {
    id: 'dots',
    label: 'Точки',
    light: 'radial-gradient(#e2ddd4 1px, transparent 1px) 0 0/16px 16px, #f4f3ef',
    dark: 'radial-gradient(#332c42 1px, transparent 1px) 0 0/16px 16px, #1e1a28',
  },
];

/**
 * Dark is an inversion of the AIVITA tokens, not a separate design: outgoing
 * bubbles keep #9c5e6c so the conversation still reads as the same product.
 */
const THEME_TOKENS: Record<ThemeId, Record<string, string>> = {
  light: {
    '--av-surface': '#f4f3ef',
    '--av-panel': '#ffffff',
    '--av-border': '#e8e4dc',
    '--av-text': '#2a2540',
    '--av-text-dim': '#6a6580',
    '--av-text-mute': '#9a96a8',
    '--av-bubble-in-bg': '#ffffff',
    '--av-bubble-in-text': '#2a2540',
    '--av-bubble-out-bg': '#9c5e6c',
    '--av-bubble-out-text': '#ffffff',
  },
  dark: {
    '--av-surface': '#1e1a28',
    '--av-panel': '#2a2540',
    '--av-border': '#3a3350',
    '--av-text': '#f4f3ef',
    '--av-text-dim': '#b8b3c4',
    '--av-text-mute': '#8c8799',
    '--av-bubble-in-bg': '#2a2540',
    '--av-bubble-in-text': '#f4f3ef',
    '--av-bubble-out-bg': '#9c5e6c',
    '--av-bubble-out-text': '#ffffff',
  },
};

/** CSS custom properties for a set of preferences. Pure — safe to unit test. */
export function surfaceVars(prefs: ChatPrefs): Record<string, string> {
  const bg = BACKGROUNDS.find((b) => b.id === prefs.background) ?? BACKGROUNDS[0];
  const size = TEXT_SIZES.find((t) => t.id === prefs.textSize) ?? TEXT_SIZES[1];
  return {
    ...THEME_TOKENS[prefs.theme],
    '--av-chat-bg': prefs.theme === 'dark' ? bg.dark : bg.light,
    '--av-msg-size': `${size.px}px`,
  };
}

function isOneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes((value ?? '') as T) ? ((value ?? '') as T) : fallback;
}

/** Reads what this device has chosen; falls back cleanly in private mode. */
export function readPrefs(): ChatPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    return {
      theme: isOneOf(localStorage.getItem(PREF_KEYS.theme), ['light', 'dark'] as const, DEFAULT_PREFS.theme),
      textSize: isOneOf(localStorage.getItem(PREF_KEYS.textSize), ['s', 'm', 'l'] as const, DEFAULT_PREFS.textSize),
      background: isOneOf(
        localStorage.getItem(PREF_KEYS.background),
        BACKGROUNDS.map((b) => b.id) as BackgroundId[],
        DEFAULT_PREFS.background,
      ),
      sound: (localStorage.getItem(PREF_KEYS.sound) ?? '1') !== '0',
      enterSend: (localStorage.getItem(PREF_KEYS.enterSend) ?? '1') !== '0',
      autoloadMedia: (localStorage.getItem(PREF_KEYS.autoloadMedia) ?? '1') !== '0',
      autoplayGif: (localStorage.getItem(PREF_KEYS.autoplayGif) ?? '1') !== '0',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Prefs stored as 1/0 rather than their literal string value. */
const BOOLEAN_PREFS = new Set<keyof ChatPrefs>(['sound', 'enterSend', 'autoloadMedia', 'autoplayGif']);

export function writePref<K extends keyof ChatPrefs>(key: K, value: ChatPrefs[K]): void {
  try {
    localStorage.setItem(PREF_KEYS[key], BOOLEAN_PREFS.has(key) ? (value ? '1' : '0') : String(value));
    // Same-tab listeners: the storage event only fires in *other* tabs.
    window.dispatchEvent(new CustomEvent('av-chat-prefs'));
  } catch { /* private mode — the choice just does not persist */ }
}
