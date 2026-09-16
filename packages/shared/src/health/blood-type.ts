/**
 * Formats a blood type/Rh as the app's canonical "(roman)Rh±" display string
 * (e.g. "(II)Rh+"), with NO Latin letter — per the unified-display decision.
 *
 * Accepts either storage shape used across the app:
 *   - combined:  formatBloodType('A+')            // health_profiles.bloodType
 *   - separate:  formatBloodType('A', '+')         // family_members.bloodGroup/rhFactor
 *
 * Does NOT trust a roman numeral that may already be embedded in the input
 * (e.g. the corrupted 'A(I)+' written by an older, mismapped onboarding
 * step) — it parses the blood-group LETTER and the Rh SIGN only, and always
 * recomputes the roman numeral from the correct table below. So a corrupted
 * value with the right letter still renders correctly; only the (unused)
 * embedded numeral was ever wrong.
 */

export type BloodLetter = 'O' | 'A' | 'B' | 'AB';

// The only medically correct mapping. Do not "fix" to match a mislabeled UI.
const ROMAN_BY_LETTER: Record<BloodLetter, string> = {
  O: 'I',
  A: 'II',
  B: 'III',
  AB: 'IV',
};

function extractLetter(raw?: string | null): BloodLetter | null {
  if (!raw) return null;
  const m = raw.trim().toUpperCase().match(/^(AB|A|B|O)/);
  return (m?.[1] as BloodLetter | undefined) ?? null;
}

function extractRhSign(raw?: string | null): '+' | '-' | null {
  if (!raw) return null;
  if (raw.includes('+')) return '+';
  if (raw.includes('-') || raw.includes('−') || raw.includes('–')) return '-';
  return null;
}

/**
 * @param bloodTypeOrGroup Combined value ('A+', 'A-', or a corrupted 'A(I)+'),
 *   or just the letter part when passing separate fields ('A', 'A(I)').
 * @param rhFactor Only used when `bloodTypeOrGroup` doesn't itself carry a
 *   Rh sign — e.g. family_members' separate rhFactor field ('+', '-', '?').
 * @param unknown Fallback string when nothing parseable is present. Default '—'.
 */
export function formatBloodType(
  bloodTypeOrGroup?: string | null,
  rhFactor?: string | null,
  unknown = '—',
): string {
  const letter = extractLetter(bloodTypeOrGroup);
  const rh = extractRhSign(bloodTypeOrGroup) ?? extractRhSign(rhFactor);

  if (!letter && !rh) return unknown;

  const roman = letter ? `(${ROMAN_BY_LETTER[letter]})` : '';
  const rhPart = rh ? `Rh${rh === '-' ? '−' : '+'}` : '';
  return `${roman}${rhPart}` || unknown;
}
