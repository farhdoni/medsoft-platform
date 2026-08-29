'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, BellOff, ChevronLeft, Lock, Paperclip, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { SupportComposer, type ComposerMode } from '@/components/support/SupportComposer';
import { MediaPanel } from '@/components/support/MediaPanel';

/**
 * Кабинет поддержки и модерации.
 *
 * Три очереди слева читаются одним предикатом на бэкенде (status + оператор),
 * поэтому здесь очередь — просто параметр запроса, а не своя ветка логики.
 *
 * Поллинг 12 секунд: достаточно быстро, чтобы оператор не обновлял руками, и
 * достаточно редко, чтобы не жечь соединение. Счётчик в title, звук и
 * браузерное уведомление считаются от ОДНОГО числа необработанных — иначе они
 * начали бы расходиться между собой.
 */

const POLL_MS = 12_000;
const API = '/v1/aivita-admin/support';

type Queue = 'mine' | 'unassigned' | 'archive';

type Ticket = {
  ticketId: string;
  conversationId: string;
  status: 'open' | 'closed';
  assignedOperatorId: string | null;
  rating: number | null;
  name: string;
  nick: string | null;
  preview: string;
  lastAt: string;
  waitingMinutes: number | null;
  escalated: boolean;
};

type Kpi = { solvedToday: number; avgFirstResponseMin: number | null; activeCount: number };
type Msg = { id: string; senderId: string; content: string | null; type: string; createdAt: string; deletedAt: string | null };
type Note = { id: string; operatorId: string | null; text: string; createdAt: string };
type ThreadData = {
  ticket: { id: string; status: string; assignedOperatorId: string | null; rating: number | null };
  messages: Msg[];
  notes: Note[];
};
type Operator = { id: string; fullName: string; shiftStatus: string };
type Template = { id: string; title: string; body: string };
type Report = { id: string; reason: string; status: string; createdAt: string; content: string | null };
type UserCard = {
  id: string; name: string | null; nickname: string | null; phone: string | null;
  plan: string | null; locale: string | null; createdAt: string; lastLoginAt: string | null;
  cardCode: string | null; profileFilled: boolean; dialogs: number; complaints: number; blocked: boolean;
};

type Row = { kind: 'msg' | 'note'; id: string; at: string; body: string; own: boolean };

const QUEUES: { key: Queue; label: string }[] = [
  { key: 'mine', label: 'Мои' },
  { key: 'unassigned', label: 'Нераспределённые' },
  { key: 'archive', label: 'Архив' },
];

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtWait = (m: number) => (m < 60 ? `ждёт ${m} мин` : `ждёт ${Math.floor(m / 60)} ч ${m % 60} мин`);
const isAttachment = (s: string) => /^https?:\/\//.test(s);

/** Ширины колонок переживают перезагрузку — оператор настраивает их один раз. */
function useStoredWidth(key: string, initial: number) {
  const [w, setW] = useState(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setW(Number(raw) || initial);
    } catch { /* приватный режим — просто дефолт */ }
  }, [key, initial]);
  const save = useCallback(
    (next: number) => {
      setW(next);
      try { localStorage.setItem(key, String(next)); } catch { /* см. выше */ }
    },
    [key],
  );
  return [w, save] as const;
}

