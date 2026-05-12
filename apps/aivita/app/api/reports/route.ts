import { NextResponse } from 'next/server';
import { getProxyAuthHeaders, isProxyAuthenticated } from '@/lib/server-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// GET /api/reports — list reports
export async function GET() {
  const authHeaders = await getProxyAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/reports`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

// POST /api/reports — generate report
export async function POST() {
  const authHeaders = await getProxyAuthHeaders();
  if (!isProxyAuthenticated(authHeaders)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/reports/generate`, {
      method: 'POST',
      headers: authHeaders,
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { error: text || 'Empty response' }; }
    if (!res.ok) {
      const msg = (json as { message?: string; error?: string })?.message
        ?? (json as { error?: string })?.error
        ?? `Ошибка сервера ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Network error', message: String(e) }, { status: 502 });
  }
}
