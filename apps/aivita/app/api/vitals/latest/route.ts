import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function GET() {
  const store = await cookies();
  const session = store.get('aivita_api')?.value ?? '';
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals/latest`, {
      headers: { Cookie: `aivita_api=${session}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
