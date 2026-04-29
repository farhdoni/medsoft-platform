'use server';
import { setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

async function syncUserWithApi(
  name: string,
  email: string,
  locale: string
): Promise<{ userId: string; onboardingCompleted: boolean } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/auth/mock-sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, locale }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: { userId: string; onboardingCompleted: boolean } };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function mockSignIn(locale: string = 'ru') {
  const name = 'Азиз';
  const email = 'demo@aivita.uz';

  // Sync with real DB
  const apiUser = await syncUserWithApi(name, email, locale);

  await setSession({
    userId: apiUser?.userId ?? 'demo-user-id',
    email,
    name,
    onboardingCompleted: apiUser?.onboardingCompleted ?? false,
  });

  if (apiUser?.onboardingCompleted) {
    redirect(`/${locale}/home`);
  } else {
    redirect(`/${locale}/onboarding/welcome`);
  }
}

export async function mockSignInDirect(locale: string = 'ru') {
  const name = 'Азиз';
  const email = 'demo@aivita.uz';

  const apiUser = await syncUserWithApi(name, email, locale);

  await setSession({
    userId: apiUser?.userId ?? 'demo-user-id',
    email,
    name,
    onboardingCompleted: true,
  });
  redirect(`/${locale}/home`);
}
