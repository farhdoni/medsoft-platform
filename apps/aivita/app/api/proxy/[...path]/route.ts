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

  const method = req.method;
  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  // For multipart, pass FormData directly (don't set Content-Type — browser sets boundary)
  // For other non-GET methods, pass text body
  let fetchBody: FormData | string | undefined;
  const fetchHeaders: Record<string, string> = { ...authHeaders };
  if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
    if (isMultipart) {
      fetchBody = await req.formData();
      // Remove Content-Type so fetch can set it with the correct boundary
      delete fetchHeaders['Content-Type'];
    } else {
      fetchBody = await req.text();
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: fetchBody,
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
