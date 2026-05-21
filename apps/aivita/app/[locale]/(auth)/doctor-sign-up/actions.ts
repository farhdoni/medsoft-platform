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

export type DoctorRegisterState = {
  error: string | null;
  userId?: string;
  email?: string;
  step?: 'verify';
};

export async function registerDoctorAction(
  locale: string,
  _prev: DoctorRegisterState,
  formData: FormData
): Promise<DoctorRegisterState> {
  const fullName = (formData.get('name') as string).trim();
  const email = (formData.get('email') as string).trim().toLowerCase();
  const phone = (formData.get('phone') as string | null)?.trim() || undefined;
  const password = formData.get('password') as string;
  const specialization = (formData.get('specialization') as string | null)?.trim() || undefined;
  const experienceYearsRaw = formData.get('experienceYears') as string | null;
  const experienceYears = experienceYearsRaw ? parseInt(experienceYearsRaw, 10) || undefined : undefined;
  const workplace = (formData.get('workplace') as string | null)?.trim() || undefined;

  // Auto-generate a unique nickname from name + random suffix
  const base = fullName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 16) || 'doctor';
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const nickname = `${base}_${suffix}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        nickname,
        name: fullName,
        password,
        locale,
        role: 'doctor',
        specialization,
        phone,
        experienceYears,
        workplace,
      }),
    });
  } catch {
    return { error: 'network' };
  }

  const json = await res.json() as {
    data?: { userId: string; email: string };
    error?: string;
  };

  if (!res.ok || !json.data) {
    if (json.error === 'email_taken') return { error: 'email_taken' };
    if (json.error === 'phone_taken') return { error: 'phone_taken' };
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

  const json = await res.json() as {
    data?: { session: SessionPayload; apiToken?: string };
    error?: string;
  };

  if (!res.ok || !json.data?.session) {
    return { error: 'invalid_code' };
  }

  await setSession({ ...json.data.session, apiToken: json.data.apiToken });
  redirect(`/${locale}/doctor-home`);
}

export async function resendCodeAction(userId: string): Promise<void> {
  await fetch(`${API_BASE}/v1/aivita/auth/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});
}
