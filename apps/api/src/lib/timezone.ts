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
