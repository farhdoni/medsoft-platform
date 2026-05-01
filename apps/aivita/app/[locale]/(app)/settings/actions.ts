'use server';
import { clearSession } from '@/lib/auth/session';
import { apiRequest } from '@/lib/api-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signOut(locale: string = 'ru') {
  await clearSession();
  redirect(`/${locale}/sign-in`);
}

export async function deleteAccount(locale: string = 'ru') {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  // Soft-delete on API (sets deletedAt)
  await apiRequest('/users', { method: 'DELETE', sessionCookie }).catch(() => null);

  await clearSession();
  redirect(`/${locale}/sign-in`);
}
