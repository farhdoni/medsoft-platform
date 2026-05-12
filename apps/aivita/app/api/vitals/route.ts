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
  const body = await req.json();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals`, {
      method: 'POST',
      headers: { Cookie: `aivita_api=${session}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
