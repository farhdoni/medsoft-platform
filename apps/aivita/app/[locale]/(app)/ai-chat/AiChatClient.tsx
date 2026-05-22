'use client';

import {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Paperclip, Camera, Image, Mic, MicOff, X, Play, Pause } from 'lucide-react';
import { AiDocumentModal, type ParsedMedical } from '@/components/medical/AiDocumentModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachKind = 'photo' | 'file' | 'audio';

interface AttachPhoto { kind: 'photo'; file: File; dataUrl: string; id: string }
interface AttachFile  { kind: 'file';  file: File; id: string }
interface AttachAudio { kind: 'audio'; blob: Blob; url: string; duration: number; id: string }
type Attachment = AttachPhoto | AttachFile | AttachAudio;

interface MsgAttachment {
  kind: AttachKind;
  dataUrl?: string;
  name?: string;
  size?: number;
  url?: string;
  duration?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments?: MsgAttachment[];
  ts: Date;
  medicalData?: ParsedMedical;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

function fmtTime(d: Date) {
  return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function fmtDur(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── AudioPlayer (mini) ───────────────────────────────────────────────────────

function AudioPlayer({ url, duration }: { url: string; duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = new Audio(url);
    audioRef.current = el;
    el.onended = () => setPlaying(false);
    return () => { el.pause(); };
  }, [url]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else         { void el.play(); setPlaying(true); }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.07)', minWidth: 140 }}>
      <button onClick={toggle} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/80 flex-shrink-0">
        {playing
          ? <Pause className="w-3.5 h-3.5" style={{ color: '#2a2540' }} aria-hidden="true" />
          : <Play  className="w-3.5 h-3.5 ml-0.5" style={{ color: '#2a2540' }} aria-hidden="true" />}
      </button>
      <div className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-white/70" />
      </div>
      {duration != null && (
        <span className="text-[10px] font-mono opacity-70">{fmtDur(duration)}</span>
      )}
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[85%]">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm" style={{ background: '#e8e4f8' }}>
        🤖
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-2 h-2 rounded-full"
            style={{
              background: '#9a96a8',
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { icon: '🧬', label: 'AI-чекап',    text: '__checkup__' },
  { icon: '💊', label: 'Лекарства',   text: 'Расскажи о моих лекарствах' },
  { icon: '📋', label: 'Мои данные',  text: 'Покажи сводку моих медданных' },
];

function WelcomeScreen({ onChip, locale }: { onChip: (text: string) => void; locale: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <div
        className="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl mb-4"
        style={{ background: 'linear-gradient(135deg, var(--accent-light), var(--accent-bg))' }}
      >
        🤖
      </div>
      <h2 className="text-[18px] font-extrabold mb-1" style={{ color: '#2a2540' }}>AI Ассистент AIVITA</h2>
      <p className="text-[13px] leading-relaxed mb-6 max-w-[260px]" style={{ color: '#9a96a8' }}>
        Задайте вопрос о здоровье, отправьте фото или голосовое
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_CHIPS.map(c => (
          <button
            key={c.label}
            onClick={() => c.text === '__checkup__' ? router.push(`/${locale}/ai-checkup`) : onChip(c.text)}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-white active:scale-95"
            style={{ borderColor: '#e8e4dc', color: '#2a2540', background: 'rgba(255,255,255,0.7)' }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiChatClient({ locale }: { locale: string }) {
  const router = useRouter();

  // ── Messages ───────────────────────────────────────────────────────────────
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [typing,    setTyping]    = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Input ──────────────────────────────────────────────────────────────────
  const [text,        setText]        = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  // ── File inputs ────────────────────────────────────────────────────────────
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Voice recording ────────────────────────────────────────────────────────
  const [isRecording,       setIsRecording]       = useState(false);
  const [recordingSeconds,  setRecordingSeconds]  = useState(0);
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const audioChunksRef     = useRef<Blob[]>([]);
  const mediaStreamRef     = useRef<MediaStream | null>(null);
  const recordingTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef(0);
  const cancelledRef        = useRef(false);

  // ── Audio playback ──────────────────────────────────────────────────────────
  const [playingId, setPlayingId] = useState<string | null>(null);

  // ── Medical document modal ──────────────────────────────────────────────────
  const [medModal, setMedModal] = useState<ParsedMedical | null>(null);

  // ── AI conversation history (sent to /api/ai/chat) ──────────────────────────
  const [apiHistory, setApiHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load chat history from DB on mount
  useEffect(() => {
    fetch('/api/proxy/ai-chat/history?limit=50')
      .then(r => r.ok ? r.json() as Promise<{ data: Array<{ id: string; role: string; content: string; created_at: string }> }> : null)
      .then(json => {
        if (!json?.data?.length) return;
        const loaded: Message[] = json.data.map(row => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          text: row.content,
          ts: new Date(row.created_at),
        }));
        setMessages(loaded);
        setApiHistory(json.data.map(row => ({ role: row.role as 'user' | 'assistant', content: row.content })));
      })
      .catch(() => { /* ignore — history is non-critical */ })
      .finally(() => setHistoryLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Auto-resize textarea
  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  function addPhotoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments(prev => [...prev, { kind: 'photo', file, dataUrl: reader.result as string, id: uid() }]);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
        addPhotoFile(f);
      } else {
        setAttachments(prev => [...prev, { kind: 'file', file: f, id: uid() }]);
      }
    });
    e.target.value = '';
  }

  function removeAttachment(id: string) {
    setAttachments(prev => {
      const a = prev.find(x => x.id === id);
      if (a?.kind === 'audio') URL.revokeObjectURL((a as AttachAudio).url);
      return prev.filter(x => x.id !== id);
    });
  }

  // ── Voice recording ────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelledRef.current = false;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (!cancelledRef.current) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAttachments(prev => [...prev, {
            kind: 'audio', blob, url,
            duration: recordingSecondsRef.current,
            id: uid(),
          }]);
        }
        audioChunksRef.current = [];
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch {
      // microphone denied — ignore silently
    }
  }

  function stopRecording(cancel: boolean) {
    cancelledRef.current = cancel;
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
  }

  function handleVoiceButton() {
    if (isRecording) stopRecording(false);
    else void startRecording();
  }

  // ── Medical document parsing ────────────────────────────────────────────────

  async function tryParseDocument(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/proxy/medical/parse-document', { method: 'POST', body: fd });
      const j = await res.json() as { data: ParsedMedical };
      const parsed = j.data;
      const total =
        (parsed.allergies?.length ?? 0) +
        (parsed.chronicDiseases?.length ?? 0) +
        (parsed.medications?.length ?? 0) +
        (parsed.labResults?.length ?? 0) +
        (parsed.diagnoses?.length ?? 0) +
        (parsed.vaccinations?.length ?? 0) +
        (parsed.surgeries?.length ?? 0);
      if (total > 0) {
        const parts = [
          parsed.allergies?.length ? `${parsed.allergies.length} аллергий` : '',
          parsed.chronicDiseases?.length ? `${parsed.chronicDiseases.length} заболеваний` : '',
          parsed.medications?.length ? `${parsed.medications.length} препаратов` : '',
          parsed.labResults?.length ? `${parsed.labResults.length} лаб. результатов` : '',
          parsed.diagnoses?.length ? `${parsed.diagnoses.length} диагнозов` : '',
        ].filter(Boolean);
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant' as const,
          text: `📋 Я нашёл в документе: ${parts.join(', ')}. Добавить в вашу медкарту?`,
          ts: new Date(),
          medicalData: parsed,
        }]);
      }
    } catch {
      // ignore — non-critical
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (overrideText?: string) => {
    const msgText = (overrideText ?? text).trim();
    if (!msgText && attachments.length === 0) return;

    const msgAttachments: MsgAttachment[] = attachments.map(a => {
      if (a.kind === 'photo') return { kind: 'photo' as const, dataUrl: a.dataUrl };
      if (a.kind === 'audio') return { kind: 'audio' as const, url: a.url, duration: a.duration };
      return { kind: 'file' as const, name: a.file.name, size: a.file.size };
    });

    // Capture files that may need medical parsing before clearing state
    const filesToParse = attachments
      .filter((a): a is AttachPhoto | AttachFile =>
        a.kind === 'photo' || a.kind === 'file'
      )
      .map(a => a.file)
      .filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');

    const userMsg: Message = {
      id: uid(), role: 'user', text: msgText,
      attachments: msgAttachments.length ? msgAttachments : undefined,
      ts: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    // ── Call real AI endpoint ──────────────────────────────────────────────
    const aiInput = msgText || (filesToParse.length > 0 ? '[пользователь прикрепил изображение или документ]' : '');

    if (aiInput) {
      const nextHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...apiHistory,
        { role: 'user', content: aiInput },
      ];
      setApiHistory(nextHistory);
      setTyping(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextHistory, locale }),
        });

        const contentType = res.headers.get('content-type') ?? '';

        if (contentType.includes('text/event-stream')) {
          // ── Streaming mode (real Anthropic API key) ────────────────────
          const streamId = uid();
          setTyping(false);
          setMessages(prev => [...prev, { id: streamId, role: 'assistant', text: '', ts: new Date() }]);

          let aiText = '';
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value).split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6);
              if (payload === '[DONE]') break outer;
              try {
                const { text: t } = JSON.parse(payload) as { text: string };
                aiText += t;
                setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: aiText } : m));
              } catch { /* skip malformed SSE frame */ }
            }
          }
          setApiHistory(prev => [...prev, { role: 'assistant', content: aiText }]);
          // Persist both messages to DB (non-blocking)
          void fetch('/api/proxy/ai-chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [
              { role: 'user', content: aiInput },
              { role: 'assistant', content: aiText },
            ]}),
          }).catch(() => { /* ignore save errors */ });

        } else {
          // ── JSON mode (mock — no API key) ──────────────────────────────
          setTyping(false);
          const json = await res.json() as { content?: string; error?: string };
          const aiText = json.error === 'plan_limit'
            ? '⚠️ Вы достигли дневного лимита сообщений. Оформите подписку для безлимитного общения.'
            : (json.content ?? 'Попробуйте ещё раз позже.');
          setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: aiText, ts: new Date() }]);
          setApiHistory(prev => [...prev, { role: 'assistant', content: aiText }]);
          // Persist both messages to DB (non-blocking, skip plan_limit errors)
          if (json.error !== 'plan_limit') {
            void fetch('/api/proxy/ai-chat/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [
                { role: 'user', content: aiInput },
                { role: 'assistant', content: aiText },
              ]}),
            }).catch(() => { /* ignore save errors */ });
          }
        }
      } catch {
        setTyping(false);
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant',
          text: 'Не удалось соединиться с AI. Проверьте подключение.',
          ts: new Date(),
        }]);
      }
    }

    // Attempt medical parsing for image/PDF attachments (non-blocking)
    for (const file of filesToParse) {
      void tryParseDocument(file);
    }
  }, [text, attachments, apiHistory, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const canSend = text.trim().length > 0 || attachments.length > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-[rgb(var(--bg-base-1))]"
      style={{ height: '100dvh', maxWidth: 480, margin: '0 auto' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: '#fff', borderColor: '#e8e4dc' }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#f4f3ef' }}
          aria-label="Назад"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: '#2a2540' }} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, var(--accent-light), var(--accent-bg))' }}>
            🤖
          </div>
          <div>
            <p className="text-[14px] font-bold leading-tight" style={{ color: '#2a2540' }}>AI Ассистент</p>
            <p className="text-[10px]" style={{ color: '#9a96a8' }}>AIVITA</p>
          </div>
        </div>
      </header>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && !typing && historyLoaded
          ? <WelcomeScreen onChip={t => void sendMessage(t)} locale={locale} />
          : (
            <>
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm mb-1" style={{ background: '#e8e4f8' }}>
                      🤖
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Attachments */}
                    {m.attachments?.map((a, i) => (
                      <div key={i}>
                        {a.kind === 'photo' && a.dataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.dataUrl} alt="" className="rounded-xl max-w-[240px] max-h-[200px] object-cover" />
                        )}
                        {a.kind === 'audio' && a.url && (
                          <AudioPlayer url={a.url} duration={a.duration} />
                        )}
                        {a.kind === 'file' && a.name && (
                          <div
                            className="flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{ background: m.role === 'user' ? 'rgba(255,255,255,0.2)' : '#f4f3ef' }}
                          >
                            <span className="text-xl">📄</span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold truncate max-w-[160px]" style={{ color: m.role === 'user' ? '#fff' : '#2a2540' }}>{a.name}</p>
                              {a.size != null && <p className="text-[10px] opacity-70">{fmtSize(a.size)}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Text bubble */}
                    {m.text && (
                      <div
                        className={`px-4 py-2.5 ${m.role === 'user' ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
                        style={m.role === 'user'
                          ? { background: 'var(--accent, #9c5e6c)', color: '#fff' }
                          : { background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }
                        }
                      >
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        {m.medicalData && (
                          <button
                            onClick={() => setMedModal(m.medicalData!)}
                            className="mt-2 w-full rounded-xl py-2 text-[13px] font-semibold transition hover:opacity-90 active:scale-95"
                            style={{ background: '#e0d8f0', color: '#6a3a8a' }}
                          >
                            Добавить в профиль
                          </button>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] px-1" style={{ color: '#9a96a8' }}>{fmtTime(m.ts)}</p>
                  </div>
                </div>
              ))}

              {typing && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )
        }
      </div>

      {/* ── Attachments preview ─────────────────────────────────────────────── */}
      {attachments.length > 0 && (
        <div
          className="flex-shrink-0 overflow-x-auto px-3 py-2 flex gap-2"
          style={{ borderTop: '1px solid #e8e4dc', background: '#fff' }}
        >
          {attachments.map(a => (
            <div key={a.id} className="relative flex-shrink-0">
              {a.kind === 'photo' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.dataUrl}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover"
                  style={{ border: '2px solid #e8e4dc' }}
                />
              )}
              {a.kind === 'file' && (
                <div
                  className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 p-1"
                  style={{ background: '#e0d8f0', border: '2px solid #c8c0e0' }}
                >
                  <span className="text-2xl leading-none">📄</span>
                  <span className="text-[8px] font-semibold truncate w-full text-center px-0.5" style={{ color: '#6a5090' }}>
                    {a.file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              {a.kind === 'audio' && (
                <div
                  className="w-auto h-16 px-3 rounded-xl flex items-center gap-2"
                  style={{ background: '#f0ece8', border: '2px solid #e0dcd8' }}
                >
                  <span className="text-xl">🎤</span>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: '#2a2540' }}>{fmtDur(a.duration)}</span>
                </div>
              )}
              {/* Remove button */}
              <button
                onClick={() => removeAttachment(a.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: '#9c5e6c' }}
                aria-label="Удалить"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input panel ─────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-3 pt-2 pb-3"
        style={{
          background: '#fff',
          borderTop: attachments.length === 0 ? '1px solid #e8e4dc' : 'none',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Voice recording bar */}
        {isRecording && (
          <div
            className="flex items-center justify-between px-4 py-2 rounded-2xl mb-2"
            style={{ background: '#fff0f3', border: '1px solid #f0d4dc' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: '#c0392b', animation: 'aura-pulse 1s ease-in-out infinite' }}
              />
              <span className="text-[13px] font-semibold" style={{ color: '#c0392b' }}>
                🔴 Запись… {fmtDur(recordingSeconds)}
              </span>
            </div>
            <button
              onClick={() => stopRecording(true)}
              className="text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ background: '#fde8e8', color: '#8a3a3a' }}
            >
              Отмена
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Media buttons */}
          <div className="flex gap-1.5 flex-shrink-0 pb-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80"
              style={{ background: '#f4f3ef' }}
              aria-label="Прикрепить файл"
            >
              <Paperclip className="w-4 h-4" style={{ color: '#6a6580' }} aria-hidden="true" />
            </button>
            {/* Camera — using <label> instead of programmatic .click() for iOS Safari reliability */}
            <label
              htmlFor="ai-chat-camera-input"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80 cursor-pointer select-none"
              style={{ background: '#f4f3ef' }}
              aria-label="Сделать фото"
            >
              <Camera className="w-4 h-4" style={{ color: '#6a6580' }} aria-hidden="true" />
            </label>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80"
              style={{ background: '#f4f3ef' }}
              aria-label="Выбрать из галереи"
            >
              <Image className="w-4 h-4" style={{ color: '#6a6580' }} aria-hidden="true" />
            </button>
            <button
              onClick={handleVoiceButton}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80"
              style={{
                background: isRecording ? '#c0392b' : '#f4f3ef',
                animation: isRecording ? 'aura-pulse 1s ease-in-out infinite' : 'none',
              }}
              aria-label={isRecording ? 'Остановить запись' : 'Голосовое сообщение'}
            >
              {isRecording
                ? <MicOff className="w-4 h-4 text-white" aria-hidden="true" />
                : <Mic    className="w-4 h-4" style={{ color: '#6a6580' }} aria-hidden="true" />}
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="Напишите вопрос о здоровье…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors"
            style={{
              minHeight: 40,
              maxHeight: 120,
              borderColor: '#e8e4dc',
              color: '#2a2540',
              lineHeight: '1.4',
            }}
          />

          {/* Send button */}
          <button
            onClick={() => void sendMessage()}
            disabled={!canSend}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-90 disabled:opacity-40"
            style={{ background: 'var(--accent, #9c5e6c)', flexShrink: 0 }}
            aria-label="Отправить"
          >
            <Send className="w-4 h-4 text-white" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Hidden file inputs ──────────────────────────────────────────────── */}
      <input ref={fileInputRef}    type="file" accept="*/*"              multiple className="hidden" onChange={handleFileInput} />
      <input id="ai-chat-camera-input" ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
      <input ref={galleryInputRef} type="file" accept="image/*,video/*"  multiple className="hidden" onChange={handleFileInput} />

      {/* ── Bounce animation for typing indicator ──────────────────────────── */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
      `}</style>

      {/* ── Medical document modal ──────────────────────────────────────────── */}
      {medModal && (
        <AiDocumentModal
          data={medModal}
          onClose={() => setMedModal(null)}
        />
      )}
    </div>
  );
}
