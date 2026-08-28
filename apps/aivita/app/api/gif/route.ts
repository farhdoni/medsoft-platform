import { NextRequest, NextResponse } from 'next/server';
import { getGifProvider } from '@/lib/gif-provider';

/**
 * GIF search proxy. The provider key stays on the server — the browser only
 * ever sees this route, so nothing sensitive reaches the bundle.
 *
 * Responds with { configured, data }. `configured: false` is not an error: the
 * GIF tab renders a calm "no key yet" state rather than a failure.
 */
export async function GET(req: NextRequest) {
  const provider = getGifProvider();

  if (!provider.isConfigured()) {
    return NextResponse.json({ configured: false, data: [] });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 24) || 24, 50);

  try {
    const data = q ? await provider.search(q, limit) : await provider.trending(limit);
    return NextResponse.json({ configured: true, data });
  } catch (e) {
    return NextResponse.json(
      { configured: true, data: [], error: 'GIF provider unavailable', message: String(e) },
      { status: 502 },
    );
  }
}
