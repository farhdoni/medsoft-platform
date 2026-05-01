'use server';
import { setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
};

export type LoginState = { error: string | null };

export async function loginAction(
  locale: string,
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = (formData.get('identifier') as string).trim();
  const password = formData.get('password') as string;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    return { error: 'network' };
  }

  const json = await res.json() as {
    data?: { session: SessionPayload };
    error?: string;
    userId?: string;
  };

  if (!res.ok || !json.data?.session) {
    if (json.error === 'email_not_verified' && json.userId) {
      redirect(`/${locale}/verify-email?userId=${json.userId}`);
    }
    if (json.error === 'account_locked') return { error: 'account_locked' };
    return { error: 'invalid_credentials' };
  }

  await setSession(json.data.session);

  redirect(json.data.session.onboardingCompleted ? `/${locale}/home` : `/${locale}/onboarding/welcome`);
}
