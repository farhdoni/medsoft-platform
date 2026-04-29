'use server';
import { setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export async function mockSignIn(locale: string = 'ru') {
  await setSession({
    userId: 'demo-user-id',
    email: 'demo@aivita.uz',
    name: 'Азиз',
    onboardingCompleted: false,
  });
  redirect(`/${locale}/onboarding/welcome`);
}

export async function mockSignInDirect(locale: string = 'ru') {
  await setSession({
    userId: 'demo-user-id',
    email: 'demo@aivita.uz',
    name: 'Азиз',
    onboardingCompleted: true,
  });
  redirect(`/${locale}/home`);
}
