'use server';
import { setSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function completeOnboarding(locale: string = 'ru') {
  const cookieStore = await cookies();
  const raw = cookieStore.get('aivita_session')?.value;

  let session = {
    userId: 'demo-user-id',
    email: 'demo@aivita.uz',
    name: 'Азиз',
    onboardingCompleted: true,
  };

  if (raw) {
    try {
      const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
      session = { ...decoded, onboardingCompleted: true };

      // Sync with API
      await fetch(`${API_BASE}/v1/aivita/auth/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `aivita_session=${raw}`,
        },
      }).catch(() => {});
    } catch {}
  }

  await setSession(session);
  redirect(`/${locale}/home`);
}
