/**
 * GIF search behind a provider interface.
 *
 * Server-only: the API key is read from GIPHY_API_KEY, deliberately WITHOUT the
 * NEXT_PUBLIC_ prefix, so it never reaches the browser bundle. The client talks
 * to /api/gif instead of the provider directly.
 *
 * Tenor was the original provider; Google shut the API down on 2026-06-30 and
 * stopped issuing keys, so GIPHY took its place. Swapping again (Klipy, say)
 * means writing a second object with this shape and changing the one line in
 * `getGifProvider()` — nothing in the UI knows which one it is, including the
 * attribution line, which travels with the provider.
 */

export type GifItem = {
  id: string;
  /** The animated file the bubble plays — full-size original. */
  url: string;
  /** Static thumbnail — a grid of animating GIFs is unreadable. */
  preview: string;
  /** Animated thumbnail, played only while a tile is hovered. */
  thumb: string;
  width: number;
  height: number;
  description: string;
};

export interface GifProvider {
  readonly name: string;
  /**
   * Required credit line, rendered as a permanent footer in the GIF tab.
   * Lives here so a provider swap carries its own attribution.
   */
  readonly attribution: string;
  /** False when no API key is configured; the tab then shows a calm empty state. */
  isConfigured(): boolean;
  trending(limit: number, lang: string): Promise<GifItem[]>;
  search(query: string, limit: number, lang: string): Promise<GifItem[]>;
}

// ─── GIPHY v1 ─────────────────────────────────────────────────────────────────

type GiphyRendition = { url?: string; webp?: string; width?: string; height?: string };
type GiphyGif = {
  id?: string;
  title?: string;
  images?: Record<string, GiphyRendition | undefined>;
};

function dim(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toItem(g: GiphyGif): GifItem | null {
  const img = g.images ?? {};
  const fixed = img.fixed_width;
  const still = img.fixed_width_still;
  const original = img.original;

  // webp for the hover thumbnail (much lighter), plain gif for what gets sent —
  // it renders everywhere, including older Android WebViews.
  const thumb = fixed?.webp || fixed?.url;
  const url = original?.url;
  const preview = still?.url;
  if (!g.id || !thumb || !url || !preview) return null;

  return {
    id: g.id,
    url,
    preview,
    thumb,
    width: dim(original?.width, dim(fixed?.width, 200)),
    height: dim(original?.height, dim(fixed?.height, 200)),
    description: g.title?.trim() || 'GIF',
  };
}

/** GIPHY has no Uzbek locale; ru is the closest useful fallback for our users. */
function giphyLang(lang: string): string {
  return lang === 'uz' ? 'ru' : lang || 'ru';
}

const giphy: GifProvider = {
  name: 'giphy',
  attribution: 'Powered by GIPHY',

  isConfigured() {
    return !!process.env.GIPHY_API_KEY;
  },

  async trending(limit, lang) {
    return call('trending', {}, limit, lang);
  },

  async search(query, limit, lang) {
    return call('search', { q: query.slice(0, 100) }, limit, lang);
  },
};

async function call(
  endpoint: 'trending' | 'search',
  params: Record<string, string>,
  limit: number,
  lang: string,
): Promise<GifItem[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return [];

  const qs = new URLSearchParams({
    api_key: key,
    limit: String(limit),
    rating: 'g', // this is a medical app — keep the safest tier
    lang: giphyLang(lang),
    ...params,
  });

  // Caching lives in the route (keyed lang:limit) so every provider inherits it.
  const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GIPHY ${endpoint} failed: ${res.status}`);

  const json = (await res.json()) as { data?: GiphyGif[] };
  return (json.data ?? []).map(toItem).filter((x): x is GifItem => x !== null);
}

export function getGifProvider(): GifProvider {
  return giphy;
}
