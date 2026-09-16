/**
 * Canonical AIVITA blood-type storage format is 'A+' | 'A-' | 'B+' | 'B-' |
 * 'AB+' | 'AB-' | 'O+' | 'O-' (matches profile/ProfileClient's input
 * options) — every screen that writes health_profiles.blood_type should
 * write one of these, and every screen that displays it should go through
 * formatBloodType rather than showing the stored value directly.
 */

const GROUP_TO_ROMAN: Record<'O' | 'A' | 'B' | 'AB', 'I' | 'II' | 'III' | 'IV'> = {
  O: 'I', A: 'II', B: 'III', AB: 'IV',
};

/** Roman numeral (parenthesized) for a bare ABO letter, e.g. 'A' -> '(II)'. Null if not O/A/B/AB. */
export function bloodGroupRoman(letter: string): string | null {
  const roman = GROUP_TO_ROMAN[letter.toUpperCase() as keyof typeof GROUP_TO_ROMAN];
  return roman ? `(${roman})` : null;
}

/**
 * Formats a canonical blood type ('A+', 'B-', ...) as the ru/uz medical
 * convention: roman numeral + Rh sign, e.g. 'A+' -> '(II)Rh+'. Returns null
 * for empty/unset/'unknown' so callers keep their own "not specified"
 * copy; returns the input unchanged if it doesn't parse (e.g. legacy data
 * already in a different shape) rather than hiding it.
 */
export function formatBloodType(raw: string | null | undefined): string | null {
  if (!raw || raw === 'unknown') return null;
  // Accepts either a plain hyphen or the typographic minus (U+2212) some
  // Rh selectors use (e.g. family/ChildCardModal's RH_FACTORS).
  const m = /^(AB|A|B|O)\s*([+\-−])$/i.exec(raw.trim());
  if (!m) return raw;
  const [, letter, sign] = m;
  const roman = bloodGroupRoman(letter);
  if (!roman) return raw;
  return `${roman}Rh${sign === '+' ? '+' : '−'}`;
}
