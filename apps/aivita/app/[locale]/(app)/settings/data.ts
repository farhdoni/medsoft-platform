import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  locale: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: { push?: boolean; email?: boolean };
  } | null;
}

export async function loadSettingsData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const res = await api.users.me(sessionCookie);
  const user: UserData | null =
    'data' in res ? (res.data as UserData) : null;

  const localeLabel: Record<string, string> = { ru: 'Русский', uz: "O'zbek", en: 'English' };

  return {
    user,
    localeLabel: localeLabel[user?.locale ?? 'ru'] ?? 'Русский',
    notificationsOn: user?.preferences?.notifications?.push ?? true,
  };
}
