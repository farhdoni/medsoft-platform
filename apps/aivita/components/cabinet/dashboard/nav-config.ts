/**
 * Saved layout of the floating nav bar.
 *
 * Split out of FloatingNav so the repair below can be tested without mounting a
 * React tree: it runs on every user's device at startup, and a mistake there is
 * invisible until people complain that their bar looks wrong.
 */

export const NAV_LS_KEY = 'aivita_nav_config';

export type NavConfig = { left: string[]; right: string[] };

export const DEFAULT_NAV: NavConfig = {
  left: ['home', 'vitals'],
  right: ['medications', 'family'],
};

/**
 * Repairs one side of a saved layout against the tabs the app still offers.
 *
 * A build shipped on 2026-08-27 briefly put a 'chat' tab in the defaults, so
 * anyone who opened the app in that window has it written into their saved
 * config. Without this the tab would survive its own removal forever, because
 * the stored value wins over the defaults.
 *
 * Unknown ids are dropped and the slots refilled from the defaults, which also
 * covers any future removal without another migration.
 */
export function repairSide(saved: unknown, fallback: string[], valid: Set<string>): string[] {
  const kept = Array.isArray(saved)
    ? saved.filter((id): id is string => typeof id === 'string' && valid.has(id))
    : [];

  // Deduplicate: a corrupted config could repeat a tab, which would render two
  // identical buttons and break React's keys.
  const unique = [...new Set(kept)];

  for (const id of fallback) {
    if (unique.length >= fallback.length) break;
    if (!unique.includes(id)) unique.push(id);
  }
  return unique.slice(0, fallback.length);
}

export function repairNavConfig(parsed: { left?: unknown; right?: unknown }, valid: Set<string>): NavConfig {
  return {
    left: repairSide(parsed.left, DEFAULT_NAV.left, valid),
    right: repairSide(parsed.right, DEFAULT_NAV.right, valid),
  };
}
