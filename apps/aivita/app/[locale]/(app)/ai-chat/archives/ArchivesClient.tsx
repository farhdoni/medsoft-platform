'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchiveSummary {
  id: number;
  title: string;
  messageCount: number;
  createdAt: string;
}

interface ArchiveMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ArchiveFull extends ArchiveSummary {
  messages: ArchiveMessage[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ru', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

// ─── ArchivesClient ───────────────────────────────────────────────────────────

export function ArchivesClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [archives, setArchives] = useState<ArchiveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ArchiveFull | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/proxy/ai-chat/archives')
      .then(r => r.ok ? r.json() as Promise<{ data: ArchiveSummary[] }> : null)
      .then(json => { if (json?.data) setArchives(json.data); })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openArchive(id: number) {
    setLoadingId(id);
    try {
      const r = await fetch(`/api/proxy/ai-chat/archives/${id}`);
      if (r.ok) {
        const json = await r.json() as { data: ArchiveFull };
        setViewing(json.data);
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteArchive(id: number) {
    setDeletingId(id);
    try {
      await fetch(`/api/proxy/ai-chat/archives/${id}`, { method: 'DELETE' });
      setArchives(prev => prev.filter(a => a.id !== id));
      if (viewing?.id === id) setViewing(null);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  // ── Viewing a single archive ───────────────────────────────────────────────
  if (viewing) {
    return (
      <div
        className="flex flex-col bg-[rgb(var(--bg-base-1))]"
        style={{ height: '100dvh', maxWidth: 480, margin: '0 auto' }}
      >
        <header
          className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: '#fff', borderColor: '#e8e4dc' }}
        >
          <button
            onClick={() => setViewing(null)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#f4f3ef' }}
            aria-label="Назад"
          >
            <ChevronLeft className="w-5 h-5" style={{ color: '#2a2540' }} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold leading-tight truncate" style={{ color: '#2a2540' }}>{viewing.title}</p>
            <p className="text-[10px]" style={{ color: '#9a96a8' }}>{fmtDate(viewing.createdAt)} · {viewing.messageCount} сообщ.</p>
          </div>
          <button
            onClick={() => setConfirmDeleteId(viewing.id)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition hover:opacity-80"
            style={{ background: '#fde8e8' }}
            aria-label="Удалить архив"
          >
            <Trash2 className="w-4 h-4" style={{ color: '#c0392b' }} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {viewing.messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm mb-1" style={{ background: '#e8e4f8' }}>
                  🤖
                </div>
              )}
              <div className={`flex flex-col gap-1 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 ${m.role === 'user' ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
                  style={m.role === 'user'
                    ? { background: 'var(--accent, #9c5e6c)', color: '#fff' }
                    : { background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }
                  }
                >
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>

        {/* Confirm delete */}
        {confirmDeleteId !== null && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setConfirmDeleteId(null)}
          >
            <div
              className="w-full max-w-[480px] rounded-t-3xl px-6 pt-6 pb-10 space-y-4"
              style={{ background: '#fff' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-2" />
              <h3 className="text-[18px] font-extrabold text-center" style={{ color: '#2a2540' }}>Удалить архив?</h3>
              <p className="text-[14px] text-center" style={{ color: '#9a96a8' }}>Это действие нельзя отменить.</p>
              <button
                onClick={() => void deleteArchive(confirmDeleteId)}
                disabled={deletingId !== null}
                className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: '#ef4444' }}
              >
                {deletingId !== null ? '...' : '🗑 Удалить'}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="w-full py-3.5 rounded-2xl text-[15px] font-bold transition active:scale-95"
                style={{ background: '#f4f3ef', color: '#2a2540' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Archives list ──────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-[rgb(var(--bg-base-1))]"
      style={{ minHeight: '100dvh', maxWidth: 480, margin: '0 auto' }}
    >
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10"
        style={{ background: '#fff', borderColor: '#e8e4dc' }}
      >
        <button
          onClick={() => router.push(`/${locale}/ai-chat`)}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#f4f3ef' }}
          aria-label="Назад"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: '#2a2540' }} aria-hidden="true" />
        </button>
        <div>
          <p className="text-[16px] font-extrabold leading-tight" style={{ color: '#2a2540' }}>📂 Архивы чатов</p>
          {!loading && <p className="text-[11px]" style={{ color: '#9a96a8' }}>{archives.length} архивов</p>}
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent, #9c5e6c)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && archives.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">📂</span>
            <p className="text-[16px] font-bold" style={{ color: '#2a2540' }}>Архивов пока нет</p>
            <p className="text-[13px] mt-2" style={{ color: '#9a96a8' }}>
              Архивируйте чат через меню ⋯ в AI Ассистенте
            </p>
            <button
              onClick={() => router.push(`/${locale}/ai-chat`)}
              className="mt-6 px-6 py-3 rounded-2xl text-[14px] font-bold text-white transition active:scale-95"
              style={{ background: 'var(--accent, #9c5e6c)' }}
            >
              Открыть чат
            </button>
          </div>
        )}

        {archives.map(a => (
          <div
            key={a.id}
            className="rounded-2xl p-4 flex items-start gap-3 transition active:scale-[0.98]"
            style={{ background: '#fff', border: '1px solid #e8e4dc' }}
          >
            {/* Archive info — clickable */}
            <button
              className="flex-1 text-left"
              onClick={() => void openArchive(a.id)}
              disabled={loadingId === a.id}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #e8e4f8, #f0e4f8)' }}
                >
                  {loadingId === a.id ? (
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent, #9c5e6c)', borderTopColor: 'transparent' }} />
                  ) : '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold leading-snug line-clamp-2" style={{ color: '#2a2540' }}>{a.title}</p>
                  <p className="text-[11px] mt-1" style={{ color: '#9a96a8' }}>
                    {fmtDate(a.createdAt)} · {a.messageCount} сообщ.
                  </p>
                </div>
              </div>
            </button>

            {/* Delete button */}
            <button
              onClick={() => setConfirmDeleteId(a.id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition hover:opacity-80"
              style={{ background: '#fde8e8' }}
              aria-label="Удалить архив"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#c0392b' }} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm delete */}
      {confirmDeleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl px-6 pt-6 pb-10 space-y-4"
            style={{ background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-2" />
            <h3 className="text-[18px] font-extrabold text-center" style={{ color: '#2a2540' }}>Удалить архив?</h3>
            <p className="text-[14px] text-center" style={{ color: '#9a96a8' }}>Это действие нельзя отменить.</p>
            <button
              onClick={() => void deleteArchive(confirmDeleteId)}
              disabled={deletingId !== null}
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white transition active:scale-95 disabled:opacity-60"
              style={{ background: '#ef4444' }}
            >
              {deletingId !== null ? '...' : '🗑 Удалить'}
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold transition active:scale-95"
              style={{ background: '#f4f3ef', color: '#2a2540' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
