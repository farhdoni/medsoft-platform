'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/messenger/Avatar';
import { displayName, formatListTime, previewOf } from '@/components/messenger/format';
import type { ApiEnvelope, MessengerConversation, MessengerUser } from '@/components/messenger/types';
import { SUPPORT_NICKNAME } from '@/components/messenger/types';

const PROXY = '/api/proxy';
const POLL_MS = 5_000;

type Segment = 'ai' | 'people' | 'help';

export function MessengerHubClient({ locale }: { locale: string }) {
  const router = useRouter();

  const [segment, setSegment] = useState<Segment>('people');
  const [nickname, setNickname] = useState<string | null>(null);
  const [convs, setConvs] = useState<MessengerConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState<MessengerUser | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Own @username for the header pill.
  useEffect(() => {
    fetch(`${PROXY}/users`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ApiEnvelope<{ nickname: string | null }> | null) => {
        setNickname(j?.data?.nickname ?? null);
      })
      .catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/messaging/conversations`);
      if (!res.ok) return;
      const json = (await res.json()) as ApiEnvelope<MessengerConversation[]>;
      setConvs(json.data ?? []);
    } catch {
      /* keep the last good list — a dropped poll should not blank the screen */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(id);
  }, [loadConversations]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`${PROXY}/messaging/search?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as ApiEnvelope<MessengerUser | null>;
      setFound(res.ok ? json.data ?? null : null);
    } catch {
      setFound(null);
    } finally {
      setSearching(false);
    }
  }

  /** Opens the official support conversation, resolving it by nickname. */
  async function openSupport() {
    setStarting(true);
    try {
      const res = await fetch(`${PROXY}/messaging/search?q=@${SUPPORT_NICKNAME}`);
      const json = (await res.json()) as ApiEnvelope<MessengerUser | null>;
      const support = json.data;
      if (!support) {
        setNotice('Поддержка временно недоступна');
        return;
      }
      await openConversationWith(support.id);
    } catch {
      setNotice('Поддержка временно недоступна');
    } finally {
      setStarting(false);
    }
  }

  async function openConversationWith(userId: string) {
    setStarting(true);
    try {
      const res = await fetch(`${PROXY}/messaging/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = (await res.json()) as ApiEnvelope<MessengerConversation> & { code?: string };
      if (!res.ok) {
        // 'restricted' is the API's code for someone who only accepts
        // messages from people they already talk to.
        setNotice(json.code === 'restricted'
          ? 'Пользователь ограничил новые сообщения'
          : 'Не удалось открыть диалог');
        return;
      }
      const convId = json.data?.id;
      if (convId) router.push(`/${locale}/messenger/${convId}`);
    } catch {
      /* stay put; the user can retry */
    } finally {
      setStarting(false);
    }
  }

  function selectSegment(next: Segment) {
    if (next === 'ai') {
      router.push(`/${locale}/ai-chat`);
      return;
    }
    setSegment(next);
  }

  const segments: { id: Segment; label: string }[] = [
    { id: 'ai', label: 'AI' },
    { id: 'people', label: 'Люди' },
    { id: 'help', label: 'Помощь' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold text-app-t1 leading-tight">Центр общения</h1>
            {nickname ? (
              <span
                className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'var(--accent-light, #f0d4dc)', color: 'var(--accent-dark, #9c5e6c)' }}
              >
                @{nickname}
              </span>
            ) : (
              <span
                className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-dashed"
                style={{ borderColor: 'var(--accent, #cc8a96)', color: 'var(--accent-dark, #9c5e6c)' }}
                title="Появится в настройках чата"
              >
                задать @имя
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label="Настройки чата"
            onClick={() => router.push(`/${locale}/messenger/settings`)}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
            style={{ background: '#fff', border: '1px solid #e8e4dc' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="5" r="1.8" fill="#6a6580" />
              <circle cx="12" cy="12" r="1.8" fill="#6a6580" />
              <circle cx="12" cy="19" r="1.8" fill="#6a6580" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-2">
        <form onSubmit={runSearch}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#9a96a8" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" stroke="#9a96a8" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) { setSearched(false); setFound(null); }
              }}
              inputMode="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Поиск по имени или ID…"
              aria-label="Поиск по имени или ID"
              className="w-full rounded-2xl bg-white text-sm text-app-t1 placeholder:text-app-t3 outline-none"
              style={{ border: '1px solid #e8e4dc', padding: '11px 12px 11px 36px' }}
            />
          </div>
        </form>

        {searched && (
          <div className="mt-2">
            {searching ? (
              <div className="text-xs text-app-t3 px-1 py-2">Ищем…</div>
            ) : found ? (
              <div
                className="bg-white rounded-2xl p-3 flex items-center gap-3"
                style={{ border: '1px solid #e8e4dc' }}
              >
                <Avatar user={found} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-app-t1 truncate">{displayName(found)}</p>
                  {found.nickname && <p className="text-xs text-app-t3 truncate">@{found.nickname}</p>}
                </div>
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => openConversationWith(found.id)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white active:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--accent-dark, #9c5e6c)' }}
                >
                  {starting ? '…' : 'Написать'}
                </button>
              </div>
            ) : (
              <div
                className="bg-white rounded-2xl p-3 text-center"
                style={{ border: '1px solid #e8e4dc' }}
              >
                <p className="text-sm text-app-t1 font-medium">Никого не нашли.</p>
                <p className="text-xs text-app-t3 mt-0.5">Проверьте точный @username</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Segments ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #e8e4dc' }}
          role="tablist"
          aria-label="Разделы общения"
        >
          {segments.map((s) => {
            const active = s.id === segment;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectSegment(s.id)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={
                  active
                    ? { background: 'var(--accent-dark, #9c5e6c)', color: '#fff' }
                    : { background: 'transparent', color: '#6a6580' }
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {segment === 'help' ? (
          <HelpTab starting={starting} onWriteSupport={openSupport} />
        ) : loading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-3 flex items-center gap-3 animate-pulse" style={{ border: '1px solid #e8e4dc' }}>
                <div className="w-12 h-12 rounded-full bg-[#f0eeea]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-[#f0eeea]" />
                  <div className="h-3 w-2/3 rounded bg-[#f0eeea]" />
                </div>
              </div>
            ))}
          </div>
        ) : convs.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center" style={{ border: '1px solid #e8e4dc' }}>
            <div className="text-3xl mb-2" aria-hidden="true">💬</div>
            <p className="text-sm font-semibold text-app-t1">Пока нет диалогов</p>
            <p className="text-xs text-app-t3 mt-1">Найдите собеседника по @имени</p>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--accent-dark, #9c5e6c)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
                <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-semibold">строка поиска сверху</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {convs.map((conv) => {
              const msg = conv.lastMessage;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => router.push(`/${locale}/messenger/${conv.id}`)}
                  className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 text-left active:opacity-80 transition-opacity"
                  style={{ border: '1px solid #e8e4dc' }}
                >
                  <Avatar user={conv.participant} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-app-t1 truncate">
                        {displayName(conv.participant)}
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-app-t3">
                        {formatListTime(conv.lastMessageAt ?? msg?.createdAt ?? null)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-app-t2 truncate">
                        {msg
                          ? previewOf(msg.content, msg.type, !!msg.attachmentUrl)
                          : 'Нет сообщений'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span
                          className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                          style={{ background: 'var(--accent-dark, #9c5e6c)' }}
                        >
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {notice && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-28 z-40 pointer-events-none" role="status">
          <span className="px-4 py-2 rounded-full text-xs text-white shadow-lg" style={{ background: 'rgba(42,37,64,.92)' }}>
            {notice}
          </span>
        </div>
      )}
    </div>
  );
}


// ─── Help ─────────────────────────────────────────────────────────────────────

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Как найти врача?',
    a: 'Откройте раздел «Врачи» в каталоге: там можно отфильтровать специалистов по специализации и посмотреть профиль. Из профиля врача есть кнопка «Написать» — она открывает диалог прямо здесь, в чате.',
  },
  {
    q: 'Как записаться на приём?',
    a: 'В профиле врача нажмите «Записаться» и выберите свободное время в расписании. Подтверждение придёт уведомлением, а напоминание — заранее до приёма.',
  },
  {
    q: 'Как изменить @имя?',
    a: 'Ваш @username виден в шапке «Центра общения». Смена имени появится в настройках профиля в ближайшем обновлении — пока напишите нам сюда, и мы поменяем вручную.',
  },
  {
    q: 'Как заблокировать пользователя?',
    a: 'Откройте диалог, нажмите ⋮ в правом верхнем углу и выберите «Заблокировать». После этого ни он вам, ни вы ему написать не сможете. Снять блокировку можно в «Настройках чата» → «Приватность».',
  },
  {
    q: 'Что делать при ошибке?',
    a: 'Попробуйте обновить страницу — большинство сбоев связи проходят сами. Если ошибка повторяется, напишите нам в поддержку и приложите скриншот: так мы разберёмся быстрее.',
  },
  {
    q: 'Безопасно ли писать здесь о здоровье?',
    a: 'Чат защищён вашей учётной записью, но это обычная переписка, а не медицинская карта. Не отправляйте в открытый чат results анализов и документы, без которых можно обойтись, и помните: чат не заменяет очную консультацию.',
  },
];

function HelpTab({ starting, onWriteSupport }: { starting: boolean; onWriteSupport: () => void }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onWriteSupport}
        disabled={starting}
        className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 text-left active:opacity-80 disabled:opacity-60"
        style={{ border: '1px solid #e8e4dc' }}
      >
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-light, #f0d4dc)' }}
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#9c5e6c" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3.5" stroke="#9c5e6c" strokeWidth="1.8" />
            <path d="m5.6 5.6 3.9 3.9M18.4 5.6l-3.9 3.9M5.6 18.4l3.9-3.9M18.4 18.4l-3.9-3.9" stroke="#9c5e6c" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-app-t1">Написать в поддержку</span>
          <span className="block text-xs text-app-t3">Отвечаем в чате</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="#9a96a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide px-1 pb-1.5 text-app-t3">Частые вопросы</p>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e4dc' }}>
          {FAQ.map((item, i) => {
            const expanded = open === i;
            return (
              <div key={item.q} style={{ borderTop: i === 0 ? undefined : '1px solid #f0eeea' }}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left active:bg-[#faf9f7]"
                >
                  <span className="flex-1 text-sm text-app-t1">{item.q}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                  >
                    <path d="m6 9 6 6 6-6" stroke="#9a96a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {expanded && (
                  <p className="px-4 pb-3 -mt-1 text-xs leading-5 text-app-t2">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}