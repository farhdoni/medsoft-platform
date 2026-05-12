'use client';
import * as React from 'react';
import Link from 'next/link';
import { Icon3D, type Icon3DName } from './icons/Icon3D';
import type { AivitaSession } from '@/lib/auth/session';

interface MenuItem {
  icon: Icon3DName;
  softBg: string;
  title: string;
  subtitle?: string;
  href: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'family',   softBg: 'var(--accent-light)', title: 'Мой профиль',           subtitle: 'Возраст, болезни',     href: '/profile' },
  { icon: 'kit',      softBg: 'var(--accent-bg-light)', title: 'Медицинский профиль',   subtitle: 'Аллергии, препараты',  href: '/profile' },
  { icon: 'heart',    softBg: 'var(--accent-light)', title: 'Биометрия',             subtitle: 'Показатели здоровья', href: '/vitals' },
  { icon: 'steps',    softBg: '#d4e8d8', title: 'Гаджеты',               subtitle: 'Трекеры и часы',     href: '/gadgets' },
  { icon: 'chat',     softBg: '#d4e8d8', title: 'AI-чат',                subtitle: 'Помощник по здоровью', href: '/chat' },
  { icon: 'family',   softBg: '#d4dff0', title: 'Семья',                 subtitle: 'Поделиться доступом',  href: '/family' },
  { icon: 'shield',   softBg: 'var(--accent-light)', title: 'Конфиденциальность',                                      href: '/settings' },
  { icon: 'settings', softBg: 'var(--accent-bg-light)', title: 'Настройки',             subtitle: 'Уведомления, язык',   href: '/settings' },
  { icon: 'sparkle',  softBg: '#d4e8d8', title: 'Помощь и поддержка',                                      href: '/settings' },
];

interface ProfileMenuProps {
  session?: AivitaSession | null;
  locale?: string;
}

export function ProfileMenu({ session, locale = 'ru' }: ProfileMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, right: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(o => !o);
  };

  const name = session?.name ?? 'Пользователь';
  const email = session?.email ?? '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network errors — cookie may already be invalid
    }
    // Fallback: clear cookies client-side (works for non-httpOnly)
    document.cookie = 'aivita_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'aivita_api=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'aivita_session=; path=/; domain=.aivita.uz; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'aivita_api=; path=/; domain=.aivita.uz; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = `/${locale}/sign-in`;
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity sm:w-10 sm:h-10"
        style={{ background: 'linear-gradient(135deg, var(--accent-rose-light) 0%, var(--accent) 100%)' }}
        aria-label="Меню профиля"
      >
        {initials}
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            width: 280,
            background: 'white',
            borderRadius: 16,
            border: '1px solid #e8e4dc',
            boxShadow: '0 16px 48px rgba(42, 37, 64, 0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #e8e4dc' }}>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--accent-rose-light) 0%, var(--accent) 100%)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate" style={{ color: '#2a2540' }}>{name}</p>
              <p className="text-[11px] truncate" style={{ color: '#9a96a8' }}>{email}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            {MENU_ITEMS.map((item, i) => (
              <Link
                key={i}
                href={`/${locale}${item.href}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-2 py-2 rounded-xl transition-colors"
                style={{ color: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,212,220,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                  style={{ background: item.softBg }}
                >
                  <Icon3D name={item.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#2a2540' }}>{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] truncate" style={{ color: '#9a96a8' }}>{item.subtitle}</p>
                  )}
                </div>
                <span style={{ color: '#9a96a8', fontSize: 16 }}>›</span>
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-app-border mt-1 pt-1 p-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm flex-shrink-0">
                🚪
              </div>
              <span className="text-sm font-medium">Выйти</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
