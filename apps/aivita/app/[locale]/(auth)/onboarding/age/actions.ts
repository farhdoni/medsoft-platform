'use server';

import { getApiToken } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function saveBirthDate(locale: string, birthDate: string) {
  const apiToken = await getApiToken();

  await fetch(`${API_BASE}/v1/aivita/health-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Cookie: `aivita_api=${apiToken}` } : {}),
    },
    body: JSON.stringify({ birthDate }),
  }).catch(() => {});

  redirect(`/${locale}/onboarding/anamnesis`);
}
