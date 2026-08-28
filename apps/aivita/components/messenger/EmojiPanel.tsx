'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMOJI_CATEGORIES,
  RECENT_KEY,
  RECENT_LIMIT,
  searchEmoji,
} from './emoji-data';
import type { GifItem, StickerRef } from './types';

type Tab = 'emoji' | 'stickers' | 'gif';

export const EMOJI_PANEL_HEIGHT = 300;

type PackManifest = {
  id: string;
  name: string;
  stickers: { file: string; tags: string[] }[];
};

/**
 * Composer insert panel: emoji, stickers, GIF. Sits where the FloatingNav
 * would be, which is why the thread hides that nav — see ChatPageShell.
 *
 * Picking an emoji does NOT close the panel: people type several in a row.
 * Picking a sticker or a GIF sends immediately, so the parent closes it.
 */
export function EmojiPanel({
  onPick,
  onBackspace,
  onPickSticker,
  onPickGif,
  locale,
}: {
  onPick: (emoji: string) => void;
  onBackspace: () => void;
  onPickSticker: (sticker: StickerRef) => void;
  onPickGif: (gif: GifItem) => void;
  /** Drives the GIF search language; the provider maps it to what it supports. */
  locale: string;
}) {
  const [tab, setTab] = useState<Tab>('emoji');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const anchors = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch { /* private mode — the panel just starts without a recent row */ }
  }, []);

  const pick = useCallback(
    (emoji: string) => {
      onPick(emoji);
      setRecent((prev) => {
        const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, RECENT_LIMIT);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    [onPick],
  );

  function scrollTo(id: string) {
    const el = anchors.current[id];
    const box = scrollRef.current;
    if (el && box) box.scrollTo({ top: el.offsetTop - box.offsetTop, behavior: 'smooth' });
  }

  const results = query.trim() ? searchEmoji(query) : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'emoji', label: '😊 Эмодзи' },
    { id: 'stickers', label: '🖼️ Стикеры' },
    { id: 'gif', label: 'GIF' },
  ];

  return (
    <div
      className="flex-shrink-0 flex flex-col bg-white"
      style={{ height: EMOJI_PANEL_HEIGHT, borderTop: '1px solid #e8e4dc' }}
    >
      <div className="flex-shrink-0 flex gap-1 px-2 pt-2" role="tablist" aria-label="Вставка">
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              style={
                active
                  ? { background: 'var(--accent-light, #f0d4dc)', color: 'var(--accent-dark, #9c5e6c)' }
                  : { background: 'transparent', color: '#9a96a8' }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'stickers' && <StickersTab onPickSticker={onPickSticker} />}
      {tab === 'gif' && <GifTab onPickGif={onPickGif} locale={locale} />}

      {tab === 'emoji' && (
        <>
          <div className="flex-shrink-0 px-2 pt-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск эмодзи…"
              aria-label="Поиск эмодзи"
              className="w-full rounded-xl text-xs text-app-t1 placeholder:text-app-t3 outline-none px-3 py-2"
              style={{ background: '#faf9f7', border: '1px solid #e8e4dc' }}
            />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
            {results ? (
              results.length === 0 ? (
                <p className="text-center text-xs text-app-t3 py-6">Ничего не нашли</p>
              ) : (
                <div className="grid grid-cols-8 gap-0.5">
                  {results.map((e, i) => (
                    <EmojiButton key={e + i} emoji={e} onPick={pick} />
                  ))}
                </div>
              )
            ) : (
              <>
                {recent.length > 0 && (
                  <div ref={(el) => { anchors.current['recent'] = el; }}>
                    <p className="text-[11px] font-semibold text-app-t3 px-1 pb-1 pt-1">Часто используемые</p>
                    <div className="grid grid-cols-8 gap-0.5 mb-2">
                      {recent.map((e, i) => (
                        <EmojiButton key={e + i} emoji={e} onPick={pick} />
                      ))}
                    </div>
                  </div>
                )}
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.id} ref={(el) => { anchors.current[cat.id] = el; }}>
                    <p className="text-[11px] font-semibold text-app-t3 px-1 pb-1 pt-1">{cat.title}</p>
                    <div className="grid grid-cols-8 gap-0.5 mb-2">
                      {cat.emoji.map((e, i) => (
                        <EmojiButton key={e + i} emoji={e} onPick={pick} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div
            className="flex-shrink-0 flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto"
            style={{ borderTop: '1px solid #f0eeea' }}
          >
            {recent.length > 0 && (
              <button
                type="button"
                aria-label="Часто используемые"
                onClick={() => scrollTo('recent')}
                className="flex-shrink-0 w-7 h-7 rounded-lg text-base leading-none active:opacity-60"
              >
                🕘
              </button>
            )}
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-label={cat.title}
                title={cat.title}
                onClick={() => scrollTo(cat.id)}
                className="flex-shrink-0 w-7 h-7 rounded-lg text-base leading-none active:opacity-60"
              >
                {cat.icon}
              </button>
            ))}
            <span className="flex-1" />
            <button
              type="button"
              aria-label="Удалить символ"
              onClick={onBackspace}
              className="flex-shrink-0 w-8 h-7 rounded-lg flex items-center justify-center active:opacity-60"
              style={{ background: '#faf9f7' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9L3 12l6-7Z" stroke="#6a6580" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="m12 9 5 6M17 9l-5 6" stroke="#6a6580" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stickers ─────────────────────────────────────────────────────────────────

/**
 * Packs are data, not code: public/stickers/packs.json lists pack ids and each
 * pack carries its own manifest. Dropping in an illustrator's pack means adding
 * a folder and one line in packs.json.
 */
function StickersTab({ onPickSticker }: { onPickSticker: (s: StickerRef) => void }) {
  const [packs, setPacks] = useState<PackManifest[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const index = (await (await fetch('/stickers/packs.json')).json()) as { packs: string[] };
        const loaded = await Promise.all(
          (index.packs ?? []).map(async (id) => {
            const m = (await (await fetch(`/stickers/${id}/manifest.json`)).json()) as PackManifest;
            return { ...m, id };
          }),
        );
        if (alive) setPacks(loaded);
      } catch {
        if (alive) setPacks([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (packs === null) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-xs text-app-t3">Загружаем…</p></div>;
  }
  if (packs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-app-t3">Стикеры не найдены</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
      {packs.map((pack) => (
        <div key={pack.id}>
          <p className="text-[11px] font-semibold text-app-t3 px-1 pb-1">{pack.name}</p>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {pack.stickers.map((s) => {
              const url = `/stickers/${pack.id}/${s.file}`;
              return (
                <button
                  key={s.file}
                  type="button"
                  aria-label={s.tags[0] ?? 'Стикер'}
                  title={s.tags.join(', ')}
                  onClick={() => onPickSticker({ url, name: s.tags[0] ?? pack.id, pack: pack.id })}
                  className="aspect-square rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-contain" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── GIF ──────────────────────────────────────────────────────────────────────

function GifTab({ onPickGif, locale }: { onPickGif: (g: GifItem) => void; locale: string }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GifItem[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  // Seeded, then replaced by whatever the server-side provider reports, so a
  // provider swap changes the credit line without touching this file.
  const [attribution, setAttribution] = useState('Powered by GIPHY');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hovered, setHovered] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // Debounced so typing does not fire a request per keystroke, and aborted on
  // change so a slow earlier reply cannot land on top of a newer one.
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ lang: locale });
        const q = query.trim();
        if (q) qs.set('q', q);
        const res = await fetch(`/api/gif?${qs}`, { signal: ctrl.signal });
        const json = (await res.json()) as {
          configured: boolean;
          attribution?: string;
          data?: GifItem[];
        };
        if (json.attribution) setAttribution(json.attribution);
        setConfigured(json.configured);
        if (!res.ok) { setItems([]); setStatus('error'); return; }
        setItems(json.data ?? []);
        setStatus('ready');
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setConfigured(true);
        setItems([]);
        setStatus('error');
      }
    }, 300);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [query, locale, retry]);

  return (
    <>
      {configured === false ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-2xl mb-1" aria-hidden="true">🎞️</div>
            <p className="text-xs font-semibold text-app-t1">GIF появятся после подключения ключа</p>
            <p className="text-[11px] text-app-t3 mt-1">Провайдер пока не настроен</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 px-2 pt-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск GIF…"
              aria-label="Поиск GIF"
              className="w-full rounded-xl text-xs text-app-t1 placeholder:text-app-t3 outline-none px-3 py-2"
              style={{ background: '#faf9f7', border: '1px solid #e8e4dc' }}
            />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
            {status === 'loading' ? (
              <p className="text-center text-xs text-app-t3 py-6">Загружаем…</p>
            ) : status === 'error' ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <p className="text-xs text-app-t3">Не удалось загрузить</p>
                <button
                  type="button"
                  onClick={() => setRetry((n) => n + 1)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5"
                  style={{ background: '#faf9f7', color: 'var(--accent-dark, #9c5e6c)' }}
                >
                  Повторить
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-xs text-app-t3 py-6">Ничего не нашли</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {items.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-label={g.description}
                    onClick={() => onPickGif(g)}
                    onMouseEnter={() => setHovered(g.id)}
                    onMouseLeave={() => setHovered((h) => (h === g.id ? null : h))}
                    className="aspect-square rounded-lg overflow-hidden active:scale-95 transition-transform"
                    style={{ background: '#faf9f7' }}
                  >
                    {/* Still frames by default — a grid of animating GIFs is unreadable.
                        Only the hovered tile plays. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hovered === g.id ? g.thumb : g.preview}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Provider credit — required by the provider's terms, so it stays put
          in every state, including "no key yet". */}
      <div
        className="flex-shrink-0 px-2 py-1.5 text-center"
        style={{ borderTop: '1px solid #f0eeea' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-app-t3">
          {attribution}
        </span>
      </div>
    </>
  );
}

function EmojiButton({ emoji, onPick }: { emoji: string; onPick: (e: string) => void }) {
  return (
    <button
      type="button"
      // onMouseDown, not onClick: the composer textarea must keep focus so the
      // caret position used for insertion stays valid.
      onMouseDown={(e) => { e.preventDefault(); onPick(emoji); }}
      className="h-9 rounded-lg text-[22px] leading-none flex items-center justify-center active:scale-90 transition-transform"
    >
      {emoji}
    </button>
  );
}
