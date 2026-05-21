'use client';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Settings2 } from 'lucide-react';
import { Icon3D, Icon3DName } from '@/components/cabinet/icons/Icon3D';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROXY = '/api/proxy';
const STORAGE_KEY = 'doctor-nav-config';
const DEFAULT_PINNED = ['home', 'patients', 'schedule', 'chats'];

type NavItem = {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: Icon3DName;
};

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'home',          label: 'Главная',       desc: 'Dashboard врача',            href: '/doctor-home',                 icon: 'home'    },
  { id: 'patients',      label: 'Пациенты',      desc: 'Список пациентов',           href: '/doctor-patients',             icon: 'family'  },
  { id: 'schedule',      label: 'Расписание',    desc: 'График приёмов',             href: '/doctor-schedule',             icon: 'steps'   },
  { id: 'chats',         label: 'Чаты',          desc: 'Сообщения с пациентами',     href: '/doctor-chats',                icon: 'chat'    },
  { id: 'appointments',  label: 'Приёмы',        desc: 'Запись и история приёмов',   href: '/doctor-appointments',         icon: 'kit'     },
  { id: 'prescriptions', label: 'Назначения',    desc: 'Назначения и рецепты',       href: '/doctor-prescriptions',        icon: 'pill'    },
  { id: 'ai',            label: 'AI-ассистент',  desc: 'Диагностика и анализ',       href: '/doctor-ai',                   icon: 'sparkle' },
  { id: 'scribe',        label: 'Скрайб',        desc: 'Запись и транскрипция',      href: '/doctor-scribe',               icon: 'report'  },
  { id: 'drug-checker',  label: 'Drug Checker',  desc: 'Совместимость препаратов',   href: '/doctor-drug-checker',         icon: 'shield'  },
  { id: 'profile',       label: 'Профиль',       desc: 'Личные данные и документы',  href: '/doctor-profile',              icon: 'doctor'  },
  { id: 'partnership',   label: 'Партнёрство',   desc: 'Планы и подписки',           href: '/doctor-settings/partnership', icon: 'plus'    },
  { id: 'earnings',      label: 'Заработок',     desc: 'Доход и выплаты',            href: '/doctor-settings/earnings',    icon: 'book'    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadPinned(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PINNED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PINNED;
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return DEFAULT_PINNED;
    const valid = arr
      .filter((id): id is string => typeof id === 'string')
      .filter(id => ALL_NAV_ITEMS.some(item => item.id === id))
      .slice(0, 4);
    return valid.length >= 1 ? valid : DEFAULT_PINNED;
  } catch {
    return DEFAULT_PINNED;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DoctorBottomNav({ locale = 'ru' }: { locale?: string }) {
  const pathname = usePathname();
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED);
  const [moreOpen, setMoreOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  // Load saved config after mount
  useEffect(() => {
    setPinnedIds(loadPinned());
  }, []);

  // Listen for storage changes (from settings page)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setPinnedIds(loadPinned());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Unread chats polling
  useEffect(() => {
    function fetchUnread() {
      fetch(`${PROXY}/conversations`)
        .then(r => r.json())
        .then(j => {
          const total = (j.data ?? []).reduce(
            (s: number, c: { unreadCount?: number }) => s + (c.unreadCount ?? 0),
            0
          );
          setChatUnread(total);
        })
        .catch(() => {});
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 30_000);
    return () => clearInterval(t);
  }, []);

  // Close bottom sheet on navigation
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const isActive = useCallback(
    (href: string) => !!pathname?.includes(href),
    [pathname]
  );

  const pinnedItems = ALL_NAV_ITEMS.filter(item => pinnedIds.includes(item.id));
  const moreItems   = ALL_NAV_ITEMS.filter(item => !pinnedIds.includes(item.id));

  return (
    <>
      {/* ── Bottom navigation bar ─────────────────────────── */}
      <div className="sticky bottom-0 w-full z-40 flex justify-center pb-4 pt-2 pointer-events-none">
        <nav
          className="flex items-center px-2 py-2 rounded-full border border-app-border pointer-events-auto"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 16px 48px rgba(42, 37, 64, 0.18)',
          }}
          aria-label="Навигация врача"
        >
          {pinnedItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={`/${locale}${item.href}`}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200"
                style={{
                  background: active ? 'rgba(107,163,214,0.12)' : 'transparent',
                  minWidth: 54,
                }}
              >
                <div className="relative">
                  <Icon3D name={item.icon} size={24} />
                  {item.id === 'chats' && chatUnread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background: '#6BA3D6' }}
                    >
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-semibold leading-none whitespace-nowrap"
                  style={{ color: active ? '#5580b0' : '#9a96a8' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* ── Ещё button ── */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95"
            style={{ minWidth: 54, background: 'transparent' }}
            aria-label="Ещё"
          >
            <span className="text-[22px] leading-none" style={{ color: '#9a96a8' }}>⋯</span>
            <span className="text-[10px] font-semibold leading-none" style={{ color: '#9a96a8' }}>
              Ещё
            </span>
          </button>
        </nav>
      </div>

      {/* ── Bottom sheet overlay ──────────────────────────── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.30)' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-base font-bold text-gray-800">Разделы</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Items grid */}
            <div className="px-4 pb-2 grid grid-cols-2 gap-2">
              {moreItems.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={`/${locale}${item.href}`}
                    className="flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95"
                    style={{
                      borderColor: active ? '#6BA3D6' : '#f0eee8',
                      background:  active ? 'rgba(107,163,214,0.08)' : '#fafaf8',
                    }}
                  >
                    <Icon3D name={item.icon} size={32} />
                    <div className="min-w-0">
                      <div
                        className="text-sm font-semibold leading-tight truncate"
                        style={{ color: active ? '#5580b0' : '#2a2540' }}
                      >
                        {item.label}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Settings nav link */}
            <div className="px-4 pt-1 pb-4">
              <Link
                href={`/${locale}/doctor-settings/navigation`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(107,163,214,0.12)' }}>
                  <Settings2 size={18} style={{ color: '#6BA3D6' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Настройки навигации</div>
                  <div className="text-[11px] text-gray-400">Выбрать иконки в баре</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
