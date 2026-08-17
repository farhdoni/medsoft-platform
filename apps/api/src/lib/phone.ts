// Phone normalization for identity matching (ecosystem/v1 resolver).
//
// No canonicalization utility existed anywhere in the repo before this file
// (grepped normalizePhone/e164/formatPhone across apps/api + packages/db —
// zero hits). aivitaUsers.phone is stored as whatever raw string the signup
// flow received, unvalidated — seed data uses '+998XXXXXXXXX' but nothing
// enforces that, so '+998901234567' and '998901234567' are today two
// different, both-unique-constraint-legal row values that a naive equality
// match would treat as different people.
//
// Scope: Uzbek mobile numbers only (998, 9-digit subscriber number), since
// that's the only market this system operates in. Returns null for anything
// that doesn't parse to that shape rather than guessing.

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/[^0-9]/g, '');

  // '998901234567' (12 digits, country code included) or '901234567' (bare
  // 9-digit subscriber number, country code omitted).
  const nationalNumber =
    digits.length === 12 && digits.startsWith('998') ? digits.slice(3)
    : digits.length === 9 ? digits
    : null;

  if (!nationalNumber) return null;

  return `+998${nationalNumber}`;
}

// The distinct raw string forms normalizePhone() would collapse to the same
// canonical value — used to query aivitaUsers.phone (stored raw/unnormalized)
// by IN-list instead of normalizing every row in the table on every lookup.
export function phoneRawVariants(canonical: string): string[] {
  const withoutPlus = canonical.slice(1); // '+998901234567' -> '998901234567'
  return [canonical, withoutPlus];
}
