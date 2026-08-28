import { NextRequest, NextResponse } from 'next/server';
import { getGifProvider, type GifItem } from '@/lib/gif-provider';

/**
 * GIF search proxy. The provider key stays on the server — the browser only
 * ever sees this route, so nothing sensitive reaches the bundle.
 *
 * Responds with { configured, provider, attribution, data }. `configured: false`
 * is not an error: the GIF tab renders a calm "no key yet" state rather than a
 * failure. `attribution` comes from the provider so the tab's credit line
 * follows a provider swap without a UI change.
 */

/** Trending barely moves minute to minute; 5 min keeps us well inside rate limits. */
const TRENDING_TTL_MS = 5 * 60 * 1000;

const trendingCache = new Map<string, { at: number; data: GifItem[] }>();

export async function GET(req: NextRequest) {
  const provider = getGifProvider();
  const meta = { provider: provider.name, attribution: provider.attribution };

  if (!provider.isConfigured()) {
    return NextResponse.json({ configured: false, ...meta, data: [] });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const lang = req.nextUrl.searchParams.get('lang')?.trim() || 'ru';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 24) || 24, 50);

  try {
    if (!q) {
      const cacheKey = `${lang}:${limit}`;
      const hit = trendingCache.get(cacheKey);
      if (hit && Date.now() - hit.at < TRENDING_TTL_MS) {
        return NextResponse.json({ configured: true, ...meta, data: hit.data, cached: true });
      }
      const data = await provider.trending(limit, lang);
      trendingCache.set(cacheKey, { at: Date.now(), data });
      return NextResponse.json({ configured: true, ...meta, data, cached: false });
    }

    const data = await provider.search(q, limit, lang);
    return NextResponse.json({ configured: true, ...meta, data });
  } catch (e) {
    return NextResponse.json(
      { configured: true, ...meta, data: [], error: 'GIF provider unavailable', message: String(e) },
      { status: 502 },
    );
  }
}
