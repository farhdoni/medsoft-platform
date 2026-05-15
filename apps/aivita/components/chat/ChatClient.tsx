'use client';
import {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Send, Paperclip, Camera, Image, Mic, MicOff, X, Play, Pause, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const PROXY = '/api/proxy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherUser { id: string; name: string; avatarUrl?: string; specialization?: string; role: string; }
interface ConvInfo { id: string; status: string; otherUser: OtherUser | null; patientId: string; doctorId: string; }

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  type: string;
  content?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

type AttachKind = 'photo' | 'file' | 'audio';
interface AttachPhoto { kind: 'photo'; file: File; dataUrl: string; id: string }
interface AttachFile  { kind: 'file';  file: File; id: string }
interface AttachAudio { kind: 'audio'; blob: Blob; url: string; duration: number; id: string }
type Attachment = AttachPhoto | AttachFile | AttachAudio;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}
function fmtDur(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
function initials(n?: string) {
  return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────

function AudioPlayer({ url, duration }: { url: string; duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = new Audio(url);
    ref.current = el;
    el.onended = () => setPlaying(false);
    return () => { el.pause(); };
  }, [url]);
  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { void el.play(); setPlaying(true); }
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.07)', minWidth: 140 }}>
      <button type="button" onClick={toggle} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/80 flex-shrink-0">
        {playing ? <Pause className="w-3.5 h-3.5" style={{ color: '#2a2540' }} /> : <Play className="w-3.5 h-3.5 ml-0.5" style={{ color: '#2a2540' }} />}
      </button>
      <div className="flex-1 h-1 rounded-full bg-white/30"><div className="h-full w-1/3 rounded-full bg-white/70" /></div>
      {duration != null && <span className="text-[10px] font-mono opacity-70">{fmtDur(duration)}</span>}
    </div>
  );
}

// ─── Special Message Cards ────────────────────────────────────────────────────

function PrescriptionCard({ meta }: { meta: Record<string, unknown> }) {
  return (
    <div className="rounded-xl overflow-hidden min-w-[220px] max-w-[280px]"
      style={{ background: 'linear-gradient(135deg,#f0d4dc,#e0d8f0)', borderLeft: '4px solid #9c5e6c' }}>
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9c5e6c' }}>💊 Назначение</p>
        <p className="text-sm font-semibold text-[#2a2540]">{String(meta.drug ?? '—')}</p>
        <p className="text-xs text-[#6a6580] mt-0.5">{String(meta.dosage ?? '')} · {String(meta.frequency ?? '')}</p>
        {!!meta.duration && <p className="text-xs text-[#9a96a8] mt-0.5">Курс: {String(meta.duration)}</p>}
      </div>
    </div>
  );
}

