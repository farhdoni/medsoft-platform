import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const store = await cookies();
  const apiCookie = store.get('aivita_api')?.value;
  const sessionCookie = store.get('aivita_session')?.value;
  const headers: Record<string, string> = {};
  if (apiCookie) {
    headers['Cookie'] = `aivita_api=${apiCookie}`;
  } else if (sessionCookie) {
    headers['X-Aivita-Session'] = sessionCookie;
  }
  return headers;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeaders = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/vitals/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : { ok: true };
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}
