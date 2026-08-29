'use client';

import { useRef, type KeyboardEvent, type RefObject } from 'react';
import { Paperclip, Smile, Mic, Send, Square } from 'lucide-react';

/**
 * Композер оператора.
 *
 * Вид повторяет ChatComposer из пациентского приложения один в один — единая
 * пилюля, скрепка внутри слева, эмодзи и микрофон справа, круглая градиентная
 * кнопка отправки. Но это отдельный компонент: admin и aivita — разные
 * приложения, и связывать их импортом ради разметки хуже, чем повторить её.
 * Общий здесь именно ВИД, а не код.
 *
 * В режиме заметки пилюля желтеет: это единственное, что отличает сообщение,
 * которое увидит пациент, от того, которое не увидит никто, кроме операторов.
 * Цвет — не украшение, а предохранитель.
 */

export type ComposerMode = 'reply' | 'note';

export function SupportComposer({
  value,
  onChange,
  onSend,
  mode,
  onModeChange,
  onAttach,
  onMedia,
  mediaOpen,
  recording,
  recordingSeconds,
  onMic,
  onCancelRecording,
  disabled,
  templates,
  onTemplate,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  onAttach: () => void;
  onMedia: () => void;
  mediaOpen: boolean;
  recording: boolean;
  recordingSeconds: number;
  onMic: () => void;
  onCancelRecording: () => void;
  disabled?: boolean;
  templates: { id: string; title: string; body: string }[];
  onTemplate: (body: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  const isNote = mode === 'note';

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-[#e8e4dc] bg-white px-4 pb-3 pt-2.5">
      {/* Переключатель: кому уйдёт то, что набирается ниже */}
      <div className="mb-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onModeChange('reply')}
          className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
            !isNote
              ? 'border-[#2a2540] bg-[#2a2540] text-white'
              : 'border-[#e8e4dc] bg-[#faf9f5] text-[#6a6580]'
          }`}
        >
          Ответ пациенту
        </button>
        <button
          type="button"
          onClick={() => onModeChange('note')}
          className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
            isNote
              ? 'border-[#c9a227] bg-[#c9a227] text-white'
              : 'border-[#e8e4dc] bg-[#faf9f5] text-[#6a6580]'
          }`}
        >
          🗒 Внутренняя заметка
        </button>
      </div>

      {templates.length > 0 && !isNote && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTemplate(t.body)}
              className="whitespace-nowrap rounded-full border border-dashed border-[#f0d4dc] bg-[#fdf5f7] px-2.5 py-1 text-xs font-bold text-[#9c5e6c]"
            >
              {t.title}
            </button>
          ))}
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 rounded-full border border-[#cc8a96] bg-white px-3 py-2">
          <span className="h-2.5 w-2.5 flex-none animate-pulse rounded-full bg-[#e4572e]" aria-hidden="true" />
          <span className="font-mono text-sm font-bold text-[#9c5e6c]" data-testid="rec-timer">
            {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
          </span>
          <span className="flex-1 text-[11px] text-[#9a96a8]">Идёт запись…</span>
          <button
            type="button"
            aria-label="Отменить запись"
            onClick={onCancelRecording}
            className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#faf9f7] active:opacity-70"
          >
            <Square className="h-4 w-4 text-[#6a6580]" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Отправить голосовое"
            onClick={onMic}
            className="grid h-10 w-10 flex-none place-items-center rounded-full text-white transition active:scale-95"
            style={{ background: 'linear-gradient(135deg,#cc8a96,#9c5e6c)' }}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          data-testid="support-composer"
          className={`flex items-center gap-0 rounded-full border py-1 pl-1 pr-1.5 transition ${
            isNote ? 'border-[#e8d9a0] bg-[#fff7dd]' : 'border-[#e8e4dc] bg-[#faf9f5] focus-within:bg-white'
          }`}
        >
          <button
            type="button"
            aria-label="Прикрепить файл"
            onClick={onAttach}
            className="grid h-9 w-9 flex-none place-items-center rounded-full opacity-75 hover:bg-[#9c5e6c]/10 hover:opacity-100"
          >
            <Paperclip className="h-[18px] w-[18px] text-[#6a6580]" aria-hidden="true" />
          </button>

          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={disabled}
            aria-label={isNote ? 'Текст внутренней заметки' : 'Текст ответа пациенту'}
            placeholder={isNote ? 'Заметка — пациент её не увидит…' : 'Сообщение… (Enter — отправить)'}
            className="max-h-28 flex-1 resize-none bg-transparent px-1.5 py-2 text-sm text-[#2a2540] outline-none placeholder:text-[#9a96a8]"
          />

          <button
            type="button"
            aria-label="Эмодзи, стикеры и GIF"
            aria-pressed={mediaOpen}
            onClick={onMedia}
            className={`grid h-9 w-9 flex-none place-items-center rounded-full hover:bg-[#9c5e6c]/10 ${
              mediaOpen ? 'bg-[#f0d4dc]' : 'opacity-75'
            }`}
          >
            <Smile className="h-[18px] w-[18px] text-[#6a6580]" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Записать голосовое"
            onClick={onMic}
            className="grid h-9 w-9 flex-none place-items-center rounded-full opacity-75 hover:bg-[#9c5e6c]/10 hover:opacity-100"
          >
            <Mic className="h-[18px] w-[18px] text-[#6a6580]" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Отправить"
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className="grid h-10 w-10 flex-none place-items-center rounded-full text-white transition active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#b5717f,#8d5260)', boxShadow: '0 3px 10px rgba(156,94,108,.35)' }}
          >
            <Send className="h-[17px] w-[17px]" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