export default function SupportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'tickets' | 'reports' | 'templates'>('tickets');
  const [queue, setQueue] = useState<Queue>('mine');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<ComposerMode>('reply');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [mobileThread, setMobileThread] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [saUnlocked, setSaUnlocked] = useState(false);

  const [listW, setListW] = useStoredWidth('av-support-col-list', 340);
  const [cardW, setCardW] = useStoredWidth('av-support-col-card', 264);

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevWaiting = useRef(0);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ id: string; fullName: string; role: string; shiftStatus: string }>('/v1/auth/me'),
  });

  const list = useQuery({
    queryKey: ['support-tickets', queue],
    queryFn: () => api.get<{ data: Ticket[]; kpi: Kpi; slaMinutes: number }>(`${API}/conversations?queue=${queue}`),
    refetchInterval: POLL_MS,
  });

  const counts = useQuery({
    queryKey: ['support-counts'],
    queryFn: async () => {
      const [mine, unassigned] = await Promise.all([
        api.get<{ data: Ticket[] }>(`${API}/conversations?queue=mine`),
        api.get<{ data: Ticket[] }>(`${API}/conversations?queue=unassigned`),
      ]);
      return { mine: mine.data.length, unassigned: unassigned.data.length };
    },
    refetchInterval: POLL_MS,
  });

  const thread = useQuery({
    queryKey: ['support-thread', selected],
    queryFn: () => api.get<{ data: ThreadData }>(`${API}/conversations/${selected}/messages`).then((r) => r.data),
    enabled: !!selected,
    refetchInterval: selected ? POLL_MS : false,
  });

  const operators = useQuery({ queryKey: ['support-operators'], queryFn: () => api.get<{ data: Operator[] }>(`${API}/operators`).then((r) => r.data) });
  const templates = useQuery({ queryKey: ['support-templates'], queryFn: () => api.get<{ data: Template[] }>(`${API}/templates`).then((r) => r.data) });
  const reports = useQuery({
    queryKey: ['support-reports'],
    queryFn: () => api.get<{ data: Report[] }>(`${API}/reports`).then((r) => r.data),
    refetchInterval: POLL_MS,
  });

  const partner = list.data?.data.find((t) => t.conversationId === selected) ?? null;

  /** Собеседник — единственный отправитель в треде, который не поддержка. */
  const partnerId = useMemo(() => {
    const msgs = thread.data?.messages ?? [];
    const supportIds = new Set(msgs.map((m) => m.senderId));
    // Сообщения поддержки идут от @aivita; их id один и тот же во всём треде.
    // Берём первого отправителя, который не совпадает с автором последнего
    // сообщения оператора — надёжнее спросить карточку по нему.
    const first = msgs.find((m) => m.senderId);
    if (!first) return null;
    const distinct = [...supportIds];
    if (distinct.length < 2) return null;
    return distinct.find((id) => id !== first.senderId) ?? distinct[0];
  }, [thread.data]);

  const card = useQuery({
    queryKey: ['support-card', partnerId],
    queryFn: () => api.get<{ data: UserCard }>(`${API}/users/${partnerId}/card`).then((r) => r.data),
    enabled: !!partnerId,
  });

  // ── Уведомления оператору ───────────────────────────────────────────────
  const waiting = counts.data?.unassigned ?? 0;

  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting}) Поддержка — AIVITA` : 'Поддержка — AIVITA';
  }, [waiting]);

  useEffect(() => {
    if (waiting > prevWaiting.current) {
      if (soundOn) {
        try {
          const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.06;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch { /* автоплей заблокирован — молча */ }
      }
      // Системное уведомление только когда вкладка не на виду: иначе оно
      // дублирует то, что оператор и так видит.
      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('AIVITA · Поддержка', { body: `Новых обращений: ${waiting}` });
      }
    }
    prevWaiting.current = waiting;
  }, [waiting, soundOn]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
  }, []);

  // ── Мутации ─────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['support-tickets'] });
    void qc.invalidateQueries({ queryKey: ['support-counts'] });
    void qc.invalidateQueries({ queryKey: ['support-thread'] });
  }, [qc]);

  const sendReply = useMutation({
    mutationFn: (content: string) => api.post(`${API}/conversations/${selected}/messages`, { content }),
    onSuccess: () => { setDraft(''); refresh(); toast.success('Отправлено от @aivita'); },
    onError: () => toast.error('Не удалось отправить'),
  });

  const addNote = useMutation({
    mutationFn: (text: string) => api.post(`${API}/conversations/${selected}/notes`, { text }),
    onSuccess: () => { setDraft(''); refresh(); toast.success('Заметка сохранена — пациент её не видит'); },
    onError: () => toast.error('Не удалось сохранить заметку'),
  });

  const assign = useMutation({
    mutationFn: () => api.post(`${API}/conversations/${selected}/assign`),
    onSuccess: () => { refresh(); setQueue('mine'); toast.success('Взято в работу'); },
  });

  const setStatus = useMutation({
    mutationFn: (status: 'open' | 'closed') => api.patch(`${API}/conversations/${selected}/status`, { status }),
    onSuccess: (_d, status) => { refresh(); toast.success(status === 'closed' ? 'Закрыто — пациенту ушёл запрос оценки' : 'Обращение снова открыто'); },
  });

  const transfer = useMutation({
    mutationFn: (v: { toOperatorId: string; comment: string }) => api.post(`${API}/conversations/${selected}/transfer`, v),
    onSuccess: () => { setTransferOpen(false); refresh(); toast.success('Передано · заметка и запись в аудите'); },
    onError: () => toast.error('Не удалось передать'),
  });

  const block = useMutation({
    mutationFn: (v: { reason: string; comment: string }) => api.post(`${API}/users/${partnerId}/block`, v),
    onSuccess: () => { setBlockOpen(false); void qc.invalidateQueries({ queryKey: ['support-card'] }); toast.success('Заблокирован · причина в журнале аудита'); },
  });

  const unblock = useMutation({
    mutationFn: () => api.post(`${API}/users/${partnerId}/unblock`, { reason: 'снято оператором' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['support-card'] }); toast.success('Блокировка снята · записано в аудит'); },
  });

  const setShift = useMutation({
    mutationFn: (shiftStatus: string) => api.patch(`${API}/shift`, { shiftStatus }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Статус смены обновлён'); },
  });

  const resolveReport = useMutation({
    mutationFn: (v: { id: string; status: 'reviewed' | 'dismissed' }) => api.patch(`${API}/reports/${v.id}`, { status: v.status }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['support-reports'] }); toast.success('Жалоба обработана'); },
  });

  function send() {
    const v = draft.trim();
    if (!v || !selected) return;
    if (mode === 'note') addNote.mutate(v);
    else sendReply.mutate(v);
  }

  /** Вложения уходят обычным сообщением — своей ветки отправки нет. */
  const uploadAndSend = useCallback(async (file: File) => {
    if (!selected) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/v1\/?$/, '');
      const up = await fetch(`${base}/v1/aivita-admin/support/upload`, { method: 'POST', body: form, credentials: 'include' });
      const uj = (await up.json()) as { data?: { url: string } };
      if (!up.ok || !uj.data) throw new Error('upload failed');
      sendReply.mutate(uj.data.url);
    } catch {
      toast.error('Не удалось загрузить файл');
    }
  }, [selected, sendReply]);

  // ── Голосовое ───────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function toggleMic() {
    if (recording) {
      const rec = recRef.current;
      if (!rec) return;
      rec.onstop = () => {
        if (tickRef.current) clearInterval(tickRef.current);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        rec.stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setRecSeconds(0);
        const ext = (rec.mimeType || '').includes('mp4') ? 'm4a' : 'webm';
        void uploadAndSend(new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }));
      };
      rec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      tickRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('Нет доступа к микрофону — разрешите в настройках браузера');
    }
  }

  function cancelRecording() {
    const rec = recRef.current;
    if (tickRef.current) clearInterval(tickRef.current);
    if (rec) {
      rec.onstop = null;
      rec.stop();
      rec.stream.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setRecSeconds(0);
  }

  // ── Перетаскивание границ ───────────────────────────────────────────────
  function startDrag(which: 'list' | 'card', e: React.MouseEvent) {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = which === 'list' ? listW : cardW;
    const move = (ev: MouseEvent) => {
      const d = which === 'list' ? ev.clientX - x0 : x0 - ev.clientX;
      const next = Math.min(which === 'list' ? 620 : 520, Math.max(which === 'list' ? 240 : 200, w0 + d));
      if (which === 'list') setListW(next); else setCardW(next);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  // Эскалированные — наверх: очередь читается сверху вниз.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (list.data?.data ?? []).filter((t) =>
      !q ? true : `${t.name} ${t.nick ?? ''} ${t.preview}`.toLowerCase().includes(q),
    );
    return [...rows].sort(
      (a, b) => Number(b.escalated) - Number(a.escalated) || (b.waitingMinutes ?? -1) - (a.waitingMinutes ?? -1),
    );
  }, [list.data, search]);

  /** Сообщения и заметки в одной ленте по времени — так тред и читается. */
  const rows: Row[] = useMemo(() => {
    const t = thread.data;
    if (!t) return [];
    const msgs: Row[] = t.messages
      .filter((m) => !m.deletedAt)
      .map((m) => ({ kind: 'msg', id: m.id, at: m.createdAt, body: m.content ?? '', own: m.senderId !== partnerId }));
    const notes: Row[] = t.notes.map((n) => ({ kind: 'note', id: n.id, at: n.createdAt, body: n.text, own: true }));
    return [...msgs, ...notes].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  }, [thread.data, partnerId]);

  const kpi = list.data?.kpi;

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-[#e8e4dc] bg-[#f0efe9]">
      {/* ── Шапка ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-3.5 bg-[#2a2540] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2 font-extrabold">
          <span className="h-6 w-6 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%,#f0d4dc,#9c5e6c)' }} />
          AIVITA · Поддержка
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ['решено сегодня', String(kpi?.solvedToday ?? 0)],
            ['ср. первый ответ', kpi?.avgFirstResponseMin == null ? '—' : `${kpi.avgFirstResponseMin}м`],
            ['активных', String(kpi?.activeCount ?? 0)],
          ] as const).map(([label, v]) => (
            <div key={label} className="rounded-[10px] bg-white/10 px-3 py-1 text-[.72rem] text-[#cfcadf]">
              <b className="mr-1 font-mono text-[.9rem] text-white">{v}</b>
              {label}
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <select
            aria-label="Статус смены"
            value={me.data?.shiftStatus ?? 'offline'}
            onChange={(e) => setShift.mutate(e.target.value)}
            className="rounded-full border-0 bg-white/10 px-3 py-1.5 text-[.78rem] font-bold text-white"
          >
            <option value="online" className="text-[#2a2540]">🟢 В сети</option>
            <option value="break" className="text-[#2a2540]">🟡 Перерыв</option>
            <option value="offline" className="text-[#2a2540]">🔴 Не на смене</option>
          </select>
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            aria-pressed={soundOn}
            aria-label="Звук уведомлений"
            className={`flex items-center gap-1 rounded-full border border-white/25 px-2.5 py-1 text-[.78rem] ${soundOn ? '' : 'line-through opacity-45'}`}
          >
            {soundOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />} звук
          </button>
        </div>
      </header>

      {/* ── Вкладки ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#e8e4dc] bg-white px-4 py-2.5">
        {([
          ['tickets', 'Обращения', counts.data ? counts.data.mine + counts.data.unassigned : null],
          ['reports', 'Жалобы', reports.data?.filter((x) => x.status === 'pending').length ?? null],
          ['templates', 'Шаблоны', null],
        ] as const).map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full border px-4 py-1.5 text-[.82rem] font-bold ${
              tab === k ? 'border-[#9c5e6c] bg-[#9c5e6c] text-white' : 'border-[#e8e4dc] bg-[#faf9f5] text-[#6a6580]'
            }`}
          >
            {label}
            {n != null && <span className="ml-1.5 text-[.68rem] opacity-80">· {n}</span>}
          </button>
        ))}
      </div>

      {tab === 'tickets' && (
        <div className="flex min-h-0 flex-1">
          {/* Список */}
          <div
            className={`flex flex-none flex-col border-r border-[#e8e4dc] bg-white max-[900px]:w-full ${mobileThread ? 'max-[900px]:hidden' : ''}`}
            style={{ width: listW }}
          >
            <div className="relative m-3 mb-2">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9a96a8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск: имя, @username, текст…"
                aria-label="Поиск по обращениям"
                className="w-full rounded-xl border border-[#e8e4dc] bg-[#faf9f5] py-2 pl-9 pr-3 text-[.85rem] outline-none focus:border-[#f0d4dc] focus:bg-white"
              />
            </div>
            <div className="flex gap-1.5 border-b border-[#f0ede6] px-3 pb-2.5">
              {QUEUES.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setQueue(q.key)}
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[.74rem] font-bold ${
                    queue === q.key ? 'border-[#2a2540] bg-[#2a2540] text-white' : 'border-[#e8e4dc] bg-[#faf9f5] text-[#6a6580]'
                  }`}
                >
                  {q.label}
                  {q.key !== 'archive' && counts.data && (
                    <b className="ml-1 font-mono">{q.key === 'mine' ? counts.data.mine : counts.data.unassigned}</b>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto" data-testid="ticket-list">
              {visible.length === 0 ? (
                <p className="px-4 py-9 text-center text-[.82rem] text-[#9a96a8]">
                  В этой очереди пусто.
                  <br />
                  Новые обращения появятся здесь.
                </p>
              ) : (
                visible.map((t) => (
                  <button
                    key={t.ticketId}
                    type="button"
                    onClick={() => { setSelected(t.conversationId); setMobileThread(true); }}
                    className={`flex w-full gap-2.5 border-b border-l-[3px] border-b-[#f0ede6] p-3 text-left hover:bg-[#faf9f5] ${
                      selected === t.conversationId ? 'bg-[#fdf5f7]' : ''
                    } ${t.escalated ? 'border-l-[#c4574e]' : t.waitingMinutes != null ? 'border-l-[#9c5e6c]' : 'border-l-transparent'}`}
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#7d6b9e] text-[.8rem] font-extrabold text-white">
                      {(t.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <b className="truncate text-[.9rem]">{t.name}</b>
                        <span className="ml-auto font-mono text-[.66rem] text-[#9a96a8]">{fmtTime(t.lastAt)}</span>
                      </span>
                      {t.nick && <span className="block text-[.7rem] font-bold text-[#9c5e6c]">{t.nick}</span>}
                      <span className="block truncate text-[.78rem] text-[#6a6580]">{t.preview || '—'}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[.62rem] font-extrabold ${
                            t.status === 'closed' ? 'bg-[#e9f7f2] text-[#45ba9a]' : 'bg-[#fbf3e2] text-[#b7852e]'
                          }`}
                        >
                          {t.status === 'closed' ? 'закрыто' : t.assignedOperatorId ? 'моё' : 'нераспр.'}
                        </span>
                        {t.waitingMinutes != null && (
                          <span
                            data-testid="sla-chip"
                            className={`rounded-full px-2 py-0.5 font-mono text-[.62rem] font-extrabold ${
                              t.escalated ? 'bg-[#c4574e] text-white' : 'bg-[#f0d4dc] text-[#9c5e6c]'
                            }`}
                          >
                            {fmtWait(t.waitingMinutes)}
                          </span>
                        )}
                        {t.rating != null && <span className="text-[.7rem] tracking-wider text-[#d9a520]">{'★'.repeat(t.rating)}</span>}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div onMouseDown={(e) => startDrag('list', e)} data-testid="resizer-list" className="w-1.5 flex-none cursor-col-resize hover:bg-[#f0d4dc] max-[900px]:hidden" />

          {/* Тред */}
          <div className={`flex min-w-0 flex-1 flex-col bg-[#f0efe9] max-[900px]:w-full ${mobileThread ? '' : 'max-[900px]:hidden'}`}>
            {!selected ? (
              <p className="m-auto text-sm text-[#9a96a8]">Выберите обращение слева.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2.5 border-b border-[#e8e4dc] bg-white px-4 py-2.5">
                  <button type="button" onClick={() => setMobileThread(false)} className="hidden max-[900px]:block" aria-label="Назад к списку">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7d6b9e] text-xs font-extrabold text-white">
                    {(partner?.name ?? '?').slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <b className="text-[.95rem]">{partner?.name ?? 'Пользователь'}</b>
                    {partner?.nick && <small className="block text-[.7rem] font-bold text-[#9c5e6c]">{partner.nick}</small>}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {partner && !partner.assignedOperatorId && partner.status === 'open' && (
                      <button type="button" onClick={() => assign.mutate()} className="rounded-[10px] border border-[#e8e4dc] bg-white px-3 py-1.5 text-[.76rem] font-bold">
                        ✋ Взять в работу
                      </button>
                    )}
                    <button type="button" onClick={() => setTransferOpen(true)} className="rounded-[10px] border border-[#e8e4dc] bg-white px-3 py-1.5 text-[.76rem] font-bold">
                      ➡ Передать
                    </button>
                    <button type="button" onClick={() => setBlockOpen(true)} className="rounded-[10px] border border-[#ebcdc9] bg-white px-3 py-1.5 text-[.76rem] font-bold text-[#c4574e]">
                      Заблокировать
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus.mutate(thread.data?.ticket.status === 'closed' ? 'open' : 'closed')}
                      className="rounded-[10px] border border-[#9c5e6c] bg-[#9c5e6c] px-3 py-1.5 text-[.76rem] font-bold text-white"
                    >
                      {thread.data?.ticket.status === 'closed' ? 'Открыть заново' : 'Закрыть'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" data-testid="thread">
                  {rows.map((m) =>
                    m.kind === 'note' ? (
                      <div key={m.id} data-testid="note-bubble" className="self-stretch rounded-[10px] border border-[#e8d9a0] bg-[#fff7dd] px-3 py-2 text-[.8rem] text-[#6b5a1e]">
                        <span className="mb-0.5 block text-[.58rem] font-extrabold uppercase tracking-wider opacity-60">🗒 Внутренняя заметка</span>
                        {m.body}
                        <span className="mt-1 block text-right font-mono text-[.6rem] opacity-60">{fmtTime(m.at)}</span>
                      </div>
                    ) : (
                      <div
                        key={m.id}
                        className={`max-w-[64%] rounded-[15px] px-3 py-2 text-[.87rem] leading-snug ${
                          m.own ? 'self-end bg-[#9c5e6c] text-white' : 'self-start border border-[#e8e4dc] bg-white'
                        }`}
                      >
                        {m.own && <span className="mb-0.5 block text-[.58rem] font-extrabold uppercase tracking-wider opacity-55">Поддержка · @aivita</span>}
                        {isAttachment(m.body) ? (
                          <a href={m.body} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 underline">
                            <Paperclip className="h-3.5 w-3.5" /> вложение
                          </a>
                        ) : (
                          m.body
                        )}
                        <span className="mt-1 block text-right font-mono text-[.6rem] opacity-60">{fmtTime(m.at)}</span>
                      </div>
                    ),
                  )}
                </div>

                <div className="relative">
                  {mediaOpen && (
                    <MediaPanel
                      onEmoji={(e) => setDraft((d) => d + e)}
                      onSticker={(url) => { setMediaOpen(false); sendReply.mutate(url); }}
                      onGif={(url) => { setMediaOpen(false); sendReply.mutate(url); }}
                    />
                  )}
                  <SupportComposer
                    value={draft}
                    onChange={setDraft}
                    onSend={send}
                    mode={mode}
                    onModeChange={setMode}
                    onAttach={() => fileRef.current?.click()}
                    onMedia={() => setMediaOpen((v) => !v)}
                    mediaOpen={mediaOpen}
                    recording={recording}
                    recordingSeconds={recSeconds}
                    onMic={toggleMic}
                    onCancelRecording={cancelRecording}
                    templates={mode === 'note' ? [] : templates.data ?? []}
                    onTemplate={(b) => { setDraft(b); setMode('reply'); inputRef.current?.focus(); }}
                    inputRef={inputRef}
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void uploadAndSend(f);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div onMouseDown={(e) => startDrag('card', e)} data-testid="resizer-card" className="w-1.5 flex-none cursor-col-resize hover:bg-[#f0d4dc] max-[900px]:hidden" />

          {/* Карточка пользователя */}
          <aside className="flex-none overflow-y-auto border-l border-[#e8e4dc] bg-white p-4 max-[900px]:hidden" style={{ width: cardW }}>
            {!card.data ? (
              <p className="text-center text-xs text-[#9a96a8]">Карточка появится при выборе обращения.</p>
            ) : (
              <>
                <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-[#7d6b9e] text-lg font-extrabold text-white">
                  {(card.data.name ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-center text-[.95rem] font-extrabold">{card.data.name ?? 'Пользователь'}</h3>
                {card.data.nickname && <p className="mb-3 text-center text-[.76rem] font-bold text-[#9c5e6c]">@{card.data.nickname}</p>}

                {/* Номер анкеты — текстом: страницы анкеты в админке нет, и
                    кнопка «Открыть анкету» вела бы в никуда. */}
                {([
                  ['Номер анкеты', card.data.cardCode ?? '—'],
                  ['Анкета', card.data.profileFilled ? 'заполнена' : 'не заполнена'],
                  ['Телефон', card.data.phone ?? '—'],
                  ['Регистрация', fmtDate(card.data.createdAt)],
                  ['Тариф', card.data.plan ?? 'free'],
                  ['Диалогов', String(card.data.dialogs)],
                  ['Жалоб', String(card.data.complaints)],
                  ['Последний визит', fmtDate(card.data.lastLoginAt)],
                  ['Язык', card.data.locale ?? 'ru'],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-[#f0ede6] py-1.5 text-[.76rem]">
                    <span className="text-[#6a6580]">{k}</span>
                    <b className={k === 'Номер анкеты' ? 'font-mono' : ''} data-testid={k === 'Номер анкеты' ? 'card-code' : undefined}>{v}</b>
                  </div>
                ))}

                <p className="mb-1.5 mt-3.5 text-[.64rem] font-extrabold uppercase tracking-wider text-[#9a96a8]">Блокировки</p>
                <div className="flex justify-between border-b border-[#f0ede6] py-1.5 text-[.76rem]">
                  <span className="text-[#6a6580]">Статус</span>
                  <b className={card.data.blocked ? 'text-[#c4574e]' : 'text-[#45ba9a]'}>{card.data.blocked ? 'заблокирован' : 'не заблокирован'}</b>
                </div>
                {card.data.blocked && (
                  <button type="button" onClick={() => unblock.mutate()} className="mt-1.5 w-full rounded-[10px] border border-[#e8e4dc] py-1.5 text-[.76rem] font-bold">
                    Снять блокировку
                  </button>
                )}

                <p className="mb-1.5 mt-3.5 text-[.64rem] font-extrabold uppercase tracking-wider text-[#9a96a8]">Управление аккаунтом</p>
                {!saUnlocked ? (
                  <div className="rounded-xl border border-[#e8e4dc] bg-[#faf9f5] p-3 text-center text-[.76rem] text-[#6a6580]">
                    <Lock className="mx-auto mb-1 h-4 w-4" />
                    Только для superadmin
                    <button
                      type="button"
                      onClick={() => setSaUnlocked(true)}
                      disabled={me.data?.role !== 'superadmin'}
                      className="mt-2 w-full rounded-[10px] border border-[#e8e4dc] bg-white py-1.5 font-bold disabled:opacity-40"
                    >
                      Ввести пароль
                    </button>
                  </div>
                ) : (
                  <SuperadminBlock
                    userId={card.data.id}
                    plan={card.data.plan ?? 'free'}
                    phone={card.data.phone ?? ''}
                    onDone={() => void qc.invalidateQueries({ queryKey: ['support-card'] })}
                  />
                )}
              </>
            )}
          </aside>
        </div>
      )}

      {tab === 'reports' && (
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white">
            <thead>
              <tr>
                {['Когда', 'Причина', 'Сообщение', 'Статус', 'Действия'].map((h) => (
                  <th key={h} className="border-b border-[#e8e4dc] bg-[#faf9f5] px-3.5 py-2.5 text-left text-[.64rem] font-extrabold uppercase tracking-wider text-[#9a96a8]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(reports.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-[#9a96a8]">Жалоб нет.</td>
                </tr>
              )}
              {(reports.data ?? []).map((rp) => (
                <tr key={rp.id} className={rp.status !== 'pending' ? 'opacity-50' : ''}>
                  <td className="border-b border-[#f0ede6] px-3.5 py-3 font-mono text-[.72rem]">{fmtDate(rp.createdAt)}</td>
                  <td className="border-b border-[#f0ede6] px-3.5 py-3 text-[.82rem]">{rp.reason}</td>
                  <td className="border-b border-[#f0ede6] px-3.5 py-3">
                    <div className="max-w-[320px] rounded-lg border border-[#f0ede6] bg-[#faf9f5] px-2.5 py-1.5 text-[.78rem] text-[#6a6580]">{rp.content ?? '—'}</div>
                  </td>
                  <td className="border-b border-[#f0ede6] px-3.5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[.62rem] font-extrabold ${rp.status === 'pending' ? 'bg-[#fbf3e2] text-[#b7852e]' : 'bg-[#e9f7f2] text-[#45ba9a]'}`}>
                      {rp.status}
                    </span>
                  </td>
                  <td className="border-b border-[#f0ede6] px-3.5 py-3">
                    {rp.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => resolveReport.mutate({ id: rp.id, status: 'reviewed' })} className="rounded-lg border border-[#e8e4dc] px-2 py-1 text-[.7rem] font-bold">
                          Решено
                        </button>
                        <button type="button" onClick={() => resolveReport.mutate({ id: rp.id, status: 'dismissed' })} className="rounded-lg border border-[#e8e4dc] px-2 py-1 text-[.7rem] font-bold">
                          Отклонить
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'templates' && (
        <TemplatesTab templates={templates.data ?? []} onSaved={() => void qc.invalidateQueries({ queryKey: ['support-templates'] })} />
      )}

      {transferOpen && (
        <TransferModal
          operators={(operators.data ?? []).filter((o) => o.id !== me.data?.id)}
          onClose={() => setTransferOpen(false)}
          onSubmit={(v) => transfer.mutate(v)}
        />
      )}

      {blockOpen && <BlockModal onClose={() => setBlockOpen(false)} onSubmit={(v) => block.mutate(v)} />}
    </div>
  );
}

// ─── Модалка передачи ─────────────────────────────────────────────────────────

function TransferModal({
  operators,
  onClose,
  onSubmit,
}: {
  operators: Operator[];
  onClose: () => void;
  onSubmit: (v: { toOperatorId: string; comment: string }) => void;
}) {
  const [to, setTo] = useState('');
  const [comment, setComment] = useState('');
  const dot = (s: string) => (s === 'online' ? 'bg-[#45ba9a]' : s === 'break' ? 'bg-[#b7852e]' : 'bg-[#c4574e]');

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(42,37,64,.4)] p-4" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h4 className="mb-3 text-[.95rem] font-extrabold">➡ Передать обращение</h4>
        {operators.length === 0 && <p className="text-sm text-[#9a96a8]">Других операторов нет.</p>}
        {operators.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setTo(o.id)}
            className={`mb-1.5 flex w-full items-center gap-2.5 rounded-[10px] border p-2 text-left text-[.84rem] ${
              to === o.id ? 'border-[#9c5e6c] bg-[#fdf5f7]' : 'border-[#e8e4dc]'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${dot(o.shiftStatus)}`} />
            <b>{o.fullName}</b>
            <span className="text-[.75rem] text-[#6a6580]">
              {o.shiftStatus === 'online' ? 'В сети' : o.shiftStatus === 'break' ? 'Перерыв' : 'Не на смене'}
            </span>
          </button>
        ))}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий для коллеги: что уже выяснено…"
          aria-label="Комментарий при передаче"
          className="mt-2 h-16 w-full resize-none rounded-[10px] border border-[#e8e4dc] bg-[#faf9f5] p-2.5 text-[.82rem] outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#e8e4dc] px-3 py-1.5 text-[.76rem] font-bold">
            Отмена
          </button>
          <button
            type="button"
            disabled={!to || !comment.trim()}
            onClick={() => onSubmit({ toOperatorId: to, comment: comment.trim() })}
            className="rounded-[10px] bg-[#9c5e6c] px-3 py-1.5 text-[.76rem] font-bold text-white disabled:opacity-40"
          >
            Передать
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Модалка блокировки ───────────────────────────────────────────────────────

const BLOCK_REASONS = ['Спам / назойливые обращения', 'Несанкционированная реклама', 'Оскорбления / угрозы', 'Другая причина'];

function BlockModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (v: { reason: string; comment: string }) => void }) {
  const [reason, setReason] = useState(BLOCK_REASONS[0]);
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(42,37,64,.4)] p-4" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h4 className="mb-3 text-[.95rem] font-extrabold">🚫 Блокировка пользователя</h4>
        {BLOCK_REASONS.map((rr) => (
          <label key={rr} className="flex cursor-pointer items-center gap-2 py-1.5 text-[.84rem]">
            <input type="radio" name="blockReason" checked={reason === rr} onChange={() => setReason(rr)} />
            {rr}
          </label>
        ))}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий — попадёт в журнал аудита…"
          aria-label="Комментарий к блокировке"
          className="mt-2 h-16 w-full resize-none rounded-[10px] border border-[#e8e4dc] bg-[#faf9f5] p-2.5 text-[.82rem] outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#e8e4dc] px-3 py-1.5 text-[.76rem] font-bold">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ reason, comment: comment.trim() })}
            className="rounded-[10px] border border-[#ebcdc9] px-3 py-1.5 text-[.76rem] font-bold text-[#c4574e]"
          >
            Заблокировать
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Супер-админский блок ─────────────────────────────────────────────────────

/**
 * Пароль вводится в КАЖДОМ запросе, а не «разблокирует панель на сессию»:
 * бэкенд иначе и не примет. Открытая вкладка не должна быть достаточным
 * условием для смены телефона или тарифа чужого аккаунта.
 */
function SuperadminBlock({
  userId,
  plan,
  phone,
  onDone,
}: {
  userId: string;
  plan: string;
  phone: string;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [nextPhone, setNextPhone] = useState(phone);
  const [nextPlan, setNextPlan] = useState(plan);

  const changePhone = useMutation({
    mutationFn: () => api.patch(`${API}/users/${userId}/phone`, { password, phone: nextPhone }),
    onSuccess: () => { onDone(); toast.success('Телефон изменён · записано в аудит'); },
    onError: () => toast.error('Пароль не подошёл'),
  });
  const changePlan = useMutation({
    mutationFn: () => api.patch(`${API}/users/${userId}/plan`, { password, plan: nextPlan }),
    onSuccess: () => { onDone(); toast.success('Тариф изменён · записано в аудит'); },
    onError: () => toast.error('Пароль не подошёл'),
  });

  return (
    <div className="space-y-2 rounded-xl border border-[#e8e4dc] bg-[#faf9f5] p-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Ваш пароль (повторно)"
        aria-label="Пароль администратора для подтверждения"
        className="w-full rounded-lg border border-[#e8e4dc] bg-white px-2.5 py-1.5 text-[.78rem] outline-none"
      />
      <div className="flex gap-1.5">
        <input value={nextPhone} onChange={(e) => setNextPhone(e.target.value)} aria-label="Новый телефон" className="w-full rounded-lg border border-[#e8e4dc] bg-white px-2.5 py-1.5 text-[.78rem]" />
        <button type="button" disabled={!password} onClick={() => changePhone.mutate()} className="whitespace-nowrap rounded-lg border border-[#e8e4dc] bg-white px-2 py-1 text-[.72rem] font-bold disabled:opacity-40">
          Телефон
        </button>
      </div>
      <div className="flex gap-1.5">
        <input value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} aria-label="Новый тариф" className="w-full rounded-lg border border-[#e8e4dc] bg-white px-2.5 py-1.5 text-[.78rem]" />
        <button type="button" disabled={!password} onClick={() => changePlan.mutate()} className="whitespace-nowrap rounded-lg border border-[#e8e4dc] bg-white px-2 py-1 text-[.72rem] font-bold disabled:opacity-40">
          Тариф
        </button>
      </div>
      <p className="text-[.66rem] leading-relaxed text-[#9a96a8]">Каждое действие пишется в журнал аудита со старым и новым значением.</p>
    </div>
  );
}

// ─── Вкладка шаблонов ─────────────────────────────────────────────────────────

function TemplatesTab({ templates, onSaved }: { templates: Template[]; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const create = useMutation({
    mutationFn: () => api.post(`${API}/templates`, { title, body }),
    onSuccess: () => { setTitle(''); setBody(''); onSaved(); toast.success('Шаблон сохранён'); },
    onError: () => toast.error('Не удалось сохранить'),
  });

  return (
    <div className="max-w-[640px] flex-1 overflow-auto p-4">
      {templates.map((t) => (
        <div key={t.id} className="mb-2.5 rounded-xl border border-[#e8e4dc] bg-white p-3">
          <b className="text-[.85rem]">{t.title}</b>
          <p className="mt-0.5 text-[.78rem] text-[#6a6580]">{t.body}</p>
        </div>
      ))}
      <div className="rounded-xl border border-dashed border-[#e8e4dc] bg-white p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
          aria-label="Название шаблона"
          className="mb-2 w-full rounded-lg border border-[#e8e4dc] bg-[#faf9f5] px-2.5 py-1.5 text-[.82rem] outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Текст шаблона"
          aria-label="Текст шаблона"
          className="mb-2 h-20 w-full resize-none rounded-lg border border-[#e8e4dc] bg-[#faf9f5] px-2.5 py-1.5 text-[.82rem] outline-none"
        />
        <button
          type="button"
          disabled={!title.trim() || !body.trim()}
          onClick={() => create.mutate()}
          className="rounded-[10px] bg-[#9c5e6c] px-3 py-1.5 text-[.76rem] font-bold text-white disabled:opacity-40"
        >
          + Новый шаблон
        </button>
      </div>
    </div>
  );
}
