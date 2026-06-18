import { fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

// Cache the set of valid IANA timezone identifiers (built into Node 20+).
// Intl.supportedValuesOf is available in Node 20; fall back gracefully on older runtimes.
const VALID_TIMEZONES: ReadonlySet<string> = (() => {
  try {
    return new Set((Intl as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf?.('timeZone') ?? []);
  } catch {
    return new Set<string>();
  }
})();

/**
 * Returns `tz` if it is a valid IANA timezone identifier, otherwise `DEFAULT_TIMEZONE`.
 * Used in cron jobs so that a single user with a bad value cannot break the whole run.
 */
export function safeTimezone(tz: string | null | undefined): string {
  if (tz && (VALID_TIMEZONES.size === 0 || VALID_TIMEZONES.has(tz))) return tz;
  return DEFAULT_TIMEZONE;
}

/**
 * Zod-compatible refinement: accepts only valid IANA identifiers.
 * Falls back to DEFAULT_TIMEZONE when the set could not be populated (Node < 20).
 */
export function isValidTimezone(tz: string): boolean {
  if (VALID_TIMEZONES.size === 0) {
    // Cannot validate — accept anything and let safeTimezone() guard at runtime.
    return true;
  }
  return VALID_TIMEZONES.has(tz);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a `from`/`to` query param into a UTC instant for comparing against
 * `vitals.recorded_at`.
 *
 * A bare calendar date (`YYYY-MM-DD`) is interpreted as **local midnight in the
 * user's timezone** — so "today" means the user's local day, not the server's
 * UTC day. Without this, a UTC+5 user's non-aggregate readings (heart_rate,
 * spo2, resting_heart_rate) recorded 00:00–05:00 local fall into "yesterday by
 * UTC" and get filtered out. `endOfDay` shifts a bare date to the last instant
 * of that local day (inclusive upper bound).
 *
 * Anything else (a full ISO timestamp, e.g. `2026-06-18T00:00:00.000Z`) is used
 * verbatim — callers querying the UTC-midnight aggregate grid pin to an explicit
 * instant and are unaffected by the timezone.
 */
export function parseDateBoundary(
  value: string,
  tz: string,
  opts: { endOfDay?: boolean } = {},
): Date {
  if (DATE_ONLY.test(value)) {
    const local = `${value}T${opts.endOfDay ? '23:59:59.999' : '00:00:00.000'}`;
    return fromZonedTime(local, safeTimezone(tz));
  }
  return new Date(value);
}
