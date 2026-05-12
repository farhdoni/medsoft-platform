/**
 * Generic authenticated proxy for aivita API.
 * Client components call /api/proxy/<path> instead of api.aivita.uz directly.
 * Auth cookies are injected server-side, avoiding CORS/cookie issues.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '@/lib/server-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = path.join('/');
  const search = req.nextUrl.searchParams.toString();
  const url = `${API_BASE}/v1/aivita/${apiPath}${search ? '?' + search : ''}`;

  const authHeaders = await getProxyAuthHeaders();

  let body: string | undefined;
  const method = req.method;
  if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
    body = await req.text();
  }

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body,
      cache: 'no-store',
    });

    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'Network error', message: String(e) }, { status: 502 });
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
