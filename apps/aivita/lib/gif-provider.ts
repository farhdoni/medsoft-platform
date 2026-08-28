/**
 * GIF search behind a provider interface.
 *
 * Server-only: the API key is read from TENOR_API_KEY, deliberately WITHOUT the
 * NEXT_PUBLIC_ prefix, so it never reaches the browser bundle. The client talks
 * to /api/gif instead of the provider directly.
 *
 * Swapping to Giphy means writing a second object with this shape and changing
 * the one line in `getGifProvider()` — nothing in the UI knows which one it is.
 */

export type GifItem = {
  id: string;
  /** The animated file the bubble plays. */
  url: string;
  /** Static thumbnail — a grid of animating GIFs is unreadable. */
  preview: string;
  width: number;
  height: number;
  description: string;
};

export interface GifProvider {
  readonly name: string;
  /** False when no API key is configured; the tab then shows a calm empty state. */
  isConfigured(): boolean;
  trending(limit: number): Promise<GifItem[]>;
  search(query: string, limit: number): Promise<GifItem[]>;
}

// ─── Tenor v2 ─────────────────────────────────────────────────────────────────

type TenorFormat = { url: string; dims?: [number, number] };
type TenorResult = {
  id: string;
  content_description?: string;
  media_formats?: Record<string, TenorFormat | undefined>;
};

function toItem(r: TenorResult): GifItem | null {
  const f = r.media_formats ?? {};
  const animated = f.gif ?? f.mediumgif ?? f.tinygif;
  const still = f.gifpreview ?? f.tinygifpreview ?? animated;
  if (!animated?.url || !still?.url) return null;
  const dims = animated.dims ?? [200, 200];
  return {
    id: r.id,
    url: animated.url,
    preview: still.url,
    width: dims[0],
    height: dims[1],
    description: r.content_description ?? 'GIF',
  };
}

const tenor: GifProvider = {
  name: 'tenor',

  isConfigured() {
    return !!process.env.TENOR_API_KEY;
  },

  async trending(limit) {
    return call('featured', {}, limit);
  },

  async search(query, limit) {
    return call('search', { q: query }, limit);
  },
};

async function call(
  endpoint: 'featured' | 'search',
  params: Record<string, string>,
  limit: number,
): Promise<GifItem[]> {
  const key = process.env.TENOR_API_KEY;
  if (!key) return [];

  const qs = new URLSearchParams({
    key,
    limit: String(limit),
    media_filter: 'gif,tinygif,gifpreview,tinygifpreview',
    contentfilter: 'high', // this is a medical app — keep the safest tier
    client_key: 'aivita',
    ...params,
  });

  const res = await fetch(`https://tenor.googleapis.com/v2/${endpoint}?${qs}`, {
    // Trending shifts slowly; a short cache keeps us well inside rate limits.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Tenor ${endpoint} failed: ${res.status}`);

  const json = (await res.json()) as { results?: TenorResult[] };
  return (json.results ?? []).map(toItem).filter((x): x is GifItem => x !== null);
}

export function getGifProvider(): GifProvider {
  return tenor;
}
