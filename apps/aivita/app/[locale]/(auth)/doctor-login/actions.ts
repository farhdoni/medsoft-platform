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
};

export type DoctorLoginState = { error: string | null };

export async function doctorLoginAction(
  locale: string,
  _prev: DoctorLoginState,
  formData: FormData
): Promise<DoctorLoginState> {
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

  let json: {
    data?: { session: SessionPayload; apiToken?: string; refreshToken?: string };
    error?: string;
    userId?: string;
  };
  try {
    json = await res.json();
  } catch {
    return { error: 'network' };
  }

  if (!res.ok || !json.data?.session) {
    if (json.error === 'email_not_verified' && json.userId) {
      redirect(`/${locale}/verify-email?userId=${json.userId}`);
    }
    if (json.error === 'account_locked') return { error: 'account_locked' };
    return { error: 'invalid_credentials' };
  }

  const session = json.data.session;

  // Только врачи и администраторы могут войти через эту страницу
  if (session.role !== 'doctor' && session.role !== 'admin') {
    return { error: 'not_doctor' };
  }

  await setSession({ ...session, apiToken: json.data.apiToken, refreshToken: json.data.refreshToken });
  redirect(`/${locale}/doctor-home`);
}
