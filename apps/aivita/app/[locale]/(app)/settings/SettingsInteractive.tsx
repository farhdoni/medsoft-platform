'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Bell, ChevronRight, Navigation, Fingerprint, Clock } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { ALL_NAV_OPTIONS, loadNavConfig, saveNavConfig } from '@/components/cabinet/dashboard/FloatingNav';

// Popular IANA timezones shown first; any IANA zone is accepted by the API.
const POPULAR_TIMEZONES = [
  { value: 'Asia/Tashkent',    label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Samarkand',   label: 'Самарканд (UTC+5)' },
  { value: 'Europe/Moscow',    label: 'Москва (UTC+3)' },
  { value: 'Asia/Almaty',      label: 'Алматы (UTC+5)' },
  { value: 'Asia/Bishkek',     label: 'Бишкек (UTC+6)' },
  { value: 'Asia/Dushanbe',    label: 'Душанбе (UTC+5)' },
  { value: 'Asia/Ashgabat',    label: 'Ашхабад (UTC+5)' },
  { value: 'Asia/Baku',        label: 'Баку (UTC+4)' },
  { value: 'Asia/Tbilisi',     label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Yerevan',     label: 'Ереван (UTC+4)' },
  { value: 'Europe/Istanbul',  label: 'Стамбул (UTC+3)' },
  { value: 'Europe/London',    label: 'Лондон (UTC+0/+1)' },
  { value: 'Europe/Berlin',    label: 'Берлин (UTC+1/+2)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)' },
  { value: 'Asia/Dubai',       label: 'Дубай (UTC+4)' },
  { value: 'Asia/Shanghai',    label: 'Шанхай (UTC+8)' },
];

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
  currentTimezone: string;
}

type RNWebView = { postMessage: (s: string) => void };
function getRNWebView(): RNWebView | undefined {
  return typeof window !== 'undefined'
    ? (window as unknown as { ReactNativeWebView?: RNWebView }).ReactNativeWebView
    : undefined;
}

export function SettingsInteractive({ locale, localeLabel, notificationsOn: initialNotif, currentTimezone }: Props) {
  const t = useTranslations('app.settings');
  const [showLang, setShowLang] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [notifOn, setNotifOn] = useState(initialNotif);
  const [isInNative, setIsInNative] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [timezone, setTimezone] = useState(currentTimezone);

  useEffect(() => {
    const rnwv = getRNWebView();
    if (!rnwv) return;
    setIsInNative(true);
    // Read initial state injected by native side
    const w = window as unknown as { __AIVITA_BIOMETRIC_ENABLED__?: boolean };
    setBiometricOn(w.__AIVITA_BIOMETRIC_ENABLED__ ?? false);
    // Listen for async updates from native after enable/disable attempt
    function onStatus(e: Event) {
      const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
      setBiometricOn(detail.enabled);
    }
    window.addEventListener('aivita-biometric-status', onStatus);
    return () => window.removeEventListener('aivita-biometric-status', onStatus);
  }, []);

  function toggleBiometric() {
    const rnwv = getRNWebView();
    if (!rnwv) return;
    rnwv.postMessage(JSON.stringify({ type: biometricOn ? 'disable-biometric' : 'enable-biometric' }));
  }

  function toggleNotifications() {
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem('aivita_notif', next ? '1' : '0');
    if (next && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  async function saveTimezone(tz: string) {
    setTimezone(tz);
    await fetch('/api/proxy/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    }).catch(() => {});
  }

  // No auto-detect here: useEffect that silently overwrites would reset any manual
  // selection every time the user opens settings. Auto-detect runs once at
  // registration (the signup form sends Intl.DateTimeFormat().resolvedOptions().timeZone).
  // Existing users can change timezone manually via the select below.

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

        {/* Timezone row */}
        <div className={`${rowBase} border-b border-border-soft`}>
          <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: '#fde8d8' }}>
            <Clock className="w-4 h-4" style={{ color: '#b07040' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">Часовой пояс</p>
            <p className="text-[11px] text-text-muted mt-0.5">Для точных напоминаний о лекарствах</p>
          </div>
          <select
            value={timezone}
            onChange={e => saveTimezone(e.target.value)}
            className="text-[12px] text-text-muted bg-transparent border-none outline-none cursor-pointer max-w-[140px] truncate"
          >
            {POPULAR_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
            {/* Show current value even if it's not in the popular list */}
            {!POPULAR_TIMEZONES.some(tz => tz.value === timezone) && (
              <option value={timezone}>{timezone}</option>
            )}
          </select>
        </div>

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

        {/* Biometric row — only visible inside the native mobile app */}
        {isInNative && (
          <button className={`${rowBase} w-full text-left border-b border-border-soft`} onClick={toggleBiometric}>
            <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center" style={{ background: '#e0d8f0' }}>
              <Fingerprint className="w-4 h-4" style={{ color: '#6a5a8e' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text-primary">Вход по отпечатку</p>
              <p className="text-[11px] text-text-muted mt-0.5">Разблокировать приложение без пароля</p>
            </div>
            <div
              className="w-11 h-6 rounded-full flex items-center px-1 transition-all flex-shrink-0"
              style={{ background: biometricOn ? '#6a5a8e' : '#d0ccc4' }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white transition-all"
                style={{ transform: biometricOn ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </div>
          </button>
        )}

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
