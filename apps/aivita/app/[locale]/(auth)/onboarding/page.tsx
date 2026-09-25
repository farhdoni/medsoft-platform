import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth/session';
import { isSoft3dEnabled } from '@/lib/soft3d/flag';
import { apiRequest } from '@/lib/api-client';
import OnboardingWizardClient from './OnboardingWizardClient';

interface LadderStatus {
  hasConsent: boolean;
  hasQ1: boolean;
  isMinor: boolean;
  parentConsentCleared: boolean;
  hasQ2: boolean;
  completed: boolean;
}

/**
 * Gate, not content. Unflagged accounts get exactly today's Flow A wizard,
 * unchanged (OnboardingWizardClient.tsx — moved here verbatim so this file
 * could become a server component without touching a single line of it).
 * Flagged accounts get the new Consent/Q1/R1/Q2/Done1 ladder, routed to
 * whichever step they haven't finished yet — by what's actually saved
 * (GET /onboarding-ladder/status), not a step counter. See
 * onboarding-ladder.ts's module comment for why a counter was rejected.
 */
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in`);

  if (!isSoft3dEnabled(session.email)) {
    return <OnboardingWizardClient />;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';
  const result = await apiRequest<LadderStatus>('/onboarding-ladder/status', { sessionCookie });
  const status = 'data' in result ? result.data : null;

  // Consent is checked BEFORE the "already completed" shortcut below, on
  // purpose — an account that finished onboarding under Flow A before ever
  // being flagged onto this ladder has never seen this screen or agreed to
  // anything in patient_consents. This is what makes the retroactive
  // backfill work: ConsentClient sends a successful save back to plain
  // /onboarding, which re-runs this exact check and (now hasConsent=true)
  // falls through to the completed-shortcut below on the very next request.
  if (!status || !status.hasConsent) redirect(`/${locale}/onboarding/consent`);

  if (session.onboardingCompleted) redirect(`/${locale}/home`);

  if (!status.hasQ1) redirect(`/${locale}/onboarding/q1`);
  if (status.isMinor && !status.parentConsentCleared) redirect(`/${locale}/onboarding/parent-consent`);
  if (!status.hasQ2) redirect(`/${locale}/onboarding/q2`);
  redirect(`/${locale}/onboarding/done1`);
}
