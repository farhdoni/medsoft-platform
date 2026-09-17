import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  locale: string;
  timezone: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: { push?: boolean; email?: boolean };
  } | null;
}

// apiRequest() (lib/api-client.ts) is hardcoded to /v1/aivita/*, but
// /v1/app-version is mounted at the API root — hence the plain fetch here
// instead of going through that helper, same NEXT_PUBLIC_API_URL fallback
// it uses. Kept last-resort fallback at the actual current release rather
// than repeating the old stale hardcode this replaces.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';
const APP_VERSION_FALLBACK = '1.3.24';

async function loadAppVersion(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/v1/app-version`, { next: { revalidate: 300 } });
    if (!res.ok) return APP_VERSION_FALLBACK;
    const json = (await res.json()) as { latestVersionName?: unknown };
    return typeof json.latestVersionName === 'string' && json.latestVersionName
      ? json.latestVersionName
      : APP_VERSION_FALLBACK;
  } catch {
    return APP_VERSION_FALLBACK;
  }
}

export async function loadSettingsData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const [res, appVersion] = await Promise.all([
    api.users.me(sessionCookie),
    loadAppVersion(),
  ]);
  const user: UserData | null =
    'data' in res ? (res.data as UserData) : null;

  const localeLabel: Record<string, string> = { ru: 'Русский', uz: "O'zbek", en: 'English' };

  return {
    user,
    localeLabel: localeLabel[user?.locale ?? 'ru'] ?? 'Русский',
    notificationsOn: user?.preferences?.notifications?.push ?? true,
    currentTimezone: user?.timezone ?? 'Asia/Tashkent',
    appVersion,
  };
}
