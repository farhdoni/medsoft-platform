/**
 * Quiet hours for chat push notifications.
 *
 * The window wraps midnight (22:00–08:00), which is the part that gets written
 * wrongly: `hour >= 22 && hour < 8` is never true. It has to be an OR.
 *
 * Kept as a pure function taking an explicit instant so it can be tested at any
 * hour of any timezone without waiting for night, and so the push path has one
 * obvious place to look when someone asks why a notification did or did not
 * arrive.
 */

export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;

/** Matches aivita_users.timezone's default. */
export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

/**
 * The hour of day at `instant` as seen in `timeZone`.
 * Falls back to the default zone when the stored value is unusable, rather than
 * throwing inside a push send.
 */
export function hourInZone(instant: Date, timeZone: string | null | undefined): number {
  const zone = timeZone || DEFAULT_TIMEZONE;
  try {
    return Number(
      new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: zone })
        .format(instant),
    );
  } catch {
    return Number(
      new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: DEFAULT_TIMEZONE })
        .format(instant),
    );
  }
}

/**
 * True when `instant`, read in the recipient's own timezone, falls inside the
 * quiet window. The window spans midnight, so the two halves are OR-ed.
 */
export function isQuietHour(instant: Date, timeZone: string | null | undefined): boolean {
  const hour = hourInZone(instant, timeZone);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

export type PushDecision =
  | { send: true; preview: boolean }
  | { send: false; reason: 'muted' | 'quiet-hours' };

/**
 * Whether to push, and whether the body may quote the message.
 *
 * Muting wins over everything: someone who silenced a chat should not be woken
 * by it even outside quiet hours. Quiet hours come next. `preview: false` still
 * sends — the person wanted to know something arrived, just not what it said.
 */
export function decidePush(opts: {
  now: Date;
  mutedUntil: Date | null;
  quietHours: boolean;
  notifPreview: boolean;
  timeZone: string | null | undefined;
}): PushDecision {
  const { now, mutedUntil, quietHours, notifPreview, timeZone } = opts;

  if (mutedUntil && mutedUntil.getTime() > now.getTime()) {
    return { send: false, reason: 'muted' };
  }
  if (quietHours && isQuietHour(now, timeZone)) {
    return { send: false, reason: 'quiet-hours' };
  }
  return { send: true, preview: notifPreview };
}
