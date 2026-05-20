'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Bell, ChevronRight, Navigation } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { ALL_NAV_OPTIONS, loadNavConfig, saveNavConfig } from '@/components/cabinet/dashboard/FloatingNav';

const LOCALES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

// ─── Language Modal ───────────────────────────────────────────────────────────

function LanguageModal({ current, onClose }: { current: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations('app.settings');

  function switchLocale(code: string) {
    const path = window.location.pathname;
    const newPath = path.replace(/^\/(ru|uz|en)(\/|$)/, `/${code}$2`);
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;
    onClose();
    router.push(newPath || `/${code}/settings`);
    router.refresh();
  }

  return (
    <Modal isOpen onClose={onClose} title={t('languageModalTitle')}>
      <div className="space-y-2">
        {LOCALES.map((loc) => (
          <button
            key={loc.code}
            onClick={() => switchLocale(loc.code)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
            style={{
              background: current === loc.code ? 'var(--accent-bg-light)' : '#f4f3ef',
              border: current === loc.code ? '2px solid var(--accent-dark)' : '2px solid transparent',
            }}
          >
            <span className="text-2xl">{loc.flag}</span>
            <span className="text-sm font-semibold flex-1 text-app-t1">{loc.label}</span>
            {current === loc.code && (
              <span className="text-xs font-bold text-[color:var(--accent-dark)]">✓</span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Nav Settings Modal ───────────────────────────────────────────────────────

function NavSettingsModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('app.settings');
  const tNav = useTranslations('app.nav');
  const [cfg, setCfg] = useState({ left: ['home', 'vitals'], right: ['medications', 'family'] });

  useEffect(() => { setCfg(loadNavConfig()); }, []);

  function setSlot(side: 'left' | 'right', idx: number, id: string) {
    setCfg(prev => {
      const next = { ...prev, [side]: [...prev[side]] };
      next[side][idx] = id;
      return next;
    });
  }

  function handleSave() {
    saveNavConfig(cfg);
    onClose();
  }

  const used = [...cfg.left, ...cfg.right];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('navigationModalTitle')}
      footer={
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-dark))' }}
        >
          {t('save')}
        </button>
      }
    >
      <p className="text-xs text-app-t3 mb-4">
        {t('navigationModalHint')}
      </p>

      {/* Visual nav preview */}
      <div className="flex items-end justify-center gap-2 mb-5 p-3 rounded-xl" style={{ background: '#f4f3ef' }}>
        {cfg.left.map(id => {
          return (
            <div key={id} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl" style={{ background: 'var(--accent-light)' }}>
              <span className="text-base">{id === 'home' ? '🏠' : id === 'vitals' ? '❤️' : id === 'medications' ? '💊' : id === 'gadgets' ? '⌚' : '👨‍👩‍👧'}</span>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--accent-dark)' }}>{tNav(id as Parameters<typeof tNav>[0])}</span>
            </div>
          );
        })}
        <div className="flex flex-col items-center -mt-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl" style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>✨</div>
          <span className="text-[9px] font-semibold mt-0.5" style={{ color: '#9a96a8' }}>{t('aiCenter')}</span>
        </div>
        {cfg.right.map(id => {
          return (
            <div key={id} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl" style={{ background: '#e8e4dc' }}>
              <span className="text-base">{id === 'home' ? '🏠' : id === 'vitals' ? '❤️' : id === 'medications' ? '💊' : id === 'gadgets' ? '⌚' : '👨‍👩‍👧'}</span>
              <span className="text-[9px] font-semibold" style={{ color: '#6a6580' }}>{tNav(id as Parameters<typeof tNav>[0])}</span>
            </div>
          );
        })}
      </div>

      {/* Left slots */}
      <p className="text-xs font-bold mb-2" style={{ color: '#2a2540' }}>{t('navLeftSide')}</p>
      <div className="flex gap-2 mb-4">
        {[0, 1].map(idx => (
          <select
            key={idx}
            value={cfg.left[idx] ?? ''}
            onChange={e => setSlot('left', idx, e.target.value)}
            className="flex-1 rounded-xl border px-2 py-2 text-sm outline-none"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
          >
            {ALL_NAV_OPTIONS.map(o => (
              <option key={o.id} value={o.id} disabled={used.includes(o.id) && cfg.left[idx] !== o.id}>
                {tNav(o.id as Parameters<typeof tNav>[0])}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Right slots */}
      <p className="text-xs font-bold mb-2" style={{ color: '#2a2540' }}>{t('navRightSide')}</p>
      <div className="flex gap-2">
        {[0, 1].map(idx => (
          <select
            key={idx}
            value={cfg.right[idx] ?? ''}
            onChange={e => setSlot('right', idx, e.target.value)}
            className="flex-1 rounded-xl border px-2 py-2 text-sm outline-none"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
          >
            {ALL_NAV_OPTIONS.map(o => (
              <option key={o.id} value={o.id} disabled={used.includes(o.id) && cfg.right[idx] !== o.id}>
                {tNav(o.id as Parameters<typeof tNav>[0])}
              </option>
            ))}
          </select>
        ))}
      </div>
    </Modal>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  locale: string;
  localeLabel: string;
  notificationsOn: boolean;
}

export function SettingsInteractive({ locale, localeLabel, notificationsOn: initialNotif }: Props) {
  const t = useTranslations('app.settings');
  const [showLang, setShowLang] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [notifOn, setNotifOn] = useState(initialNotif);

  function toggleNotifications() {
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem('aivita_notif', next ? '1' : '0');
    if (next && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  const rowBase = 'flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-app cursor-pointer';

  return (
    <>
      {showLang && <LanguageModal current={locale} onClose={() => setShowLang(false)} />}
      {showNav && <NavSettingsModal onClose={() => setShowNav(false)} />}

      <div className="rounded-card bg-white border border-border-soft overflow-hidden">
        {/* Language row */}
        <button className={`${rowBase} w-full text-left border-b border-border-soft`} onClick={() => setShowLang(true)}>
          <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: '#d4dff0' }}>
            <Globe className="w-4 h-4" style={{ color: '#5e75a8' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">{t('language')}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{localeLabel}</p>
          </div>
          <span className="text-[12px] text-text-muted mr-1">{localeLabel}</span>
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        </button>

        {/* Notifications row */}
        <button className={`${rowBase} w-full text-left border-b border-border-soft`} onClick={toggleNotifications}>
          <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-bg-light)' }}>
            <Bell className="w-4 h-4" style={{ color: 'var(--accent-dark)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">{t('notifications')}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{t('notificationsSub')}</p>
          </div>
          {/* Toggle switch */}
          <div
            className="w-11 h-6 rounded-full flex items-center px-1 transition-all flex-shrink-0"
            style={{ background: notifOn ? 'var(--accent-dark)' : '#d0ccc4' }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white transition-all"
              style={{ transform: notifOn ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </button>

        {/* Navigation row */}
        <button className={`${rowBase} w-full text-left`} onClick={() => setShowNav(true)}>
          <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: '#d4e8d8' }}>
            <Navigation className="w-4 h-4" style={{ color: '#548068' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">{t('navigation')}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{t('navigationSub')}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        </button>
      </div>
    </>
  );
}
