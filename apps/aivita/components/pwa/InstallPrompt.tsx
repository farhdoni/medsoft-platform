'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'aivita_pwa_dismissed';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed (standalone mode) — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Dismissed recently — don't show
    const ts = localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - parseInt(ts) < DISMISS_MS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

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
