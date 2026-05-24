'use client';
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Icon3D, type Icon3DName } from './icons/Icon3D';
import type { AivitaSession } from '@/lib/auth/session';

interface MenuItem {
  icon: Icon3DName;
  softBg: string;
  titleKey: string;
  subtitleKey?: string;
  href: string;
}

const PATIENT_MENU_ITEMS: MenuItem[] = [
  { icon: 'family',   softBg: 'var(--accent-light)',    titleKey: 'myProfile',    subtitleKey: 'myProfileSub',    href: '/profile' },
  { icon: 'doctor',   softBg: '#d4dff0',                titleKey: 'findDoctor',   subtitleKey: 'findDoctorSub',   href: '/doctors' },
  { icon: 'kit',      softBg: 'var(--accent-bg-light)', titleKey: 'medCard',      subtitleKey: 'medCardSub',      href: '/medical-card' },
  { icon: 'heart',    softBg: 'var(--accent-light)',    titleKey: 'vitals',       subtitleKey: 'vitalsSub',       href: '/vitals' },
  { icon: 'chat',     softBg: '#d4e8d8',                titleKey: 'aiChat',       subtitleKey: 'aiChatSub',       href: '/chat' },
  { icon: 'family',   softBg: '#d4dff0',                titleKey: 'family',       subtitleKey: 'familySub',       href: '/family' },
  { icon: 'sparkle',  softBg: '#f0e8f4',                titleKey: 'referral',     subtitleKey: 'referralSub',     href: '/settings/referral' },
  { icon: 'settings', softBg: 'var(--accent-bg-light)', titleKey: 'settings',     subtitleKey: 'settingsSub',     href: '/settings' },
];

const DOCTOR_MENU_ITEMS: MenuItem[] = [
  { icon: 'doctor',   softBg: 'var(--accent-light)',    titleKey: 'doctorProfile',  subtitleKey: 'doctorProfileSub', href: '/doctor-profile' },
  { icon: 'family',   softBg: '#d4e8d8',                titleKey: 'patients',       subtitleKey: 'patientsSub',      href: '/doctor-patients' },
  { icon: 'calendar', softBg: 'var(--accent-bg-light)', titleKey: 'schedule',       subtitleKey: 'scheduleSub',      href: '/doctor-schedule' },
  { icon: 'kit',      softBg: '#d4dff0',                titleKey: 'appointments',   subtitleKey: 'appointmentsSub',  href: '/doctor-appointments' },
  { icon: 'sparkle',  softBg: '#d4e8d8',                titleKey: 'aiAssistant',    subtitleKey: 'aiAssistantSub',   href: '/doctor-ai' },
  { icon: 'chat',     softBg: '#d4dff0',                titleKey: 'chats',          subtitleKey: 'chatsSub',         href: '/doctor-chats' },
  { icon: 'settings', softBg: 'var(--accent-bg-light)', titleKey: 'settings',       subtitleKey: 'settingsSub',      href: '/settings' },
];

interface ProfileMenuProps {
  session?: AivitaSession | null;
  locale?: string;
  role?: 'patient' | 'doctor';
}

export function ProfileMenu({ session, locale = 'ru', role }: ProfileMenuProps) {
  const t = useTranslations('app.profileMenu');
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

  const name = session?.name?.trim() || t('defaultUser');
  const email = session?.email ?? '';
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  const effectiveRole = role ?? (session?.role as 'patient' | 'doctor' | undefined);
  const items = effectiveRole === 'doctor' ? DOCTOR_MENU_ITEMS : PATIENT_MENU_ITEMS;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network errors — cookie may already be invalid
    }
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
        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity sm:w-10 sm:h-10 select-none"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)' }}
        aria-label={t('ariaLabel')}
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
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate" style={{ color: '#2a2540' }}>{name}</p>
              <p className="text-[11px] truncate" style={{ color: '#9a96a8' }}>{email}</p>
              {effectiveRole !== 'doctor' && (
                <div className="mt-0.5">
                  {!session?.plan || session.plan === 'free' ? (
                    <Link
                      href={`/${locale}/settings/subscription`}
                      onClick={() => setOpen(false)}
                      className="text-[10px] font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: '#9c5e6c' }}
                    >
                      Обновить до Premium →
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold" style={{ color: '#548068' }}>
                        {session.plan === 'pro' ? 'Pro ✓' : 'Premium ✓'}
                      </span>
                      <Link
                        href={`/${locale}/settings/subscription`}
                        onClick={() => setOpen(false)}
                        className="text-[10px] font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: '#9c5e6c' }}
                      >
                        · Изменить →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Role switcher */}
          {effectiveRole === 'doctor' && (
            <div className="px-2 pt-2 pb-0">
              <Link
                href={`/${locale}/home`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors mb-1"
                style={{ background: '#f0faf4', color: '#3a7a5a', border: '1px solid #b8e8c8' }}
              >
                <span>🏠</span>
                <span>{t('patientCabinet')}</span>
                <span className="ml-auto" style={{ color: '#9a96a8', fontSize: 14 }}>›</span>
              </Link>
            </div>
          )}
          {session?.role === 'doctor' && effectiveRole !== 'doctor' && (
            <div className="px-2 pt-2 pb-0">
              <Link
                href={`/${locale}/doctor-home`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors mb-1"
                style={{ background: '#f0edf8', color: '#5e40a0', border: '1px solid #d8cff0' }}
              >
                <span>🩺</span>
                <span>{t('doctorCabinet')}</span>
                <span className="ml-auto" style={{ color: '#9a96a8', fontSize: 14 }}>›</span>
              </Link>
            </div>
          )}

          {/* Menu items */}
          <div className="p-2">
            {items.map((item, i) => (
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
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#2a2540' }}>
                    {t(item.titleKey as Parameters<typeof t>[0])}
                  </p>
                  {item.subtitleKey && (
                    <p className="text-[11px] truncate" style={{ color: '#9a96a8' }}>
                      {t(item.subtitleKey as Parameters<typeof t>[0])}
                    </p>
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
              <span className="text-sm font-medium">{t('logout')}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
