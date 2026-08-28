'use client';

import { useEffect, useRef, useState } from 'react';
import { formatBytes, formatDuration } from './format';
import type { MessengerMessage } from './types';
import { STICKER_MIME } from './types';

export const isSticker = (m: MessengerMessage) => m.attachmentMime === STICKER_MIME;
export const isGif = (m: MessengerMessage) =>
  m.type === 'image' && !isSticker(m) && (m.attachmentMime === 'image/gif' || !!m.previewUrl);

// ─── Voice ────────────────────────────────────────────────────────────────────

/**
 * Voice bubble. duration_seconds comes from the message row (migration 0034),
 * so the length is on screen before the audio file is fetched — otherwise every
 * voice note would read 0:00 until it downloaded.
 */
export function VoicePlayer({
  url,
  duration,
  own,
}: {
  url: string;
  duration: number | null;
  own: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);

  const total = duration ?? 0;
  const progress = total > 0 ? Math.min(100, (at / total) * 100) : 0;
  const ink = own ? '#fff' : 'var(--accent-dark, #9c5e6c)';
  const track = own ? 'rgba(255,255,255,.32)' : '#e8e4dc';

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setAt(a.currentTime);
    const onEnd = () => { setPlaying(false); setAt(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  }

  return (
    <div className="flex items-center gap-2 min-w-[168px]">
      <audio ref={audioRef} src={url} preload="none" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
        style={{ background: own ? 'rgba(255,255,255,.2)' : 'var(--accent-light, #f0d4dc)' }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1.2" fill={ink} />
            <rect x="14" y="5" width="4" height="14" rx="1.2" fill={ink} />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5.5v13l11-6.5-11-6.5Z" fill={ink} />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
          <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${progress}%`, background: ink }} />
        </div>
        <p className="text-[10px] mt-1" style={{ opacity: own ? 0.8 : 0.55 }}>
          {playing || at > 0 ? formatDuration(at) + ' / ' : ''}{formatDuration(total)}
        </p>
      </div>
    </div>
  );
}

// ─── File ─────────────────────────────────────────────────────────────────────

export function FileCard({
  url,
  name,
  size,
  own,
}: {
  url: string;
  name: string | null;
  size: number | null;
  own: boolean;
}) {
  const ink = own ? '#fff' : '#2a2540';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name ?? undefined}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 min-w-[180px] max-w-[240px]"
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: own ? 'rgba(255,255,255,.2)' : 'var(--accent-light, #f0d4dc)' }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M14 3v5h5" stroke={own ? '#fff' : '#9c5e6c'} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke={own ? '#fff' : '#9c5e6c'} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold truncate" style={{ color: ink }}>
          {name ?? 'Файл'}
        </span>
        <span className="block text-[10px]" style={{ color: ink, opacity: own ? 0.75 : 0.5 }}>
          {formatBytes(size) || 'Скачать'}
        </span>
      </span>
    </a>
  );
}

// ─── Image / GIF ──────────────────────────────────────────────────────────────

export function ImageAttachment({
  url,
  gif,
  onOpen,
}: {
  url: string;
  gif: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="relative block rounded-xl overflow-hidden max-w-full"
      style={{ lineHeight: 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-w-full rounded-xl" style={{ maxHeight: 280, objectFit: 'cover' }} />
      {gif && (
        <span
          className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
          style={{ background: 'rgba(0,0,0,.55)' }}
        >
          GIF
        </span>
      )}
    </button>
  );
}

// ─── Sticker ──────────────────────────────────────────────────────────────────

/** Stickers render bare — no bubble, no border — the way messengers show them. */
export function Sticker({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Стикер" width={128} height={128} style={{ width: 128, height: 128 }} />;
}

// ─── Fullscreen viewer ────────────────────────────────────────────────────────

export function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,8,16,.92)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,.15)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 px-4 py-2 rounded-full text-xs font-semibold text-white"
        style={{ background: 'rgba(255,255,255,.18)' }}
      >
        Открыть оригинал
      </a>
    </div>
  );
}
