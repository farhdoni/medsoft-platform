'use client';
// ChatsListClient — список чатов с врачами.
// Кастомный sticky header убран: TopBar из PageShell обеспечивает SOS+logo+nav.
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const PROXY = '/api/proxy';

interface OtherUser { id: string; name: string; role: string; specialization?: string }
interface LastMessage { type: string; content?: string; attachmentName?: string; createdAt: string }
interface Conv { id: string; status: string; lastMessageAt?: string; otherUser: OtherUser | null; lastMessage: LastMessage | null; unreadCount: number }

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 168) return d.toLocaleDateString('ru', { weekday: 'short' });
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}
function previewMsg(m: LastMessage | null) {
  if (!m) return 'Начните переписку';
  if (m.type === 'prescription') return '💊 Назначение';
  if (m.type === 'referral') return '🧪 Направление';
  if (m.type === 'image') return '📷 Фото';
  if (m.type === 'audio') return '🎤 Голосовое';
  if (m.type === 'file') return `📄 ${m.attachmentName ?? 'Файл'}`;
  return m.content ?? '';
}

export function ChatsListClient() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${PROXY}/conversations`).then(r => r.json())
      .then(j => { setConvs(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      fetch(`${PROXY}/conversations`).then(r => r.json()).then(j => setConvs(j.data ?? [])).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-dark)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div>
      {/* Section title — replaces the removed sticky header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold" style={{ color: '#2a2540' }}>Мои чаты</h1>
        <p className="text-xs mt-0.5" style={{ color: '#9a96a8' }}>Переписка с врачами</p>
      </div>

      {convs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-semibold text-[#2a2540] mb-1">Нет чатов</p>
          <p className="text-sm text-[#9a96a8] mb-6">Найдите врача и начните переписку</p>
          <Link href={`/${locale}/doctors`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent-dark)' }}>
            🔍 Найти врача
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {convs.map(conv => (
            <button key={conv.id}
              onClick={() => router.push(`/${locale}/chats/${conv.id}`)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 text-left active:opacity-80 transition-opacity"
              style={{ border: '1px solid #e8e4dc' }}>
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #6BA3D6, #3a6fa0)' }}>
                  {initials(conv.otherUser?.name ?? '?')}
                </div>
                {conv.status === 'active' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-semibold text-[#2a2540] text-sm truncate">Dr. {conv.otherUser?.name ?? 'Врач'}</p>
                  <span className="text-[10px] text-[#9a96a8] flex-shrink-0 ml-2">
                    {fmtTime(conv.lastMessage?.createdAt ?? conv.lastMessageAt)}
                  </span>
                </div>
                {conv.otherUser?.specialization && (
                  <p className="text-[11px] text-[#9a96a8] mb-0.5">{conv.otherUser.specialization}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#9a96a8] truncate flex-1">{previewMsg(conv.lastMessage)}</p>
                  {conv.unreadCount > 0 && (
                    <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ background: 'var(--accent-dark)' }}>
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
