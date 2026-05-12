'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Bell, ChevronRight, X } from 'lucide-react';

const LOCALES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

// ─── Language Modal ───────────────────────────────────────────────────────────

function LanguageModal({ current, onClose }: { current: string; onClose: () => void }) {
  const router = useRouter();

  function switchLocale(code: string) {
    // Replace locale segment in current URL
    const path = window.location.pathname;
    const newPath = path.replace(/^\/(ru|uz|en)(\/|$)/, `/${code}$2`);
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;
    onClose();
    router.push(newPath || `/${code}/settings`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold" style={{ color: '#2a2540' }}>Язык интерфейса</h2>
          <button onClick={onClose} aria-label="Закрыть">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="space-y-2">
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => switchLocale(loc.code)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[12px] text-left transition-all"
              style={{
                background: current === loc.code ? 'var(--accent-bg-light)' : '#f4f3ef',
                border: current === loc.code ? '2px solid var(--accent-dark)' : '2px solid transparent',
              }}
            >
              <span className="text-[24px]">{loc.flag}</span>
              <span className="text-[15px] font-semibold flex-1" style={{ color: '#2a2540' }}>{loc.label}</span>
              {current === loc.code && (
                <span className="text-[12px] font-bold" style={{ color: 'var(--accent-dark)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  locale: string;
  localeLabel: string;
  notificationsOn: boolean;
}

export function SettingsInteractive({ locale, localeLabel, notificationsOn: initialNotif }: Props) {
  const [showLang, setShowLang] = useState(false);
  const [notifOn, setNotifOn] = useState(initialNotif);

  function toggleNotifications() {
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem('aivita_notif', next ? '1' : '0');
    // Request push notification permission if turning on
    if (next && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  const rowBase = 'flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-app cursor-pointer';

  return (
    <>
      {showLang && <LanguageModal current={locale} onClose={() => setShowLang(false)} />}

      <div className="rounded-card bg-white border border-border-soft overflow-hidden">
        {/* Language row */}
        <button className={`${rowBase} w-full text-left border-b border-border-soft`} onClick={() => setShowLang(true)}>
          <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: '#d4dff0' }}>
            <Globe className="w-4 h-4" style={{ color: '#5e75a8' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">Язык</p>
            <p className="text-[11px] text-text-muted mt-0.5">{localeLabel}</p>
          </div>
          <span className="text-[12px] text-text-muted mr-1">{localeLabel}</span>
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        </button>

        {/* Notifications row */}
        <button className={`${rowBase} w-full text-left`} onClick={toggleNotifications}>
          <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-bg-light)' }}>
            <Bell className="w-4 h-4" style={{ color: 'var(--accent-dark)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">Уведомления</p>
            <p className="text-[11px] text-text-muted mt-0.5">Привычки, напоминания</p>
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
      </div>
    </>
  );
}
