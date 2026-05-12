import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

async function getSessionCookie() {
  const store = await cookies();
  return store.get('aivita_api')?.value ?? '';
}

// GET /api/vitals — list vitals
export async function GET(req: NextRequest) {
  const session = await getSessionCookie();
  const search = req.nextUrl.searchParams.toString();
  try {
    const res = await fetch(
      `${API_BASE}/v1/aivita/vitals${search ? '?' + search : ''}`,
      {
        headers: { Cookie: `aivita_api=${session}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

// POST /api/vitals — save vital
export async function POST(req: NextRequest) {
  const session = await getSessionCookie();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated', message: 'Сессия истекла, войдите снова' }, { status: 401 });
  }
  const body = await req.json();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals`, {
      method: 'POST',
      headers: { Cookie: `aivita_api=${session}`, 'Content-Type': 'application/json' },
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
