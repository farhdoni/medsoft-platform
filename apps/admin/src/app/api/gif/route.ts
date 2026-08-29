import { NextRequest, NextResponse } from 'next/server';

/**
 * GIF-прокси кабинета поддержки.
 *
 * Тот же провайдер и тот же ключ, что у пациентского приложения — новый здесь
 * не заводится. Прокси нужен по той же причине, по которой он есть там: ключ
 * остаётся на сервере, браузер видит только этот маршрут.
 *
 * Импортировать реализацию из apps/aivita нельзя — это отдельное приложение,
 * и связывать их импортами ради сорока строк хуже, чем повторить запрос к
 * тому же API.
 *
 * `configured: false` — не ошибка: без ключа вкладка GIF рисует спокойное
 * «ключ не настроен», а не падение.
 */

const TRENDING_TTL_MS = 5 * 60 * 1000;

type GifItem = { id: string; url: string; previewUrl: string; width: number; height: number; title: string };

const trendingCache = new Map<string, { at: number; data: GifItem[] }>();

type GiphyGif = {
  id: string;
  title?: string;
  images: {
    fixed_width?: { url: string; width: string; height: string };
    fixed_width_small_still?: { url: string };
  };
};

function normalize(raw: GiphyGif[]): GifItem[] {
  return raw
    .filter((g) => g.images?.fixed_width?.url)
    .map((g) => ({
      id: g.id,
      url: g.images.fixed_width!.url,
      previewUrl: g.images.fixed_width_small_still?.url ?? g.images.fixed_width!.url,
      width: Number(g.images.fixed_width!.width) || 200,
      height: Number(g.images.fixed_width!.height) || 200,
      title: g.title ?? '',
    }));
}

export async function GET(req: NextRequest) {
  const key = process.env.GIPHY_API_KEY;
  const meta = { provider: 'giphy', attribution: 'Powered by GIPHY' };

  if (!key) return NextResponse.json({ configured: false, ...meta, data: [] });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const lang = req.nextUrl.searchParams.get('lang')?.trim() || 'ru';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 24) || 24, 50);

  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=${limit}&lang=${lang}&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=${limit}&rating=g`;

  try {
    if (!q) {
      const hit = trendingCache.get(`${lang}:${limit}`);
      if (hit && Date.now() - hit.at < TRENDING_TTL_MS) {
        return NextResponse.json({ configured: true, ...meta, data: hit.data, cached: true });
      }
    }

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`giphy ${res.status}`);
    const json = (await res.json()) as { data: GiphyGif[] };
    const data = normalize(json.data ?? []);

    if (!q) trendingCache.set(`${lang}:${limit}`, { at: Date.now(), data });

    return NextResponse.json({ configured: true, ...meta, data });
  } catch (e) {
    return NextResponse.json(
      { configured: true, ...meta, data: [], error: 'GIF provider unavailable', message: String(e) },
      { status: 502 },
    );
  }
}
