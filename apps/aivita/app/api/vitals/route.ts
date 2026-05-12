import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

/** Build auth headers: prefer aivita_api, fall back to aivita_session (API middleware accepts both). */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const store = await cookies();
  const apiCookie = store.get('aivita_api')?.value;
  const sessionCookie = store.get('aivita_session')?.value;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiCookie) {
    headers['Cookie'] = `aivita_api=${apiCookie}`;
  } else if (sessionCookie) {
    // Fallback: pass Next.js JWT via X-Aivita-Session header (accepted by API middleware)
    headers['X-Aivita-Session'] = sessionCookie;
  }
  return headers;
}

function isAuthenticated(headers: Record<string, string>) {
  return !!(headers['Cookie'] || headers['X-Aivita-Session']);
}

// GET /api/vitals — list vitals
export async function GET(req: NextRequest) {
  const authHeaders = await getAuthHeaders();
  const search = req.nextUrl.searchParams.toString();
  try {
    const res = await fetch(
      `${API_BASE}/v1/aivita/vitals${search ? '?' + search : ''}`,
      { headers: authHeaders, cache: 'no-store' }
    );
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

// POST /api/vitals — save vital
export async function POST(req: NextRequest) {
  const authHeaders = await getAuthHeaders();
  if (!isAuthenticated(authHeaders)) {
    return NextResponse.json({ error: 'Not authenticated', message: 'Сессия истекла, войдите снова' }, { status: 401 });
  }
  const body = await req.json();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { error: text || 'Empty response' }; }
    // Forward API error message to client
    if (!res.ok) {
      const msg = (json as { message?: string; error?: string })?.message
        ?? (json as { error?: string })?.error
        ?? `Ошибка сервера ${res.status}`;
      return NextResponse.json({ error: msg, message: msg, status: res.status, raw: json }, { status: res.status });
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Network error', message: String(e) }, { status: 502 });
  }
}
