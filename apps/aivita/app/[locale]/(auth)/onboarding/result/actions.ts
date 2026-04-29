'use server';
import { setSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function completeOnboarding(locale: string = 'ru') {
  // Read existing session and mark onboarding as complete
  const cookieStore = await cookies();
  const raw = cookieStore.get('aivita_session')?.value;

  if (raw) {
    try {
      const session = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
      await setSession({ ...session, onboardingCompleted: true });
    } catch {
      // Set fresh session
      await setSession({
        userId: 'demo-user-id',
        email: 'demo@aivita.uz',
        name: 'Азиз',
        onboardingCompleted: true,
      });
    }
  } else {
    await setSession({
      userId: 'demo-user-id',
      email: 'demo@aivita.uz',
      name: 'Азиз',
      onboardingCompleted: true,
    });
  }

  redirect(`/${locale}/home`);
}
