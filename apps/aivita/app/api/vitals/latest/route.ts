import { NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '@/lib/server-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function GET() {
  const authHeaders = await getProxyAuthHeaders();
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
