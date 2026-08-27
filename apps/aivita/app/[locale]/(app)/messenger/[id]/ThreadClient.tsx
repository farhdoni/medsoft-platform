'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/messenger/Avatar';
import { EmojiPanel } from '@/components/messenger/EmojiPanel';
import { dayKey, displayName, formatBubbleTime, formatDayLabel } from '@/components/messenger/format';
import type {
  ApiEnvelope,
  MessengerConversation,
  MessengerMessage,
  MessengerUser,
  ReactionAggregate,
} from '@/components/messenger/types';

const PROXY = '/api/proxy';
const PAGE = 40;
const POLL_MS = 4_000;
const BANNER_KEY = 'av-chat-privacy-banner-dismissed';
const EMOJI_CHOICES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ThreadClient({
  locale,
  conversationId,
  meId,
}: {
  locale: string;
  conversationId: string;
  meId: string;
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [partner, setPartner] = useState<MessengerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<MessengerMessage | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [banner, setBanner] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stickToBottom = useRef(true);

  // Transient toasts clear themselves so stubs do not leave litter on screen.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  // Privacy banner — dismissal is per-device, so localStorage is the right home.
  useEffect(() => {
    try {
      setBanner(localStorage.getItem(BANNER_KEY) !== '1');
    } catch {
      setBanner(true);
    }
  }, []);

  function dismissBanner() {
    setBanner(false);
    try { localStorage.setItem(BANNER_KEY, '1'); } catch { /* private mode */ }
  }

  const markRead = useCallback(() => {
    fetch(`${PROXY}/messaging/conversations/${conversationId}/read`, { method: 'PUT' }).catch(() => {});
  }, [conversationId]);

  // The thread endpoint returns messages only; the partner comes from the
  // conversation list, which is where the API exposes the other participant.
  const loadPartner = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/messaging/conversations`);
      if (!res.ok) return;
      const json = (await res.json()) as ApiEnvelope<MessengerConversation[]>;
      const conv = (json.data ?? []).find((c) => c.id === conversationId);
      if (conv) setPartner(conv.participant);
    } catch { /* header falls back to a neutral label */ }
  }, [conversationId]);

  const loadInitial = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/messaging/conversations/${conversationId}/messages?limit=${PAGE}`);
      if (!res.ok) { setLoading(false); return; }
      const json = (await res.json()) as ApiEnvelope<MessengerMessage[]>;
      const rows = json.data ?? [];
      setMessages(rows);
      if (rows.length < PAGE) setExhausted(true);
    } catch { /* leave empty; polling will retry */ }
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    loadPartner();
    loadInitial().then(markRead);
  }, [loadPartner, loadInitial, markRead]);

  // Poll for new messages with ?after=<newest createdAt>, the cursor contract
  // the API exposes. Appends only what is genuinely new.
  useEffect(() => {
    const id = setInterval(async () => {
      const newest = messages.length ? messages[messages.length - 1].createdAt : null;
      const url = newest
        ? `${PROXY}/messaging/conversations/${conversationId}/messages?after=${encodeURIComponent(newest)}`
        : `${PROXY}/messaging/conversations/${conversationId}/messages?limit=${PAGE}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as ApiEnvelope<MessengerMessage[]>;
        const fresh = json.data ?? [];
        if (fresh.length === 0) return;
        let added: MessengerMessage[] = [];
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          added = fresh.filter((m) => !seen.has(m.id));
          return added.length ? [...prev, ...added] : prev;
        });
        if (added.some((m) => m.senderId !== meId)) markRead();
      } catch { /* transient */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [conversationId, messages, meId, markRead]);

  // Land on the newest message when the thread opens, and follow new arrivals
  // only while the reader is already at the bottom — never yank them out of
  // history they are scrolling through.
  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Opening the emoji panel shortens the scroller; keep the last message visible.
  useEffect(() => {
    if (emojiOpen && stickToBottom.current) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
    }
  }, [emojiOpen]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60) loadOlder();
  }

  async function loadOlder() {
    if (loadingOlder || exhausted || messages.length === 0) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await fetch(
        `${PROXY}/messaging/conversations/${conversationId}/messages?limit=${PAGE}&offset=${messages.length}`,
      );
      if (res.ok) {
        const json = (await res.json()) as ApiEnvelope<MessengerMessage[]>;
        const older = json.data ?? [];
        if (older.length === 0) setExhausted(true);
        else {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...older.filter((m) => !seen.has(m.id)), ...prev];
          });
          // Hold the reading position steady as content grows above.
          requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevHeight;
          });
        }
        if (older.length < PAGE) setExhausted(true);
      }
    } catch { /* transient */ }
    finally { setLoadingOlder(false); }
  }

  /** Insert at the caret so the panel can be used mid-sentence, not just at the end. */
  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) { setDraft((d) => d + emoji); return; }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function backspace() {
    const el = inputRef.current;
    if (!el) { setDraft((d) => [...d].slice(0, -1).join('')); return; }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    if (start === 0 && start === end) return;
    // Step back by a full code point so an emoji is deleted whole.
    const cut = start === end ? [...draft.slice(0, start)].pop()?.length ?? 1 : 0;
    const from = start === end ? start - cut : start;
    const next = draft.slice(0, from) + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, from);
    });
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setEmojiOpen(false);
    try {
      const res = await fetch(`${PROXY}/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, ...(replyTo ? { replyToId: replyTo.id } : {}) }),
      });
      const json = (await res.json()) as ApiEnvelope<MessengerMessage> & { error?: string };
      if (!res.ok) {
        setNotice(json?.error ?? 'Не удалось отправить сообщение');
        return;
      }
      if (json.data) {
        // POST does not expand replyTo; attach the quote we already hold so the
        // bubble renders correctly without waiting for the next poll.
        const quoted = replyTo;
        setMessages((prev) => [
          ...prev,
          quoted
            ? {
                ...json.data,
                replyTo: {
                  id: quoted.id,
                  sender:
                    quoted.senderId === meId
                      ? { id: meId, nickname: null, name: 'Вы', avatarUrl: null }
                      : partner ?? { id: quoted.senderId, nickname: null, name: null, avatarUrl: null },
                  content: (quoted.content ?? '').slice(0, 120),
                },
              }
            : json.data,
        ]);
      }
      setDraft('');
      setReplyTo(null);
      stickToBottom.current = true;
    } catch {
      setNotice('Сеть недоступна');
    } finally {
      setSending(false);
    }
  }

  /** One reaction per user per message: same emoji again removes it. */
  async function toggleReaction(messageId: string, emoji: string) {
    setPicker(null);
    const before = messages;
    const target = messages.find((m) => m.id === messageId);
    const mine = target?.reactions?.find((r) => r.reacted);
    const removing = mine?.emoji === emoji;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: applyReaction(m.reactions ?? [], emoji, removing) } : m)),
    );

    try {
      const res = removing
        ? await fetch(`${PROXY}/messaging/messages/${messageId}/reactions`, { method: 'DELETE' })
        : await fetch(`${PROXY}/messaging/messages/${messageId}/reactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
          });
      if (!res.ok) throw new Error('reaction failed');
    } catch {
      setMessages(before); // roll back the optimistic update
      setNotice('Не удалось изменить реакцию');
    }
  }

  async function toggleBlock() {
    setMenuOpen(false);
    if (!partner) return;
    const next = !blocked;
    setBlocked(next);
    try {
      const res = next
        ? await fetch(`${PROXY}/messaging/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: partner.id }),
          })
        : await fetch(`${PROXY}/messaging/block/${partner.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('block failed');
      setNotice(next ? 'Пользователь заблокирован' : 'Блокировка снята');
    } catch {
      setBlocked(!next);
      setNotice('Не удалось изменить блокировку');
    }
  }

  async function submitReport() {
    const messageId = reportFor;
    const reason = reportReason.trim();
    if (!messageId || !reason) return;
    setReportFor(null);
    setReportReason('');
    try {
      const res = await fetch(`${PROXY}/messaging/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reason }),
      });
      setNotice(res.ok ? 'Жалоба отправлена' : 'Не удалось отправить жалобу');
    } catch {
      setNotice('Не удалось отправить жалобу');
    }
  }

  function startLongPress(messageId: string) {
    clearLongPress();
    longPressTimer.current = setTimeout(() => setPicker(messageId), 450);
  }
  function clearLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <div className="h-full flex flex-col overflow-hidden" onClick={() => { setMenuOpen(false); setPicker(null); }}>
      {/* ── Sub-header ─────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white"
        style={{ borderBottom: '1px solid #e8e4dc' }}
      >
        <button
          type="button"
          aria-label="Назад"
          onClick={() => router.push(`/${locale}/messenger`)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 18-6-6 6-6" stroke="#6a6580" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <Avatar user={partner} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app-t1 truncate">{displayName(partner)}</p>
          {partner?.nickname && <p className="text-[11px] text-app-t3 truncate">@{partner.nickname}</p>}
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            aria-label="Действия"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="5" r="1.8" fill="#6a6580" />
              <circle cx="12" cy="12" r="1.8" fill="#6a6580" />
              <circle cx="12" cy="19" r="1.8" fill="#6a6580" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-11 z-30 w-52 bg-white rounded-2xl overflow-hidden shadow-lg"
              style={{ border: '1px solid #e8e4dc' }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={toggleBlock}
                className="w-full text-left px-4 py-3 text-sm text-app-t1 active:bg-[#faf9f7]"
              >
                {blocked ? 'Разблокировать' : 'Заблокировать'}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!lastIncoming(messages, meId)}
                onClick={() => {
                  const target = lastIncoming(messages, meId);
                  setMenuOpen(false);
                  if (target) setReportFor(target.id);
                }}
                className="w-full text-left px-4 py-3 text-sm text-app-t1 active:bg-[#faf9f7] disabled:opacity-40"
                style={{ borderTop: '1px solid #f0eeea' }}
              >
                Пожаловаться
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Privacy banner ─────────────────────────────────────────────── */}
      {banner && (
        <div
          className="flex-shrink-0 mx-3 mt-2 rounded-2xl px-3 py-2 flex items-start gap-2"
          style={{ background: 'var(--accent-bg, #fdf5f7)', border: '1px solid var(--accent-light, #f0d4dc)' }}
        >
          <span aria-hidden="true" className="text-sm leading-5">⚠️</span>
          <p className="text-[11px] leading-4 flex-1" style={{ color: 'var(--accent-dark, #9c5e6c)' }}>
            Не делитесь чувствительными медицинскими данными в открытом чате
          </p>
          <button
            type="button"
            aria-label="Скрыть предупреждение"
            onClick={dismissBanner}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center active:opacity-60"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="var(--accent-dark, #9c5e6c)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {/* min-h-full + justify-end pins a short thread to the bottom, the way
            every messenger does it, while a long one still scrolls normally. */}
        <div className="min-h-full flex flex-col justify-end">
          {loadingOlder && <p className="text-center text-[11px] text-app-t3 pb-2">Загружаем…</p>}
          {loading ? (
            <p className="text-center text-xs text-app-t3 py-6">Открываем диалог…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-app-t3 py-6">Сообщений пока нет — напишите первым</p>
          ) : (
            messages.map((m, i) => {
              const own = m.senderId === meId;
              const showDay = i === 0 || dayKey(m.createdAt) !== dayKey(messages[i - 1].createdAt);
              const hasReactions = (m.reactions?.length ?? 0) > 0;
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 rounded-full text-[11px] text-app-t2 bg-white" style={{ border: '1px solid #e8e4dc' }}>
                        {formatDayLabel(m.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* items-end keeps the incoming avatar level with the bubble;
                      reactions hang off the bubble absolutely so they never
                      push it out of line. */}
                  <div
                    className={`flex items-end gap-2 ${own ? 'justify-end' : 'justify-start'}`}
                    style={{ marginBottom: hasReactions ? 18 : 8 }}
                  >
                    {!own && <Avatar user={partner} size={28} />}

                    <div className="relative max-w-[78%]">
                      <div
                        onDoubleClick={() => setPicker(m.id)}
                        onPointerDown={() => startLongPress(m.id)}
                        onPointerUp={clearLongPress}
                        onPointerLeave={clearLongPress}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 rounded-2xl select-none"
                        style={
                          own
                            ? { background: '#9c5e6c', color: '#fff', borderBottomRightRadius: 4 }
                            : { background: '#fff', color: '#2a2540', border: '1px solid #e8e4dc', borderBottomLeftRadius: 4 }
                        }
                      >
                        {m.replyTo && (
                          <div
                            className="mb-1.5 pl-2 py-0.5 rounded"
                            style={{
                              borderLeft: `3px solid ${own ? 'rgba(255,255,255,.65)' : 'var(--accent, #cc8a96)'}`,
                              background: own ? 'rgba(255,255,255,.12)' : '#faf9f7',
                            }}
                          >
                            <p className="text-[11px] font-semibold" style={{ opacity: own ? 0.95 : 1, color: own ? '#fff' : 'var(--accent-dark, #9c5e6c)' }}>
                              {m.replyTo.sender.id === meId ? 'Вы' : displayName(m.replyTo.sender)}
                            </p>
                            <p className="text-[11px] truncate" style={{ opacity: own ? 0.85 : 0.7 }}>
                              {m.replyTo.content ?? 'Сообщение удалено'}
                            </p>
                          </div>
                        )}

                        {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}

                        {/* Time sits bottom-right inside the bubble for both
                            sides; only outgoing carries the delivery tick. */}
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px]" style={{ opacity: own ? 0.75 : 0.45 }}>
                            {formatBubbleTime(m.createdAt)}
                          </span>
                          {own && (
                            // Single tick = delivered. A second "read" tick needs
                            // the partner's last_read_at, which the API does not
                            // expose yet.
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-label="Отправлено">
                              <path d="m5 13 4 4L19 7" stroke="#fff" strokeOpacity=".8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Reaction pills, overlapping the bubble's bottom edge. */}
                      {hasReactions && (
                        <div
                          className={`absolute flex flex-wrap gap-1 ${own ? 'right-2' : 'left-2'}`}
                          style={{ bottom: -11 }}
                        >
                          {m.reactions!.map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, r.emoji); }}
                              className="px-1.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 shadow-sm"
                              style={{
                                background: r.reacted ? 'var(--accent-light, #f0d4dc)' : '#fff',
                                border: `1px solid ${r.reacted ? 'var(--accent, #cc8a96)' : '#e8e4dc'}`,
                                color: '#2a2540',
                              }}
                            >
                              <span aria-hidden="true">{r.emoji}</span>
                              <span className="font-semibold">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Long-press / double-tap popover */}
                      {picker === m.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute -top-12 z-20 flex items-center gap-1 px-2 py-1.5 bg-white rounded-full shadow-lg ${own ? 'right-0' : 'left-0'}`}
                          style={{ border: '1px solid #e8e4dc' }}
                        >
                          {EMOJI_CHOICES.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              aria-label={`Реакция ${emoji}`}
                              onClick={() => toggleReaction(m.id, emoji)}
                              className="text-lg leading-none px-1 active:scale-90 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                          <span className="w-px h-5 mx-0.5" style={{ background: '#e8e4dc' }} aria-hidden="true" />
                          <button
                            type="button"
                            onClick={() => { setReplyTo(m); setPicker(null); }}
                            className="px-2 text-[11px] font-semibold whitespace-nowrap"
                            style={{ color: 'var(--accent-dark, #9c5e6c)' }}
                          >
                            Ответить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Reply preview ──────────────────────────────────────────────── */}
      {replyTo && (
        <div
          className="flex-shrink-0 mx-3 mb-1 px-3 py-2 rounded-xl flex items-center gap-2 bg-white"
          style={{ border: '1px solid #e8e4dc', borderLeft: '3px solid var(--accent, #cc8a96)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--accent-dark, #9c5e6c)' }}>
              Ответ · {replyTo.senderId === meId ? 'Вы' : displayName(partner)}
            </p>
            <p className="text-[11px] text-app-t2 truncate">{replyTo.content ?? 'Вложение'}</p>
          </div>
          <button
            type="button"
            aria-label="Отменить ответ"
            onClick={() => setReplyTo(null)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center active:opacity-60"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="#6a6580" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Composer ───────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-3 pt-1"
        style={{ paddingBottom: emojiOpen ? 4 : 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex items-end gap-1.5 bg-white rounded-2xl px-2 py-1.5"
          style={{ border: '1px solid #e8e4dc' }}
        >
          <button
            type="button"
            aria-label="Прикрепить файл"
            onClick={() => setNotice('Вложения — скоро')}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 opacity-50 active:opacity-80"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 19a2 2 0 0 1-3-3l8-8" stroke="#6a6580" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setEmojiOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder="Сообщение…"
            aria-label="Текст сообщения"
            className="flex-1 resize-none bg-transparent text-sm text-app-t1 placeholder:text-app-t3 outline-none py-1.5 max-h-28"
          />

          <button
            type="button"
            aria-label="Эмодзи"
            aria-pressed={emojiOpen}
            onClick={() => setEmojiOpen((v) => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-80"
            style={
              emojiOpen
                ? { background: 'var(--accent-light, #f0d4dc)' }
                : undefined
            }
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
            aria-label="Голосовое сообщение"
            onClick={() => setNotice('Голосовые — скоро')}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 opacity-50 active:opacity-80"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="#6a6580" strokeWidth="1.8" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#6a6580" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          {/* Always present, disabled while there is nothing to send. */}
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label="Отправить"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #cc8a96, #9c5e6c)',
              opacity: canSend ? 1 : 0.4,
              cursor: canSend ? 'pointer' : 'default',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2v6.4Z" fill="#fff" />
            </svg>
          </button>
        </div>
      </div>

      {emojiOpen && <EmojiPanel onPick={insertEmoji} onBackspace={backspace} />}

      {/* ── Report dialog ──────────────────────────────────────────────── */}
      {reportFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6" style={{ background: 'rgba(42,37,64,.35)' }} onClick={() => setReportFor(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-4" style={{ border: '1px solid #e8e4dc' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-app-t1">Пожаловаться на сообщение</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              placeholder="Опишите причину…"
              aria-label="Причина жалобы"
              className="mt-2 w-full resize-none rounded-xl text-sm text-app-t1 placeholder:text-app-t3 outline-none p-2"
              style={{ border: '1px solid #e8e4dc' }}
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { setReportFor(null); setReportReason(''); }} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ color: '#6a6580', border: '1px solid #e8e4dc' }}>
                Отмена
              </button>
              <button type="button" disabled={!reportReason.trim()} onClick={submitReport} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--accent-dark, #9c5e6c)' }}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transient notice ───────────────────────────────────────────── */}
      {notice && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 pointer-events-none" role="status">
          <span
            className="px-4 py-2 rounded-full text-xs text-white shadow-lg"
            style={{ background: 'rgba(42,37,64,.92)' }}
          >
            {notice}
          </span>
        </div>
      )}
    </div>
  );
}

/** Newest message from the other side — what "Пожаловаться" targets. */
function lastIncoming(messages: MessengerMessage[], meId: string): MessengerMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderId !== meId) return messages[i];
  }
  return null;
}

/**
 * Optimistic aggregate update. The API keeps one reaction per user per message,
 * so setting a new emoji also drops the caller's previous one.
 */
function applyReaction(
  current: ReactionAggregate[],
  emoji: string,
  removing: boolean,
): ReactionAggregate[] {
  const next = current
    .map((r) => (r.reacted ? { ...r, count: r.count - 1, reacted: false } : r))
    .filter((r) => r.count > 0);

  if (removing) return next;

  const hit = next.find((r) => r.emoji === emoji);
  if (hit) {
    return next.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r));
  }
  return [...next, { emoji, count: 1, reacted: true }];
}
