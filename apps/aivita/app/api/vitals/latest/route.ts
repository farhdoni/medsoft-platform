import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const store = await cookies();
  const apiCookie = store.get('aivita_api')?.value;
  const sessionCookie = store.get('aivita_session')?.value;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiCookie) {
    headers['Cookie'] = `aivita_api=${apiCookie}`;
  } else if (sessionCookie) {
    headers['X-Aivita-Session'] = sessionCookie;
  }
  return headers;
}

export async function GET() {
  const authHeaders = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals/latest`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
