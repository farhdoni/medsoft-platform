import { NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '@/lib/server-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// GET /api/notifications — list notifications
export async function GET() {
  const authHeaders = await getProxyAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/notifications`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

// POST /api/notifications/read-all
export async function POST() {
  const authHeaders = await getProxyAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/notifications/read-all`, {
      method: 'POST',
      headers: authHeaders,
    });
    const json = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