function ReferralCard({ meta }: { meta: Record<string, unknown> }) {
  const tests = Array.isArray(meta.tests) ? (meta.tests as string[]) : [];
  return (
    <div className="rounded-xl overflow-hidden min-w-[220px] max-w-[280px]"
      style={{ background: '#d4dff0', borderLeft: '4px solid #6BA3D6' }}>
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#3a6fa0' }}>🧪 Направление</p>
        {!!meta.labName && <p className="text-sm font-semibold text-[#2a2540] mb-1">{String(meta.labName)}</p>}
        {tests.length > 0 && (
          <ul className="text-xs text-[#6a6580] space-y-0.5">
            {tests.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Doctor Action Modal ──────────────────────────────────────────────────────

type ActionType = 'prescription' | 'referral';

function DoctorActionModal({
  type, onClose, onSend,
}: { type: ActionType; onClose: () => void; onSend: (payload: Record<string, unknown>) => void }) {
  const [drug, setDrug] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [labName, setLabName] = useState('');
  const [testsStr, setTestsStr] = useState('');

  function handleSend() {
    if (type === 'prescription') {
      if (!drug.trim()) return;
      onSend({ drug: drug.trim(), dosage, frequency, duration });
    } else {
      onSend({ labName, tests: testsStr.split(',').map(t => t.trim()).filter(Boolean) });
    }
    onClose();
  }

  const inputCls = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-3";
  const inputStyle = { color: '#2a2540', borderColor: '#e8e4dc' };

  return (
    <Modal isOpen onClose={onClose}
      title={type === 'prescription' ? '💊 Назначение' : '🧪 Направление на анализы'}
      footer={
        <button onClick={handleSend}
          className="w-full py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}>
          Отправить в чат
        </button>
      }
    >
      {type === 'prescription' ? (
        <>
          <input className={inputCls} style={inputStyle} placeholder="Препарат *" value={drug} onChange={e => setDrug(e.target.value)} autoFocus />
          <input className={inputCls} style={inputStyle} placeholder="Дозировка (напр. 500 мг)" value={dosage} onChange={e => setDosage(e.target.value)} />
          <input className={inputCls} style={inputStyle} placeholder="Частота (напр. 2 раза в день)" value={frequency} onChange={e => setFrequency(e.target.value)} />
          <input className={inputCls} style={inputStyle} placeholder="Длительность (напр. 7 дней)" value={duration} onChange={e => setDuration(e.target.value)} />
        </>
      ) : (
        <>
          <input className={inputCls} style={inputStyle} placeholder="Лаборатория" value={labName} onChange={e => setLabName(e.target.value)} autoFocus />
          <textarea className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none mb-3"
            style={inputStyle} rows={3}
            placeholder="Анализы через запятую&#10;напр. ОАК, Биохимия, Глюкоза"
            value={testsStr} onChange={e => setTestsStr(e.target.value)} />
        </>
      )}
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatClient({ convId, myUserId, isDoctor }: {
  convId: string; myUserId: string; isDoctor: boolean;
}) {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const router = useRouter();
  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [actionModal, setActionModal] = useState<ActionType | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCreatedAt    = useRef<string>('');

  // Load conversation info + initial messages
  useEffect(() => {
    Promise.all([
      fetch(`${PROXY}/conversations`).then(r => r.json()),
      fetch(`${PROXY}/conversations/${convId}/messages`).then(r => r.json()),
    ]).then(([convList, msgsData]) => {
      const conv = (convList.data ?? []).find((c: ConvInfo) => c.id === convId);
      if (conv) setConvInfo(conv);
      const msgs: ChatMessage[] = msgsData.data ?? [];
      setMessages(msgs);
      if (msgs.length > 0) lastCreatedAt.current = msgs[msgs.length - 1].createdAt;
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [convId]);

  // Mark as read on open
  useEffect(() => {
    if (!loading) {
      fetch(`${PROXY}/conversations/${convId}/read`, { method: 'PUT' }).catch(() => {});
    }
  }, [loading, convId]);

  // Poll every 5 seconds for new messages
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const after = lastCreatedAt.current;
        const url = after
          ? `${PROXY}/conversations/${convId}/messages?after=${encodeURIComponent(after)}`
          : `${PROXY}/conversations/${convId}/messages`;
        const j = await fetch(url).then(r => r.json());
        const newMsgs: ChatMessage[] = j.data ?? [];
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const toAdd = newMsgs.filter(m => !ids.has(m.id));
            if (toAdd.length === 0) return prev;
            lastCreatedAt.current = toAdd[toAdd.length - 1].createdAt;
            return [...prev, ...toAdd];
          });
          fetch(`${PROXY}/conversations/${convId}/read`, { method: 'PUT' }).catch(() => {});
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [convId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'auto' });
  }, [messages]);

  // ── File input handler ──────────────────────────────────────────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = uid();
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => {
          setAttachments(prev => [...prev, { kind: 'photo', file, dataUrl: ev.target?.result as string, id }]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, { kind: 'file', file, id }]);
      }
    });
    e.target.value = '';
  }, []);

  // ── Voice recording ─────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAttachments(prev => [...prev, { kind: 'audio', blob, url, duration: recordingSeconds, id: uid() }]);
        setIsRecording(false);
        setRecordingSeconds(0);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {}
  }

  function stopRecording(cancel = false) {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (cancel) {
      mr.ondataavailable = null;
      mr.onstop = null;
      mr.stream.getTracks().forEach(t => t.stop());
      mr.stop();
      setIsRecording(false);
      setRecordingSeconds(0);
    } else {
      mr.stop();
    }
  }

  function handleVoiceButton() {
    if (isRecording) stopRecording(false);
    else void startRecording();
  }

  // ── Upload file to server ────────────────────────────────────────────────────
  async function uploadAttachment(a: Attachment): Promise<{
    url?: string; name?: string; mime?: string; dataUrl?: string;
    duration?: number; kind: AttachKind;
  }> {
    if (a.kind === 'audio') {
      const form = new FormData();
      form.append('file', a.blob, `voice-${Date.now()}.webm`);
      try {
        const j = await fetch(`${PROXY}/upload`, { method: 'POST', body: form }).then(r => r.json());
        return { kind: 'audio', url: j.data?.url, duration: a.duration };
      } catch {
        return { kind: 'audio', url: a.url, duration: a.duration };
      }
    }
    if (a.kind === 'photo') {
      const form = new FormData();
      form.append('file', a.file);
      try {
        const j = await fetch(`${PROXY}/upload`, { method: 'POST', body: form }).then(r => r.json());
        return { kind: 'photo', url: j.data?.url, name: a.file.name };
      } catch {
        return { kind: 'photo', dataUrl: a.dataUrl };
      }
    }
    // file
    const form = new FormData();
    form.append('file', a.file);
    try {
      const j = await fetch(`${PROXY}/upload`, { method: 'POST', body: form }).then(r => r.json());
      return { kind: 'file', url: j.data?.url, name: a.file.name, mime: a.file.type };
    } catch {
      return { kind: 'file', name: a.file.name, mime: a.file.type };
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage(overrideType?: string, overrideMeta?: Record<string, unknown>) {
    if (overrideType) {
      setSending(true);
      try {
        const body = { type: overrideType, content: null, metadata: overrideMeta };
        const j = await fetch(`${PROXY}/conversations/${convId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then(r => r.json());
        if (j.data) {
          setMessages(prev => [...prev, j.data]);
          lastCreatedAt.current = j.data.createdAt;
        }
      } finally { setSending(false); }
      return;
    }

    const hasText = text.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if (!hasText && !hasAttachments) return;

    setSending(true);
    const currentText = text.trim();
    const currentAttachments = [...attachments];
    setText('');
    setAttachments([]);

    try {
      // Upload attachments first
      const uploaded = await Promise.all(currentAttachments.map(uploadAttachment));

      // Send each attachment as a separate message
      for (const up of uploaded) {
        const body: Record<string, unknown> = {
          type: up.kind === 'photo' ? 'image' : up.kind === 'audio' ? 'audio' : 'file',
          attachmentUrl:  up.url ?? up.dataUrl,
          attachmentName: up.name,
          attachmentMime: up.mime,
          metadata: up.duration ? { duration: up.duration } : undefined,
        };
        const j = await fetch(`${PROXY}/conversations/${convId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then(r => r.json());
        if (j.data) { setMessages(prev => [...prev, j.data]); lastCreatedAt.current = j.data.createdAt; }
      }

      // Send text message
      if (currentText) {
        const j = await fetch(`${PROXY}/conversations/${convId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', content: currentText }),
        }).then(r => r.json());
        if (j.data) { setMessages(prev => [...prev, j.data]); lastCreatedAt.current = j.data.createdAt; }
      }
    } finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !sending;
  const other = convInfo?.otherUser;

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#f4f3ef' }}>
      <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-dark)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col max-w-[480px] mx-auto" style={{ background: '#f4f3ef' }}>

      {/* ── TopBar ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b"
        style={{ borderColor: '#e8e4dc' }}>
        <button type="button" onClick={() => router.push(`/${locale}/${isDoctor ? 'doctor-chats' : 'chats'}`)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#f4f3ef' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: '#2a2540' }} />
        </button>

        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ background: isDoctor ? 'linear-gradient(135deg,var(--hero-from),var(--accent-dark))' : 'linear-gradient(135deg,#6BA3D6,#3a6fa0)' }}>
          {initials(other?.name)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate" style={{ color: '#2a2540' }}>
            {isDoctor ? '' : 'Dr. '}{other?.name ?? '—'}
          </p>
          {other?.specialization && (
            <p className="text-[10px] truncate" style={{ color: '#9a96a8' }}>{other.specialization}</p>
          )}
        </div>

        {convInfo?.status === 'active' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#d4e8d8', color: '#548068' }}>● Онлайн</span>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#9a96a8' }}>
              Начните переписку — напишите сообщение
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isMine = msg.senderId === myUserId;
          return (
            <div key={msg.id}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>

              {!isMine && (
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-[10px] mb-1"
                  style={{ background: isDoctor ? 'linear-gradient(135deg,var(--hero-from),var(--accent-dark))' : 'linear-gradient(135deg,#6BA3D6,#3a6fa0)' }}>
                  {initials(other?.name)}
                </div>
              )}

              <div className={`flex flex-col gap-1 max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>

                {/* Prescription card */}
                {msg.type === 'prescription' && msg.metadata && (
                  <PrescriptionCard meta={msg.metadata} />
                )}

                {/* Referral card */}
                {msg.type === 'referral' && msg.metadata && (
                  <ReferralCard meta={msg.metadata} />
                )}

                {/* Image */}
                {msg.type === 'image' && msg.attachmentUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.attachmentUrl} alt="" onClick={() => setFullscreenImg(msg.attachmentUrl!)}
                    className="rounded-xl max-w-[240px] max-h-[200px] object-cover cursor-zoom-in" />
                )}

                {/* Audio */}
                {msg.type === 'audio' && msg.attachmentUrl && (
                  <AudioPlayer url={msg.attachmentUrl}
                    duration={typeof msg.metadata?.duration === 'number' ? msg.metadata.duration : undefined} />
                )}

                {/* File */}
                {msg.type === 'file' && (
                  <a href={msg.attachmentUrl ?? '#'} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: isMine ? 'rgba(255,255,255,0.2)' : '#f4f3ef' }}>
                    <span className="text-xl">📄</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold truncate max-w-[160px]"
                        style={{ color: isMine ? '#fff' : '#2a2540' }}>
                        {msg.attachmentName ?? 'Файл'}
                      </p>
                    </div>
                  </a>
                )}

                {/* Text bubble */}
                {msg.type === 'text' && msg.content && (
                  <div className={`px-4 py-2.5 ${isMine ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
                    style={isMine
                      ? { background: 'var(--accent, #9c5e6c)', color: '#fff' }
                      : { background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }}>
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}

                <p className="text-[10px] px-1" style={{ color: '#9a96a8' }}>{fmtTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Attachment previews ─────────────────────────────────────────────── */}
      {attachments.length > 0 && (
        <div className="flex-shrink-0 overflow-x-auto px-3 py-2 flex gap-2"
          style={{ borderTop: '1px solid #e8e4dc', background: '#fff' }}>
          {attachments.map(a => (
            <div key={a.id} className="relative flex-shrink-0">
              {a.kind === 'photo' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.dataUrl} alt="" className="w-16 h-16 rounded-xl object-cover"
                  style={{ border: '2px solid #e8e4dc' }} />
              )}
              {a.kind === 'file' && (
                <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 p-1"
                  style={{ background: '#e0d8f0', border: '2px solid #c8c0e0' }}>
                  <span className="text-2xl">📄</span>
                  <span className="text-[8px] font-semibold truncate w-full text-center"
                    style={{ color: '#6a5090' }}>
                    {a.file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              {a.kind === 'audio' && (
                <div className="w-auto h-16 px-3 rounded-xl flex items-center gap-2"
                  style={{ background: '#f0ece8', border: '2px solid #e0dcd8' }}>
                  <span className="text-xl">🎤</span>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: '#2a2540' }}>{fmtDur(a.duration)}</span>
                </div>
              )}
              <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ background: '#9c5e6c' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input panel ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-2 pb-5"
        style={{ background: '#fff', borderTop: attachments.length === 0 ? '1px solid #e8e4dc' : 'none' }}>

        {/* Voice recording bar */}
        {isRecording && (
          <div className="flex items-center justify-between px-4 py-2 rounded-2xl mb-2"
            style={{ background: '#fff0f3', border: '1px solid #f0d4dc' }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#c0392b', animation: 'pulse 1s infinite' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#c0392b' }}>
                🔴 {fmtDur(recordingSeconds)}
              </span>
            </div>
            <button type="button" onClick={() => stopRecording(true)}
              className="text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ background: '#fde8e8', color: '#8a3a3a' }}>
              Отмена
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Doctor "+" menu */}
          {isDoctor && (
            <div className="relative flex-shrink-0 pb-0.5">
              <button type="button" onClick={() => setShowActionMenu(v => !v)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition"
                style={{ background: showActionMenu ? 'var(--accent-dark)' : '#f4f3ef' }}>
                <Plus className="w-4 h-4" style={{ color: showActionMenu ? '#fff' : '#6a6580' }} />
              </button>
              {showActionMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border overflow-hidden z-30"
                  style={{ borderColor: '#e8e4dc', minWidth: 180 }}>
                  <button type="button" onClick={() => { setActionModal('prescription'); setShowActionMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#f4f3ef] transition-colors text-left">
                    📋 Назначение
                  </button>
                  <button type="button" onClick={() => { setActionModal('referral'); setShowActionMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#f4f3ef] transition-colors border-t border-[#f4f3ef] text-left">
                    🧪 Направление
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Media buttons */}
          <div className="flex gap-1.5 flex-shrink-0 pb-0.5">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f4f3ef' }}>
              <Paperclip className="w-4 h-4" style={{ color: '#6a6580' }} />
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f4f3ef' }}>
              <Camera className="w-4 h-4" style={{ color: '#6a6580' }} />
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f4f3ef' }}>
              <Image className="w-4 h-4" style={{ color: '#6a6580' }} />
            </button>
            <button type="button" onClick={handleVoiceButton}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition"
              style={{ background: isRecording ? '#c0392b' : '#f4f3ef' }}>
              {isRecording
                ? <MicOff className="w-4 h-4 text-white" />
                : <Mic className="w-4 h-4" style={{ color: '#6a6580' }} />}
            </button>
          </div>

          {/* Textarea */}
          <textarea ref={textareaRef} value={text}
            onChange={e => { setText(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
            style={{ minHeight: 40, maxHeight: 120, borderColor: '#e8e4dc', color: '#2a2540', lineHeight: '1.4' }}
          />

          {/* Send */}
          <button type="button" onClick={() => void sendMessage()} disabled={!canSend}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-90 disabled:opacity-40"
            style={{ background: 'var(--accent, #9c5e6c)' }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef}    type="file" accept="*/*"         multiple className="hidden" onChange={handleFileInput} />
      <input ref={cameraInputRef}  type="file" accept="image/*"     capture="environment" className="hidden" onChange={handleFileInput} />
      <input ref={galleryInputRef} type="file" accept="image/*"     multiple className="hidden" onChange={handleFileInput} />

      {/* Doctor action modals */}
      {actionModal && (
        <DoctorActionModal
          type={actionModal}
          onClose={() => setActionModal(null)}
          onSend={meta => void sendMessage(actionModal, meta)}
        />
      )}

      {/* Fullscreen image */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setFullscreenImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullscreenImg} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
