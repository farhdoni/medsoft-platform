import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '@/lib/server-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeaders = await getProxyAuthHeaders();
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
