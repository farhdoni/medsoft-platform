'use server';

import { getApiToken } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function saveAge(locale: string, age: number) {
  const apiToken = await getApiToken();
  const year = new Date().getFullYear() - age;
  // Store an approximate birth date; only the year matters for the age-based Score.
  const birthDate = `${year}-01-01`;

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
