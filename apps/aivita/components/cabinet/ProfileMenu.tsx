'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon3D, type Icon3DName } from './icons/Icon3D';
import type { AivitaSession } from '@/lib/auth/session';

interface ProfileMenuProps {
  session?: AivitaSession | null;
  locale?: string;
}

const MENU_ITEMS: Array<{
  icon: Icon3DName;
  title: string;
  subtitle?: string;
  href: string;
}> = [
  { icon: 'family', title: 'Мой профиль', subtitle: 'Личные данные', href: '/profile' },
  { icon: 'kit', title: 'Мед. профиль', subtitle: 'Аллергии, препараты', href: '/profile' },
  { icon: 'family', title: 'Семья', subtitle: 'Поделиться доступом', href: '/family' },
  { icon: 'settings', title: 'Настройки', subtitle: 'Уведомления, язык', href: '/settings' },
];

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ session, locale = 'ru' }) => {
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
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    router.push(`/${locale}/sign-in`);
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
          className="absolute left-full ml-3 bottom-0 w-[280px] bg-white rounded-2xl border overflow-hidden z-50"
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
              <div className="text-sm font-bold truncate" style={{ color: '#2a2540' }}>{name}</div>
              <div className="text-[11px] truncate" style={{ color: '#9a96a8' }}>{email}</div>
            </div>
          </div>

          {/* Items */}
          <div className="p-2">
            {MENU_ITEMS.map((item, i) => (
              <Link
                key={i}
                href={`/${locale}${item.href}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-[#f0d4dc]/40"
              >
                <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: '#f0d4dc' }}>
                  <Icon3D name={item.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>{item.title}</div>
                  {item.subtitle && (
                    <div className="text-[11px] truncate" style={{ color: '#9a96a8' }}>{item.subtitle}</div>
                  )}
                </div>
                <span style={{ color: '#9a96a8' }}>›</span>
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div className="p-2" style={{ borderTop: '1px solid #e8e4dc' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-[#f0d4dc]/40 text-left"
            >
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: '#f0d4dc' }}>
                <Icon3D name="arrow" size={18} />
              </div>
              <div className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Выйти из аккаунта</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
