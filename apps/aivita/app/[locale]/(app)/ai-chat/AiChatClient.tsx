'use client';

import {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Paperclip, Camera, Image, Mic, MicOff, X, Play, Pause, MoreHorizontal } from 'lucide-react';
import { AiDocumentModal, type ParsedMedical } from '@/components/medical/AiDocumentModal';

// ─── Types ────────────────────────────────────────────────────────────────────

// AI Action types
interface MedicationActionItem {
  name: string;
  dosage?: string;
  frequency?: string;
  times?: string[];
  durationDays?: number | null;
  foodInstruction?: string | null;
}

interface ParsedActions {
  cleanText: string;
  medicationsAction: MedicationActionItem[] | null;
}

/** Strip [MEDICATIONS_ACTION]...[/MEDICATIONS_ACTION] from text, return parsed data */
function parseActions(text: string): ParsedActions {
  // Full block: both opening and closing tags present
  const FULL_RE = /\[MEDICATIONS_ACTION\]([\s\S]*?)\[\/MEDICATIONS_ACTION\]/;
  const full = FULL_RE.exec(text);
  if (full) {
    let meds: MedicationActionItem[] | null = null;
    try {
      const j = JSON.parse(full[1].trim()) as { medications?: MedicationActionItem[] };
      if (Array.isArray(j?.medications) && j.medications.length > 0) meds = j.medications;
    } catch { /* malformed JSON — show nothing */ }
    return { cleanText: text.replace(FULL_RE, '').replace(/\n{3,}/g, '\n\n').trim(), medicationsAction: meds };
  }
  // Partial block during streaming — hide from [MEDICATIONS_ACTION onward
  const PARTIAL_RE = /\[MEDICATIONS_ACTION[\s\S]*/;
  return { cleanText: text.replace(PARTIAL_RE, '').trim(), medicationsAction: null };
}

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

/** Compress + resize an image File to max 1200px, return data URL (data:image/jpeg;base64,...) */
async function compressImageToDataUrl(file: File, maxSide = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width >= height) { height = Math.round(height * maxSide / width); width = maxSide; }
        else { width = Math.round(width * maxSide / height); height = maxSide; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback: read as-is
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

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

// ─── Native WebView detection ─────────────────────────────────────────────────

type AivitaWindow = Window & { ReactNativeWebView?: { postMessage: (s: string) => void }; __AIVITA_PLATFORM__?: string };

function isInNativeWebView(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as AivitaWindow).ReactNativeWebView;
}

function nativePostMessage(type: string, extra?: Record<string, unknown>) {
  if (!isInNativeWebView()) return false;
  (window as unknown as AivitaWindow).ReactNativeWebView!.postMessage(JSON.stringify({ type, ...extra }));
  return true;
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

  // ── Menu (⋯) ──────────────────────────────────────────────────────────────
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Swipe-to-delete ────────────────────────────────────────────────────────
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartXRef = useRef(0);

  // ── AI Actions (medications bulk-add) ──────────────────────────────────────
  const [addedActions,    setAddedActions]    = useState<Set<string>>(new Set());
  const [addingActionId,  setAddingActionId]  = useState<string | null>(null);
  const [actionErrors,    setActionErrors]    = useState<Record<string, string>>({});
  const [actionCounts,    setActionCounts]    = useState<Record<string, number>>({});

  // ── AI conversation history (sent to /api/ai/chat) ──────────────────────────
  const [apiHistory, setApiHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load chat history from DB on mount
  useEffect(() => {
    fetch('/api/proxy/ai-chat/history?limit=50')
      .then(r => r.ok ? r.json() as Promise<{ data: Array<{ id: string; role: string; content: string; createdAt?: string; created_at?: string }> }> : null)
      .then(json => {
        if (!json?.data?.length) return;
        const loaded: Message[] = json.data.map(row => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          text: row.content,
          ts: new Date(row.createdAt ?? row.created_at ?? Date.now()),
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

  // ── Native camera/gallery bridge ───────────────────────────────────────────

  const addPhotoFromDataUrl = useCallback((dataUrl: string) => {
    // Create a synthetic File object for display name; actual data is in dataUrl
    const file = new File([], 'photo.jpg', { type: 'image/jpeg' });
    setAttachments(prev => [...prev, { kind: 'photo', file, dataUrl, id: uid() }]);
  }, []);

  useEffect(() => {
    function handleCameraResult(e: Event) {
      const dataUrl = (e as CustomEvent<{ dataUrl: string }>).detail?.dataUrl;
      if (dataUrl) addPhotoFromDataUrl(dataUrl);
    }
    window.addEventListener('aivita-camera-result',  handleCameraResult);
    window.addEventListener('aivita-gallery-result', handleCameraResult);
    return () => {
      window.removeEventListener('aivita-camera-result',  handleCameraResult);
      window.removeEventListener('aivita-gallery-result', handleCameraResult);
    };
  }, [addPhotoFromDataUrl]);

  // ── Attachments ────────────────────────────────────────────────────────────

  async function addPhotoFile(file: File) {
    const dataUrl = await compressImageToDataUrl(file);
    setAttachments(prev => [...prev, { kind: 'photo', file, dataUrl, id: uid() }]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
        void addPhotoFile(f);
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

  // ── Auto-save health data from AI response ─────────────────────────────────
  // The AI embeds <!--HEALTH:{...}--> at the end of responses when it detects
  // health metrics. We parse it and PUT to the patient profile (non-blocking).
  async function tryAutoSaveHealth(aiText: string) {
    const match = /<!--HEALTH:(\{[^}]+\})-->/.exec(aiText);
    if (!match) return;
    try {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      if (Object.keys(data).length === 0) return;
      await fetch('/api/proxy/health-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch { /* non-critical */ }
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
    // Collect image dataUrls from photo attachments (for vision)
    const imageDataUrls = attachments
      .filter((a): a is AttachPhoto => a.kind === 'photo')
      .map(a => a.dataUrl);

    const aiInput = msgText || (imageDataUrls.length > 0 ? 'Что на этом изображении? Есть ли медицинская информация?' : '');

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
          body: JSON.stringify({ messages: nextHistory, locale, images: imageDataUrls }),
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
          // Auto-save health data extracted by AI (non-blocking)
          void tryAutoSaveHealth(aiText);
          // Persist both messages to DB (non-blocking, only if content non-empty)
          if (aiText && aiInput) {
            void fetch('/api/proxy/ai-chat/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [
                { role: 'user', content: aiInput },
                { role: 'assistant', content: aiText },
              ]}),
            }).catch(() => { /* ignore save errors */ });
          }

        } else {
          // ── JSON mode (mock — no API key) ──────────────────────────────
          setTyping(false);
          const json = await res.json() as { content?: string; error?: string };
          const aiText = json.error === 'plan_limit'
            ? '⚠️ Вы достигли дневного лимита сообщений. Оформите подписку для безлимитного общения.'
            : (json.content ?? 'Попробуйте ещё раз позже.');
          setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: aiText, ts: new Date() }]);
          setApiHistory(prev => [...prev, { role: 'assistant', content: aiText }]);
          void tryAutoSaveHealth(aiText);
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

  // ── Chat management actions ──────────────────────────────────────────────────

  function handleClearHistory() {
    setMenuOpen(false);
    if (messages.length === 0) return;
    setConfirmClear(true);
  }

  async function doClearHistory() {
    try { await fetch('/api/proxy/ai-chat/history', { method: 'DELETE' }); } catch { /* ignore */ }
    setMessages([]);
    setApiHistory([]);
    setConfirmClear(false);
  }

  async function handleArchive() {
    setMenuOpen(false);
    if (messages.length === 0) return;
    try { await fetch('/api/proxy/ai-chat/archive', { method: 'POST' }); } catch { /* ignore */ }
    setMessages([]);
    setApiHistory([]);
  }

  async function deleteMessage(id: string) {
    setSwipedId(null);
    try { await fetch(`/api/proxy/ai-chat/message/${id}`, { method: 'DELETE' }); } catch { /* ignore */ }
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  async function addMedicationsAction(msgId: string, meds: MedicationActionItem[]) {
    setAddingActionId(msgId);
    // Clear previous error for this message
    setActionErrors(prev => { const n = { ...prev }; delete n[msgId]; return n; });
    try {
      const r = await fetch('/api/proxy/medications/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: meds }),
      });
      if (r.ok) {
        const json = await r.json() as { data?: { added?: number } };
        const added = json.data?.added ?? meds.length;
        setActionCounts(prev => ({ ...prev, [msgId]: added }));
        setAddedActions(prev => new Set([...prev, msgId]));
      } else {
        setActionErrors(prev => ({
          ...prev,
          [msgId]: 'Не удалось добавить. Попробуйте ещё раз.',
        }));
      }
    } catch {
      setActionErrors(prev => ({
        ...prev,
        [msgId]: 'Ошибка сети. Проверьте подключение.',
      }));
    } finally {
      setAddingActionId(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-[rgb(var(--bg-base-1))]"
      style={{ height: '100%', maxWidth: 480, margin: '0 auto' }}
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

        {/* ⋯ Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80"
            style={{ background: menuOpen ? '#e8e4dc' : '#f4f3ef' }}
            aria-label="Меню"
          >
            <MoreHorizontal className="w-5 h-5" style={{ color: '#2a2540' }} aria-hidden="true" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid #e8e4dc', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', minWidth: 210 }}
              >
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] transition-colors hover:bg-[#fdf4f5]"
                  style={{ color: '#c0392b' }}
                >
                  🗑 Очистить историю
                </button>
                <button
                  onClick={() => void handleArchive()}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] transition-colors hover:bg-[#f4f3ef]"
                  style={{ color: '#2a2540', borderTop: '1px solid #f0ece8' }}
                >
                  📥 Архивировать чат
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push(`/${locale}/ai-chat/archives`); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] transition-colors hover:bg-[#f4f3ef]"
                  style={{ color: '#2a2540', borderTop: '1px solid #f0ece8' }}
                >
                  📂 Архивы
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      {/* min-height:0 is required for overflow-y:auto to work inside flex in iOS WebView */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',   // iOS smooth inertia scroll
          overscrollBehavior: 'contain',       // don't propagate scroll to parent
          touchAction: 'pan-y',               // allow vertical swipe in WebView
        }}
        onClick={() => { if (swipedId) setSwipedId(null); }}
      >
        {messages.length === 0 && !typing && historyLoaded
          ? <WelcomeScreen onChip={t => void sendMessage(t)} locale={locale} />
          : (
            <>
              {messages.map(m => {
                const isSwiped = swipedId === m.id;
                return (
                  <div
                    key={m.id}
                    className="relative rounded-xl"
                    onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX; }}
                    onTouchMove={(e) => {
                      const dx = touchStartXRef.current - e.touches[0].clientX;
                      if (dx > 60 && swipedId !== m.id) setSwipedId(m.id);
                      else if (dx < -10 && swipedId === m.id) setSwipedId(null);
                    }}
                  >
                    {/* Delete button — revealed on swipe-left */}
                    <div
                      className="absolute right-0 top-1 bottom-1 flex items-center justify-center rounded-xl"
                      style={{
                        width: 72,
                        background: '#ef4444',
                        opacity: isSwiped ? 1 : 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: isSwiped ? 'auto' : 'none',
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); void deleteMessage(m.id); }}
                        className="flex flex-col items-center gap-0.5"
                        aria-label="Удалить сообщение"
                      >
                        <span className="text-xl">🗑</span>
                        <span className="text-[10px] text-white font-semibold">Удалить</span>
                      </button>
                    </div>

                    {/* Message row — slides left when swiped */}
                    <div
                      className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                      style={{
                        transform: isSwiped ? 'translateX(-72px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }}
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
                        {m.text && (() => {
                          const { cleanText, medicationsAction } = parseActions(m.text);
                          return (
                            <>
                              {cleanText && (
                                <div
                                  className={`px-4 py-2.5 ${m.role === 'user' ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
                                  style={m.role === 'user'
                                    ? { background: 'var(--accent, #9c5e6c)', color: '#fff' }
                                    : { background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }
                                  }
                                >
                                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{cleanText}</p>
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

                              {/* Medications Action Card */}
                              {medicationsAction && medicationsAction.length > 0 && (
                                <div
                                  className="rounded-2xl overflow-hidden w-full"
                                  style={{ border: '1px solid #b8d8bc', background: '#f2faf3', minWidth: 240 }}
                                >
                                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid #c8e4cc', background: '#e4f4e8' }}>
                                    <span className="text-base">💊</span>
                                    <p className="text-[13px] font-bold" style={{ color: '#2a5a3a' }}>
                                      Найдено {medicationsAction.length} лекарств
                                    </p>
                                  </div>
                                  <div className="px-4 py-2 space-y-1.5">
                                    {medicationsAction.slice(0, 5).map((med, i) => (
                                      <div key={i} className="flex items-baseline gap-1.5">
                                        <span className="text-[11px]" style={{ color: '#6a7a6a' }}>•</span>
                                        <div>
                                          <span className="text-[13px] font-semibold" style={{ color: '#1a3a2a' }}>{med.name}</span>
                                          {(med.dosage || med.frequency) && (
                                            <span className="text-[11px] ml-1.5" style={{ color: '#7a9a7a' }}>
                                              {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {medicationsAction.length > 5 && (
                                      <p className="text-[11px]" style={{ color: '#7a9a7a' }}>и ещё {medicationsAction.length - 5}...</p>
                                    )}
                                  </div>
                                  <div className="px-3 pb-3 space-y-2">
                                    {/* Error message */}
                                    {actionErrors[m.id] && (
                                      <div
                                        className="w-full py-2 rounded-xl text-[12px] font-semibold text-center"
                                        style={{ background: '#fde8e8', color: '#c0392b' }}
                                      >
                                        ⚠️ {actionErrors[m.id]}
                                      </div>
                                    )}
                                    {addedActions.has(m.id) ? (
                                      <div
                                        className="w-full py-2.5 rounded-xl text-[13px] font-bold text-center"
                                        style={{ background: '#c8e4cc', color: '#2a5a3a' }}
                                      >
                                        ✅ Добавлено {actionCounts[m.id] ?? medicationsAction.length} лекарств
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => void addMedicationsAction(m.id, medicationsAction)}
                                        disabled={addingActionId === m.id}
                                        className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition active:scale-95 disabled:opacity-60"
                                        style={{ background: '#3a7a4a' }}
                                      >
                                        {addingActionId === m.id ? '⏳ Добавляю...' : `➕ Добавить все в мои лекарства`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Timestamp */}
                        <p className="text-[10px] px-1" style={{ color: '#9a96a8' }}>{fmtTime(m.ts)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

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
            {/* Camera — native bridge in WebView, label fallback in browser */}
            {isInNativeWebView() ? (
              <button
                type="button"
                onClick={() => nativePostMessage('open-camera')}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80"
                style={{ background: '#f4f3ef' }}
                aria-label="Сделать фото"
              >
                <Camera className="w-4 h-4" style={{ color: '#6a6580' }} aria-hidden="true" />
              </button>
            ) : (
              <label
                htmlFor="ai-chat-camera-input"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-80 cursor-pointer select-none"
                style={{ background: '#f4f3ef' }}
                aria-label="Сделать фото"
              >
                <Camera className="w-4 h-4" style={{ color: '#6a6580' }} aria-hidden="true" />
              </label>
            )}
            {/* Gallery — native bridge in WebView, file input fallback in browser */}
            <button
              type="button"
              onClick={() => {
                if (!nativePostMessage('open-gallery')) galleryInputRef.current?.click();
              }}
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

      {/* ── Confirm: clear history ──────────────────────────────────────────── */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl px-6 pt-6 pb-10 space-y-4"
            style={{ background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-2" />
            <h3 className="text-[18px] font-extrabold text-center" style={{ color: '#2a2540' }}>Удалить историю?</h3>
            <p className="text-[14px] text-center" style={{ color: '#9a96a8' }}>
              Все сообщения будут удалены безвозвратно.
            </p>
            <button
              onClick={() => void doClearHistory()}
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition active:scale-95"
              style={{ background: '#ef4444' }}
            >
              🗑 Удалить все сообщения
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold transition active:scale-95"
              style={{ background: '#f4f3ef', color: '#2a2540' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

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
