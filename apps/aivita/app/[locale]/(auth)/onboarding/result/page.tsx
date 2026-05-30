import { getApiToken } from '@/lib/auth/session';
import { ResultClient, type Profile } from './ResultClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OnboardingResultPage({ params }: Props) {
  const { locale } = await params;
  const apiToken = await getApiToken();

  // Fast, AI-free profile read. The Health Score is computed on-device in the
  // client from this profile (instant + offline); the AI insight, persistence
  // and authoritative passport age are fetched in the background by the client.
  let profile: Profile | null = null;
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/health-profile`, {
      headers: { ...(apiToken ? { Cookie: `aivita_api=${apiToken}` } : {}) },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: Profile };
      profile = json.data ?? null;
    }
  } catch {
    // ResultClient renders a safe default if the profile is unavailable.
  }

  return <ResultClient locale={locale} profile={profile} />;
}
