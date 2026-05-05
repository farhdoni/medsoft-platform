'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon3D, type Icon3DName } from './icons/Icon3D';
import type { AivitaSession } from '@/lib/auth/session';
import { signOut } from '@/app/[locale]/(app)/settings/actions';

interface MenuItem {
  icon: Icon3DName;
  softBg: string;
  title: string;
  subtitle?: string;
  href: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'family',   softBg: '#f0d4dc', title: 'Мой профиль',           subtitle: 'Возраст, болезни',     href: '/profile' },
  { icon: 'kit',      softBg: '#e0d8f0', title: 'Медицинский профиль',   subtitle: 'Аллергии, препараты',  href: '/profile' },
  { icon: 'chat',     softBg: '#d4e8d8', title: 'AI-чат',                subtitle: 'Помощник по здоровью', href: '/chat' },
  { icon: 'family',   softBg: '#d4dff0', title: 'Семья',                 subtitle: 'Поделиться доступом',  href: '/family' },
  { icon: 'shield',   softBg: '#f0d4dc', title: 'Конфиденциальность',                                      href: '/settings' },
  { icon: 'settings', softBg: '#e0d8f0', title: 'Настройки',             subtitle: 'Уведомления, язык',   href: '/settings' },
  { icon: 'sparkle',  softBg: '#d4e8d8', title: 'Помощь и поддержка',                                      href: '/settings' },
];

interface ProfileMenuProps {
  session?: AivitaSession | null;
  locale?: string;
}

export function ProfileMenu({ session, locale = 'ru' }: ProfileMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = session?.name ?? 'Пользователь';
  const email = session?.email ?? '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await signOut(locale);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #cc8a96 0%, #9889c4 100%)' }}
        aria-label="Меню профиля"
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-3 w-[280px] bg-white rounded-2xl overflow-hidden border z-50"
          style={{
            borderColor: '#e8e4dc',
            boxShadow: '0 16px 48px rgba(42, 37, 64, 0.18)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #e8e4dc' }}>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #cc8a96 0%, #9889c4 100%)' }}
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
          <div className="p-3" style={{ borderTop: '1px solid #e8e4dc' }}>
            <button
              onClick={handleLogout}
              className="w-full py-2 text-[13px] font-semibold rounded-xl transition-colors hover:bg-[#f0d4dc]/30"
              style={{ color: '#9a96a8' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#9c5e6c')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9a96a8')}
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
