'use server';

import { getApiToken } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export interface LifestyleAnswers {
  sleepHoursPerNight?: string;
  stressLevel?: string;
  exerciseFrequency?: string;
  nutritionType?: string;
}

export async function saveLifestyle(locale: string, answers: LifestyleAnswers) {
  const apiToken = await getApiToken();

  // Persist to the health profile so the snapshot endpoint can read it.
  await fetch(`${API_BASE}/v1/aivita/health-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Cookie: `aivita_api=${apiToken}` } : {}),
    },
    body: JSON.stringify(answers),
  }).catch(() => {});

  redirect(`/${locale}/onboarding/result`);
}
