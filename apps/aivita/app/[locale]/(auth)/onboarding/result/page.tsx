import { getApiToken } from '@/lib/auth/session';
import { ResultClient, type Snapshot } from './ResultClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OnboardingResultPage({ params }: Props) {
  const { locale } = await params;
  const apiToken = await getApiToken();

  let snapshot: Snapshot | null = null;
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/onboarding/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Cookie: `aivita_api=${apiToken}` } : {}),
      },
      body: JSON.stringify({ locale }),
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: Snapshot };
      snapshot = json.data ?? null;
    }
  } catch {
    // ResultClient renders a safe default if the snapshot is unavailable.
  }

  return <ResultClient locale={locale} snapshot={snapshot} />;
}
