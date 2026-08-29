'use client';

import { useEffect, useState } from 'react';

/**
 * Панель вставки: эмодзи, стикеры, GIF.
 *
 * Источники те же, что у пациентского приложения, и новых здесь не заводится:
 * стикеры лежат в public/stickers этого приложения (те же файлы), GIF идёт
 * через /api/gif — прокси к тому же провайдеру с тем же ключом.
 *
 * Эмодзи вставляются в поле и панель НЕ закрывают: их набирают подряд.
 * Стикер и GIF отправляются сразу, поэтому родитель закрывает панель сам.
 */

const EMOJI =
  '😊 😂 🥰 😉 🙂 🤗 🤔 😅 😌 👍 🙏 🤝 👏 💪 ✌️ 🩷 ❤️ 💙 🔥 ⭐ 🎉 ✅ ☀️ 🌸 🩺 💊 💉 🏥 🚑 🩹 🩸 🦷 🧬 🧪 🧠 📎 📅 📌 🔔 💡'.split(' ');

type Tab = 'emoji' | 'stickers' | 'gif';
type Sticker = { file: string; url: string };
type GifItem = { id: string; url: string; previewUrl: string; title: string };

export function MediaPanel({
  onEmoji,
  onSticker,
  onGif,
}: {
  onEmoji: (e: string) => void;
  onSticker: (url: string) => void;
  onGif: (url: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('emoji');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [gifQuery, setGifQuery] = useState('');
  const [gifState, setGifState] = useState<'idle' | 'loading' | 'unconfigured' | 'error'>('idle');

  useEffect(() => {
    if (tab !== 'stickers' || stickers.length) return;
    void (async () => {
      try {
        const index = (await (await fetch('/stickers/packs.json')).json()) as { packs: string[] };
        const all: Sticker[] = [];
        for (const id of index.packs) {
          const m = (await (await fetch(`/stickers/${id}/manifest.json`)).json()) as {
            stickers: { file: string }[];
          };
          all.push(...m.stickers.map((s) => ({ file: s.file, url: `/stickers/${id}/${s.file}` })));
        }
        setStickers(all);
      } catch {
        setStickers([]);
      }
    })();
  }, [tab, stickers.length]);

  useEffect(() => {
    if (tab !== 'gif') return;
    const ctrl = new AbortController();
    setGifState('loading');
    const t = setTimeout(() => {
      void (async () => {
        try {
          const qs = new URLSearchParams({ limit: '18', lang: 'ru' });
          if (gifQuery.trim()) qs.set('q', gifQuery.trim());
          const res = await fetch(`/api/gif?${qs}`, { signal: ctrl.signal });
          const json = (await res.json()) as { configured: boolean; data: GifItem[] };
          if (!json.configured) return setGifState('unconfigured');
          setGifs(json.data);
          setGifState('idle');
        } catch {
          setGifState('error');
        }
      })();
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [tab, gifQuery]);

  return (
    <div className="absolute bottom-[52px] left-0 right-0 z-20 flex max-h-[260px] flex-col overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-[0_10px_30px_rgba(42,37,64,.12)]">
      <div className="flex gap-1 border-b border-[#f0ede6] px-2.5 py-2">
        {(
          [
            ['emoji', '😊 Эмодзи'],
            ['stickers', 'Стикеры'],
            ['gif', 'GIF'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              tab === k ? 'bg-[#9c5e6c] text-white' : 'text-[#6a6580]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'emoji' && (
        <div className="grid grid-cols-8 gap-1 overflow-y-auto p-2.5">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onEmoji(e)}
              className="rounded-lg py-1 text-xl hover:bg-[#faf9f5]"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {tab === 'stickers' && (
        <div className="grid grid-cols-4 gap-2 overflow-y-auto p-2.5">
          {stickers.length === 0 && <p className="col-span-4 py-6 text-center text-xs text-[#9a96a8]">Стикеры не найдены.</p>}
          {stickers.map((s) => (
            <button
              key={s.url}
              type="button"
              onClick={() => onSticker(s.url)}
              className="grid aspect-square place-items-center rounded-2xl border border-[#f0ede6] hover:scale-105"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" className="h-4/5 w-4/5 object-contain" />
            </button>
          ))}
        </div>
      )}

      {tab === 'gif' && (
        <div className="flex min-h-0 flex-col">
          <input
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Поиск GIF…"
            aria-label="Поиск GIF"
            className="mx-2.5 mt-2 rounded-lg border border-[#e8e4dc] bg-[#faf9f5] px-2.5 py-1.5 text-xs outline-none"
          />
          {gifState === 'unconfigured' ? (
            <p className="p-6 text-center text-xs text-[#9a96a8]">Ключ GIPHY не настроен — вкладка появится, когда его добавят.</p>
          ) : gifState === 'error' ? (
            <p className="p-6 text-center text-xs text-[#9a96a8]">Провайдер GIF недоступен.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-2.5">
              {gifs.map((g) => (
                <button key={g.id} type="button" onClick={() => onGif(g.url)} className="overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.previewUrl} alt={g.title} className="aspect-[4/3] w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="border-t border-[#f0ede6] p-1 text-center text-[10px] text-[#9a96a8]">Powered by GIPHY</p>
        </div>
      )}
    </div>
  );
}
