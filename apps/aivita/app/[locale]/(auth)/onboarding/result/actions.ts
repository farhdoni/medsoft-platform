'use server';
import { getSession, setSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function completeOnboarding(locale: string = 'ru') {
  const cookieStore = await cookies();
  const raw = cookieStore.get('aivita_session')?.value;
  const session = await getSession();

  if (session && raw) {
    // Sync with API
    await fetch(`${API_BASE}/v1/aivita/auth/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `aivita_session=${raw}`,
      },
    }).catch(() => {});

    await setSession({ ...session, onboardingCompleted: true });
  }

  redirect(`/${locale}/home`);
}
