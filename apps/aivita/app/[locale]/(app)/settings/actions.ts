'use server';
import { clearSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signOut() {
  await clearSession();
  redirect('/ru/sign-in');
}

export async function deleteAccount() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  // Soft-delete on API (sets deletedAt)
  await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/users`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `aivita_session=${sessionCookie}`,
      },
    }
  ).catch(() => null);

  await clearSession();
  redirect('/ru/sign-in');
}
