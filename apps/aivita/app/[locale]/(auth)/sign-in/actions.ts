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
  role?: 'patient' | 'doctor' | 'admin';
  plan?: 'free' | 'plus' | 'pro';
};

// redirectTo is returned to the client so it can navigate imperatively —
// avoids the Next.js 15 / React 18 bug where redirect() inside useActionState
// causes the spinner to hang indefinitely.
export type LoginState = { error: string | null; redirectTo?: string };

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

  let json: { data?: { session: SessionPayload; apiToken?: string; refreshToken?: string }; error?: string; userId?: string };
  try {
    json = await res.json();
  } catch {
    return { error: 'network' };
  }

  if (!res.ok || !json.data?.session) {
    if (json.error === 'email_not_verified' && json.userId) {
      // redirect() is safe here because we are NOT returning to useActionState
      redirect(`/${locale}/verify-email?userId=${json.userId}`);
    }
    if (json.error === 'account_locked') return { error: 'account_locked' };
    return { error: 'invalid_credentials' };
  }

  // Set session cookies server-side (refreshToken forwarded when SESSIONS_V2)
  await setSession({
    ...json.data.session,
    apiToken:     json.data.apiToken,
    refreshToken: json.data.refreshToken,
  });

  // Return the destination URL — client will navigate via window.location
  const { role, onboardingCompleted } = json.data.session;
  const dest = role === 'doctor'
    ? `/${locale}/doctor-home`
    : onboardingCompleted
      ? `/${locale}/home`
      : `/${locale}/onboarding/welcome`;

  return { error: null, redirectTo: dest };
}
