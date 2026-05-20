'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  return `${Math.floor(h / 24)} дн`;
}

const TYPE_ICON: Record<string, string> = {
  message_new:           '💬',
  medication_reminder:   '💊',
  payment_confirm:       '💳',
  appointment_reminder:  '📅',
  checkup_result:        '🧬',
  outbreak_alert:        '🗺️',
  subscription_expiring: '⏰',
  order_status:          '📦',
  family_request:        '👨‍👩‍👦',
  action_required:       '✅',
  admin_broadcast:       '📢',
  doctor_verification:   '🩺',
  habit_reminder:        '🌿',
  ai_insight:            '🤖',
  streak:                '🔥',
};

export function NotificationBell({ locale }: { locale: string }) {
  const router = useRouter();
  const [count, setCount]       = useState(0);
  const [open, setOpen]         = useState(false);
  const [items, setItems]       = useState<NotifItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30 s
  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setCount(j.count ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const r = await fetch('/api/proxy/notifications?limit=5', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setItems(j.data ?? []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleRead(item: NotifItem) {
    if (!item.isRead) {
      await fetch(`/api/proxy/notifications/${item.id}/read`, { method: 'PUT' }).catch(() => {});
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (item.link) router.push(`/${locale}${item.link}`);
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center hover:bg-white transition-colors"
        aria-label="Уведомления"
      >
        <Bell className="w-4 h-4 text-navy" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-pink-500 flex items-center justify-center text-white text-[10px] font-bold px-1 leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-[360px] max-h-[400px] overflow-y-auto bg-white rounded-2xl border border-[#e8e4dc] shadow-lg"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0ece4]">
            <span className="text-sm font-semibold text-navy">Уведомления</span>
            <Link
              href={`/${locale}/notifications`}
              onClick={() => setOpen(false)}
              className="text-xs text-pink-500 font-medium hover:underline"
            >
              Показать все
            </Link>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center h-20 text-sm text-[#9a96a8]">
              Загрузка...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 gap-1 text-sm text-[#9a96a8]">
              <span>🔔</span>
              <span>Нет новых уведомлений</span>
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleRead(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-[#f0ece4] last:border-0 transition-colors hover:bg-[#fdf8f0] ${
                      !n.isRead ? 'bg-[#fdf8f0]' : 'bg-white'
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 flex-shrink-0 w-2">
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                    </div>
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-xl bg-[#f5f2ec] flex items-center justify-center flex-shrink-0 text-base">
                      {n.icon ?? TYPE_ICON[n.type] ?? '🔔'}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug truncate ${!n.isRead ? 'font-semibold text-navy' : 'font-medium text-[#5a567a]'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-[#9a96a8] mt-0.5 line-clamp-1">{n.body}</p>
                    </div>
                    {/* Time */}
                    <span className="text-[10px] text-[#bbb8cc] flex-shrink-0 mt-0.5">{relTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
