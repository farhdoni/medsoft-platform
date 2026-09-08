'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Value stored is a "suppressed until" timestamp (ms epoch), not a dismissal
// time — dismiss() writes now+7d, the appinstalled listener writes now+365d,
// and the check is a single `Date.now() < stored`. (Older builds stored a
// past "dismissed at" timestamp under this same key; that reads here as
// already-expired, which just means the prompt can show once more right
// after this ships — harmless, and safely fails open rather than closed.)
const SUPPRESS_KEY = 'aivita_pwa_dismissed';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // × close
const INSTALLED_MS = 365 * 24 * 60 * 60 * 1000; // real install

/** Never throws — Safari private mode and storage-disabled browsers hit this. */
function readSuppressUntil(): number {
  try {
    const raw = localStorage.getItem(SUPPRESS_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/** Never throws — a failed write just means the prompt may resurface sooner
 * than intended, which is harmless; it must never crash the app. */
function writeSuppressFor(ms: number): void {
  try {
    localStorage.setItem(SUPPRESS_KEY, String(Date.now() + ms));
  } catch {
    // storage unavailable — non-fatal
  }
}

function isSuppressed(): boolean {
  return Date.now() < readSuppressUntil();
}

/**
 * Already installed, or hosted inside the AIVITA native app's own WebView —
 * the prompt is either redundant (they already have it) or meaningless
 * (there is nothing to "install" from inside the app itself) either way.
 *
 * `display-mode: standalone` covers Android/desktop Chrome once installed;
 * `navigator.standalone` is iOS Safari's own equivalent flag (no
 * `display-mode` support historically). `ReactNativeWebView` / `__AIVITA_PLATFORM__`
 * are the app's own established WebView-detection globals — same ones
 * AiChatClient.tsx, GadgetsClient.tsx and MedicationsClient.tsx already check.
 */
function isNativeContext(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
  const win = window as Window & { ReactNativeWebView?: unknown; __AIVITA_PLATFORM__?: string };
  if (win.ReactNativeWebView) return true;
  if (win.__AIVITA_PLATFORM__) return true;
  return false;
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNativeContext()) return;

    const handler = (e: Event) => {
      // beforeinstallprompt can fire again later in the same page session
      // (Chrome re-fires it after some state changes) — re-check the
      // suppression record here, not only once at mount, so a banner the
      // user just closed cannot pop back up before its cooldown ends.
      if (isNativeContext() || isSuppressed()) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    // Authoritative "actually installed" signal — more reliable than the
    // browser's own userChoice === 'accepted', which only means the user
    // clicked through the browser's confirmation, not that install finished.
    const onInstalled = () => {
      writeSuppressFor(INSTALLED_MS);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    writeSuppressFor(DISMISS_MS);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') {
      writeSuppressFor(DISMISS_MS);
    }
    // 'accepted' is handled by the appinstalled listener above once the
    // browser actually finishes installing.
    setDeferredPrompt(null);
    setVisible(false);
  }

  const isChatRoute = pathname ? (pathname.includes('/ai-chat') || pathname.includes('/messenger')) : false;

  if (!visible || isChatRoute) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 448,
        zIndex: 40,
        background: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        borderTop: '1px solid #e8e4dc',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* App icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #9c5e6c, #6a5a8e)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        A
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2d2230', lineHeight: 1.3 }}>
          Установите AIVITA
        </div>
        <div style={{ fontSize: 11, color: '#9a8fa0', marginTop: 2 }}>
          Быстрый доступ с рабочего стола
        </div>
      </div>

      {/* Install button */}
      <button
        onClick={install}
        style={{
          background: '#9c5e6c',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '7px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Установить
      </button>

      {/* Close */}
      <button
        onClick={dismiss}
        aria-label="Закрыть"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9a8fa0',
          fontSize: 20,
          lineHeight: 1,
          padding: '2px 4px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default InstallPrompt;
