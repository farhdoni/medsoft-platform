'use client';

import type { KeyboardEvent, RefObject } from 'react';

/** mm:ss for the live recording timer. */
function formatDuration(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export type ChatComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  canSend: boolean;
  placeholder?: string;

  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;

  onAttach: () => void;
  onEmoji: () => void;
  emojiOpen: boolean;
  onMic: () => void;

  /** Live recording state. When `recording` is false the rest is ignored. */
  recording?: boolean;
  seconds?: number;
  onCancelRecording?: () => void;

  /** Padding under the bar; the emoji panel replaces the safe-area gap. */
  bottomInset?: string | number;
};

/**
 * The one composer both /messenger and /ai-chat render.
 *
 * Layout is fixed by design review: paperclip left, then the growing textarea,
 * then emoji and microphone, then the round gradient send button. The screens
 * differ only in what the handlers do — keeping the markup here is what stops
 * the two from drifting apart again.
 *
 * While recording, the whole row is replaced by the timer plus cancel and send.
 * Those two controls are 40px so they stay comfortably tappable at 390px wide,
 * where they are not competing with the idle row's other icons for space.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  canSend,
  placeholder = 'Сообщение…',
  inputRef,
  onKeyDown,
  onFocus,
  onAttach,
  onEmoji,
  emojiOpen,
  onMic,
  recording = false,
  seconds = 0,
  onCancelRecording,
  bottomInset,
}: ChatComposerProps) {
  return (
    <div
      className="flex-shrink-0 px-3 pt-1"
      style={{ paddingBottom: bottomInset ?? 'calc(8px + env(safe-area-inset-bottom))' }}
      data-testid="chat-composer"
    >
      {recording ? (
        <div
          className="flex items-center gap-3 bg-white rounded-2xl px-3 py-2"
          style={{ border: '1px solid var(--accent, #cc8a96)' }}
          role="group"
          aria-label="Идёт запись голосового"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: '#e4572e', animation: 'pulse 1s ease-in-out infinite' }}
            aria-hidden="true"
          />
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: 'var(--accent-dark, #9c5e6c)' }}
            data-testid="recording-timer"
          >
            {formatDuration(seconds)}
          </span>
          <span className="flex-1 text-[11px] text-app-t3">Идёт запись…</span>
          <button
            type="button"
            aria-label="Отменить запись"
            onClick={onCancelRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-70"
            style={{ background: '#faf9f7', touchAction: 'manipulation' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="#6a6580" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Отправить голосовое"
            onClick={onMic}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #cc8a96, #9c5e6c)', touchAction: 'manipulation' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2v6.4Z" fill="#fff" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 bg-white rounded-2xl px-2 py-1.5" style={{ border: '1px solid #e8e4dc' }}>
          <button
            type="button"
            aria-label="Прикрепить файл"
            onClick={onAttach}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 active:opacity-70"
            style={{ touchAction: 'manipulation' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 19a2 2 0 0 1-3-3l8-8" stroke="#6a6580" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={placeholder}
            aria-label="Текст сообщения"
            className="flex-1 resize-none bg-transparent text-sm text-app-t1 placeholder:text-app-t3 outline-none py-1.5 max-h-28"
          />

          <button
            type="button"
            aria-label="Эмодзи, стикеры и GIF"
            aria-pressed={emojiOpen}
            onClick={onEmoji}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-80"
            style={{
              touchAction: 'manipulation',
              ...(emojiOpen ? { background: 'var(--accent-light, #f0d4dc)' } : {}),
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke={emojiOpen ? '#9c5e6c' : '#6a6580'} strokeWidth="1.8" />
              <circle cx="9" cy="10" r="1" fill={emojiOpen ? '#9c5e6c' : '#6a6580'} />
              <circle cx="15" cy="10" r="1" fill={emojiOpen ? '#9c5e6c' : '#6a6580'} />
              <path d="M8.5 14.5a4 4 0 0 0 7 0" stroke={emojiOpen ? '#9c5e6c' : '#6a6580'} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Записать голосовое"
            onClick={onMic}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 active:opacity-70"
            style={{ touchAction: 'manipulation' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="#6a6580" strokeWidth="1.8" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#6a6580" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Отправить"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #cc8a96, #9c5e6c)',
              opacity: canSend ? 1 : 0.4,
              cursor: canSend ? 'pointer' : 'default',
              touchAction: 'manipulation',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2v6.4Z" fill="#fff" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
