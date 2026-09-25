import { redirect, notFound } from 'next/navigation';
import { getSession, type AivitaSession } from '@/lib/auth/session';
import { isSoft3dEnabled } from '@/lib/soft3d/flag';

/**
 * Every ladder screen is independently reachable by URL, not just through
 * /onboarding's own routing — a non-flagged account typing /onboarding/q1
 * directly must not see it (that's the whole "without the flag, nothing
 * changes" guarantee). 404s rather than redirecting to sign-in/home so a
 * flagged-off account gets the same "this doesn't exist" response whether
 * or not they're signed in — no information leak either way.
 */
export async function requireLadderAccess(locale: string): Promise<AivitaSession> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in`);
  if (!isSoft3dEnabled(session.email)) notFound();
  return session;
}
