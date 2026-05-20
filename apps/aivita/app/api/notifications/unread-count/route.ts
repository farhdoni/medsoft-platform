import { getProxyAuthHeaders, isProxyAuthenticated } from '@/lib/server-auth';

export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function GET() {
  const authHeaders = await getProxyAuthHeaders();
  if (!isProxyAuthenticated(authHeaders)) return Response.json({ count: 0 });

  try {
    const res = await fetch(`${API_BASE}/v1/aivita/notifications/unread-count`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ count: 0 });
    return Response.json(await res.json());
  } catch {
    return Response.json({ count: 0 });
  }
}
