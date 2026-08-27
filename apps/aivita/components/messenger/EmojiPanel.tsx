'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMOJI_CATEGORIES,
  RECENT_KEY,
  RECENT_LIMIT,
  searchEmoji,
} from './emoji-data';

type Tab = 'emoji' | 'stickers' | 'gif';

export const EMOJI_PANEL_HEIGHT = 300;

/**
 * Composer emoji panel. Sits where the FloatingNav would be, which is why the
 * thread hides that nav — see ChatPageShell's hideNav.
 *
 * Picking does NOT close the panel: people type several emoji in a row.
 */
export function EmojiPanel({
  onPick,
  onBackspace,
}: {
  onPick: (emoji: string) => void;
  onBackspace: () => void;
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
      {/* Tabs */}
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

      {tab !== 'emoji' ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-1" aria-hidden="true">{tab === 'gif' ? '🎞️' : '🖼️'}</div>
            <p className="text-xs text-app-t3">Скоро</p>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
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

          {/* Grid */}
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

          {/* Category anchors + backspace */}
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
