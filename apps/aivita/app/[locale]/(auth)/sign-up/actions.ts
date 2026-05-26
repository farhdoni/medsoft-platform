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

export type RegisterState = {
  error: string | null;
  userId?: string;
  email?: string;
  step?: 'verify';
};

export async function registerAction(
  locale: string,
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = (formData.get('email') as string).trim().toLowerCase();
  const nickname = (formData.get('nickname') as string).trim().toLowerCase();
  const name = (formData.get('name') as string | null)?.trim() || nickname;
  const password = formData.get('password') as string;
  const role = (formData.get('role') as string | null) ?? 'patient';
  const specialization = (formData.get('specialization') as string | null)?.trim() || undefined;
  const refCode = (formData.get('refCode') as string | null)?.trim() || undefined;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nickname, name, password, locale, role, specialization, refCode }),
    });
  } catch {
    return { error: 'network' };
  }

  let json: { data?: { userId: string; email: string }; error?: string };
  try {
    json = await res.json();
  } catch {
    return { error: 'server_error' };
  }

  if (!res.ok || !json.data) {
    if (json.error === 'email_taken') return { error: 'email_taken' };
    if (json.error === 'nickname_taken') return { error: 'nickname_taken' };
    return { error: 'server_error' };
  }

  return { error: null, userId: json.data.userId, email: json.data.email, step: 'verify' };
}

export type VerifyState = { error: string | null };

export async function verifyEmailAction(
  locale: string,
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const userId = formData.get('userId') as string;
  const code = formData.get('code') as string;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });
  } catch {
    return { error: 'network' };
  }

  let json: { data?: { session: SessionPayload; apiToken?: string }; error?: string };
  try {
    json = await res.json();
  } catch {
    return { error: 'invalid_code' };
  }

  if (!res.ok || !json.data?.session) {
    return { error: 'invalid_code' };
  }

  await setSession({ ...json.data.session, apiToken: json.data.apiToken });

  const session = json.data.session;
  if (session.role === 'doctor') {
    redirect(`/${locale}/doctor-home`);
  }
  redirect(session.onboardingCompleted ? `/${locale}/home` : `/${locale}/onboarding`);
}

export async function resendCodeAction(userId: string): Promise<void> {
  await fetch(`${API_BASE}/v1/aivita/auth/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});
}
