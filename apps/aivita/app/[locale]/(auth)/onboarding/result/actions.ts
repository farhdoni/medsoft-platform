'use server';
import { getSession, getApiToken, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function completeOnboarding(locale: string = 'ru') {
  const session = await getSession();
  const apiToken = await getApiToken();

  if (session) {
    // Sync with API using the API-signed token
    await fetch(`${API_BASE}/v1/aivita/auth/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Cookie: `aivita_api=${apiToken}` } : {}),
      },
    }).catch(() => {});

    await setSession({ ...session, onboardingCompleted: true });
  }

  redirect(`/${locale}/home`);
}
