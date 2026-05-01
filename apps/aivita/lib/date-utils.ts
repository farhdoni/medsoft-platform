/** Returns age in years from a birth date string, or null if invalid. */
export function calcAge(birthDate: string): number | null {
  try {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

/** Returns up to 2 uppercase initials from a full name. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Returns today's date as YYYY-MM-DD in local time. */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
