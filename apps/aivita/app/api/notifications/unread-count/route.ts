import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('aivita_session')?.value;

  if (!session) return Response.json({ count: 0 });

  try {
    const res = await fetch(`${API_BASE}/v1/aivita/notifications`, {
      headers: { Cookie: `aivita_session=${session}` },
      cache: 'no-store',
    });

    if (!res.ok) return Response.json({ count: 0 });

    const json = await res.json();
    const list: Array<{ readAt?: string | null }> = json?.data ?? [];
    const count = list.filter(n => !n.readAt).length;

    return Response.json({ count });
  } catch {
    return Response.json({ count: 0 });
  }
}
