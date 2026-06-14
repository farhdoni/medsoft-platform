import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders, isProxyAuthenticated } from '@/lib/server-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// GET /api/vitals/hc-sync-state — read persisted Health Connect connection state
export async function GET() {
  const authHeaders = await getProxyAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals/hc-sync-state`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

// PUT /api/vitals/hc-sync-state — persist Health Connect connection state (status:'connected')
export async function PUT(req: NextRequest) {
  const authHeaders = await getProxyAuthHeaders();
  if (!isProxyAuthenticated(authHeaders)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const body = await req.json();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals/hc-sync-state`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { error: text || 'Empty response' }; }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Network error', message: String(e) }, { status: 502 });
  }
}
