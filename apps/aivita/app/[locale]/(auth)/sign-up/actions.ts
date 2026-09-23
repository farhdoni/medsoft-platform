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

export type QuickStartState = {
  error: string | null;
  userId?: string;
  email?: string;
  step?: 'verify';
};

// Part B: email -> code -> in, no password at this step. Deliberately the
// same result shape as RegisterState so the page can render one shared
// verify step regardless of which form the person used to get there.
export async function quickStartAction(
  locale: string,
  _prev: QuickStartState,
  formData: FormData
): Promise<QuickStartState> {
  const email = (formData.get('email') as string).trim().toLowerCase();
  const timezone = (formData.get('timezone') as string | null)?.trim() || undefined;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/passwordless/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locale, timezone }),
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
    // email_taken here means the email is verified — go sign in instead
    // (same B3 framing as the full-form path). An unverified email doesn't
    // reach this branch: the API resends a fresh code to that same account
    // and returns 201, flowing through the success path below.
    if (json.error === 'email_taken') return { error: 'email_taken' };
    if (json.error === 'delivery_failed') return { error: 'delivery_failed' };
    if (json.error === 'resend_cooldown') return { error: 'resend_cooldown' };
    if (json.error === 'too_many_attempts') return { error: 'too_many_attempts' };
    return { error: 'server_error' };
  }

  return { error: null, userId: json.data.userId, email: json.data.email, step: 'verify' };
}

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
  // Populated client-side via Intl.DateTimeFormat().resolvedOptions().timeZone hidden input.
  // Validated on the API side via isValidTimezone(); falls back to Asia/Tashkent if absent.
  const timezone = (formData.get('timezone') as string | null)?.trim() || undefined;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nickname, name, password, locale, role, specialization, refCode, timezone }),
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
    // email_taken here means the email is verified — go sign in instead.
    // An unverified email doesn't reach this branch at all: the API
    // resends a fresh code to that same account and returns 201 with
    // `data`, so it flows through the success path below exactly like a
    // brand-new registration (same next screen — enter the code).
    if (json.error === 'email_taken') return { error: 'email_taken' };
    if (json.error === 'nickname_taken') return { error: 'nickname_taken' };
    if (json.error === 'delivery_failed') return { error: 'delivery_failed' };
    if (json.error === 'resend_cooldown') return { error: 'resend_cooldown' };
    if (json.error === 'too_many_attempts') return { error: 'too_many_attempts' };
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
    // B4: distinguish "wrong code" from "locked out after too many wrong
    // guesses" — otherwise a genuinely-locked user just keeps re-reading
    // the same code hoping it'll eventually work.
    if (json.error === 'too_many_attempts') return { error: 'verify_locked' };
    return { error: 'invalid_code' };
  }

  await setSession({ ...json.data.session, apiToken: json.data.apiToken });

  const session = json.data.session;
  if (session.role === 'doctor') {
    redirect(`/${locale}/doctor-home`);
  }
  redirect(session.onboardingCompleted ? `/${locale}/home` : `/${locale}/onboarding`);
}

export type ResendState = { ok: boolean; error?: string; retryAfterSeconds?: number };

// B4: /resend-code now enforces the same cooldown/cap server-side as
// registration itself — this used to fire-and-forget (`.catch(() => {})`,
// no return value at all), so a server-side rejection was invisible: the
// button just restarted its local 60s timer regardless of what actually
// happened. Now the caller can show the real reason and, when rate-limited,
// sync the countdown to the server's own retryAfterSeconds.
export async function resendCodeAction(userId: string): Promise<ResendState> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/aivita/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch {
    return { ok: false, error: 'network' };
  }

  let json: { data?: { sent: boolean }; error?: string; retryAfterSeconds?: number };
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: 'server_error' };
  }

  if (!res.ok || !json.data?.sent) {
    return { ok: false, error: json.error ?? 'server_error', retryAfterSeconds: json.retryAfterSeconds };
  }

  return { ok: true };
}
